import pytest
import time
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.rule import SafetyRule, RuleSeverity
from app.models.event import DetectionCategory, DetectionEvent
from app.models.zone import Zone
from app.models.camera import CameraSource
from app.models.incident import Incident, IncidentStatus
from app.services.safety_engine import SafetyEngine
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_persistence_tracking():
    SafetyEngine.reset_history()

    # Immediate observation with 2s requirement
    met, dur = SafetyEngine.track_observation(camera_id=1, zone_id=1, category="liquid_spill", persistence_seconds=2)
    assert met is False
    assert dur >= 0.0

    # Simulate observation history
    key = SafetyEngine._get_key(camera_id=1, zone_id=1, category="liquid_spill")
    # Backdate the first observation by 3 seconds
    SafetyEngine._history[key][0] -= 3.0

    met, dur = SafetyEngine.track_observation(camera_id=1, zone_id=1, category="liquid_spill", persistence_seconds=2)
    assert met is True
    assert dur >= 2.0

    # Reset
    SafetyEngine.reset_history(camera_id=1)
    assert key not in SafetyEngine._history

@pytest.mark.asyncio
async def test_deterministic_rule_evaluation_and_deduplication(db_session: AsyncSession):
    SafetyEngine.reset_history()


    # Create test rule
    rule = SafetyRule(
        name="TEST-RULE-01: Chemical Puddle Alert",
        description="Immediate response required for chemical puddles.",
        category=DetectionCategory.LIQUID_SPILL,
        severity=RuleSeverity.HIGH,
        confidence_threshold=0.60,
        persistence_seconds=1,
        cooldown_minutes=10,
        zone_id=1,
        is_active=True,
        requires_human_approval=True,
        standard_procedure="Deploy containment socks and alert Hazmat."
    )
    db_session.add(rule)
    await db_session.commit()
    await db_session.refresh(rule)

    # 1. First detection event
    event1 = DetectionEvent(
        camera_id=1,
        zone_id=1,
        category=DetectionCategory.LIQUID_SPILL,
        confidence=0.85,
        bounding_box_json="[0.1, 0.2, 0.3, 0.4]",
        evidence_path="/evidence/test_spill_01.jpg",
        is_demo=False
    )
    db_session.add(event1)
    await db_session.commit()
    await db_session.refresh(event1)

    # Evaluate detection (persistence_seconds=1 allows single observation to meet threshold)
    res1 = await SafetyEngine.evaluate_detection(db=db_session, event=event1)
    assert res1 is not None
    incident, is_new = res1
    assert is_new is True
    assert incident.rule_id == rule.id
    assert incident.status == IncidentStatus.OPEN
    assert incident.occurrence_count == 1
    assert "Chemical Puddle" in incident.title

    # 2. Second detection event (within cooldown period)
    event2 = DetectionEvent(
        camera_id=1,
        zone_id=1,
        category=DetectionCategory.LIQUID_SPILL,
        confidence=0.92,
        bounding_box_json="[0.12, 0.21, 0.32, 0.41]",
        evidence_path="/evidence/test_spill_02.jpg",
        is_demo=False
    )
    db_session.add(event2)
    await db_session.commit()
    await db_session.refresh(event2)

    res2 = await SafetyEngine.evaluate_detection(db=db_session, event=event2)
    assert res2 is not None
    incident2, is_new2 = res2
    assert is_new2 is False
    assert incident2.id == incident.id
    assert incident2.occurrence_count == 2
    assert incident2.confidence == 0.92

@pytest.mark.asyncio
async def test_safety_rules_api_and_simulation(client: AsyncClient, db_session: AsyncSession):
    # Setup test admin user

    admin_user = User(
        username="rule_admin",
        email="admin_rules@nexus.internal",
        hashed_password="hash",
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(admin_user)
    await db_session.commit()
    token = create_access_token(subject=admin_user.username, role=admin_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}


    # 1. Create a safety rule
    create_payload = {
        "name": "RULE-TEST-BLOCKED-EXIT: Obstruction Check",
        "description": "Exits must remain completely clear.",
        "category": "blocked_exit",
        "severity": "CRITICAL",
        "confidence_threshold": 0.70,
        "persistence_seconds": 3,
        "cooldown_minutes": 5,
        "zone_id": 4,
        "is_active": True,
        "requires_human_approval": True,
        "standard_procedure": "SOP-FIRE-008: Clear obstructions within 3 minutes."
    }
    create_res = await client.post("/api/v1/safety-rules", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    created_rule = create_res.json()
    assert created_rule["name"] == create_payload["name"]
    rule_id = created_rule["id"]

    # 2. List safety rules
    list_res = await client.get("/api/v1/safety-rules", headers=headers)
    assert list_res.status_code == 200
    rules = list_res.json()
    assert any(r["id"] == rule_id for r in rules)

    # 3. Simulate rule - Triggered case
    sim_triggered_payload = {
        "category": "blocked_exit",
        "confidence": 0.85,
        "duration_seconds": 4.5,
        "zone_id": 4
    }
    sim_res1 = await client.post("/api/v1/safety-rules/simulate", json=sim_triggered_payload, headers=headers)
    assert sim_res1.status_code == 200
    sim_data1 = sim_res1.json()
    assert sim_data1["confidence_met"] is True
    assert sim_data1["persistence_met"] is True
    assert sim_data1["alert_triggered"] is True
    assert "Clear obstructions" in sim_data1["linked_sop_excerpt"] or "FIRE" in sim_data1["linked_sop_excerpt"]

    # 4. Simulate rule - Suppressed by duration (pending persistence)
    sim_pending_payload = {
        "category": "blocked_exit",
        "confidence": 0.85,
        "duration_seconds": 1.0,
        "zone_id": 4
    }
    sim_res2 = await client.post("/api/v1/safety-rules/simulate", json=sim_pending_payload, headers=headers)
    assert sim_res2.status_code == 200
    sim_data2 = sim_res2.json()
    assert sim_data2["confidence_met"] is True
    assert sim_data2["persistence_met"] is False
    assert sim_data2["alert_triggered"] is False
