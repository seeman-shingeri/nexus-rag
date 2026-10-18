from datetime import datetime, timezone, timedelta
import pytest
from app.models.event import DetectionCategory
from app.models.rule import RuleSeverity
from app.models.incident import IncidentStatus
from app.services.event_service import EventService

@pytest.mark.asyncio
async def test_record_and_query_temporal_events(db_session):
    now = datetime.now(timezone.utc)
    t_minus_1h = now - timedelta(hours=1)
    t_minus_3h = now - timedelta(hours=3)

    # 1. Record event 1 hour ago
    ev1 = await EventService.record_detection_event(
        db=db_session,
        camera_id=1,
        category=DetectionCategory.LIQUID_SPILL,
        confidence=0.88,
        bounding_box=[0.2, 0.5, 0.3, 0.2],
        zone_id=1,
        requires_review=True
    )
    assert ev1.id is not None

    # 2. Record event 30 mins ago
    ev2 = await EventService.record_detection_event(
        db=db_session,
        camera_id=2,
        category=DetectionCategory.PERSON,
        confidence=0.95,
        bounding_box=[0.3, 0.2, 0.15, 0.6],
        zone_id=2,
        requires_review=True
    )
    assert ev2.id is not None

    # 3. Query events over the last 2 hours
    res = await EventService.query_temporal_events(
        db=db_session,
        start_time=t_minus_1h - timedelta(minutes=10),
        end_time=now + timedelta(minutes=5)
    )
    assert res["total_events"] >= 2
    assert "liquid_spill" in res["category_distribution"]
    assert "person" in res["category_distribution"]

@pytest.mark.asyncio
async def test_incident_lifecycle_workflow(db_session):
    # 1. Create initial event
    ev = await EventService.record_detection_event(
        db=db_session,
        camera_id=1,
        category=DetectionCategory.LIQUID_SPILL,
        confidence=0.82,
        bounding_box=[0.1, 0.5, 0.2, 0.2],
        zone_id=1,
        requires_review=True
    )

    # 2. Create Incident
    incident = await EventService.create_incident(
        db=db_session,
        title="Liquid Spill Detected in Zone A",
        rule_id=1,
        event_id=ev.id,
        camera_id=1,
        zone_id=1,
        severity=RuleSeverity.HIGH,
        observation_summary="Coolant liquid pooling near CNC Mill #4.",
        confidence=0.82,
        retrieved_procedure="Deploy containment booms per SOP-ENV-204.",
        citation_source="SOP-ENV-204"
    )
    assert incident.id is not None
    assert incident.status == IncidentStatus.OPEN

    # 3. Acknowledge incident
    ack_incident = await EventService.update_incident_status(
        db=db_session,
        incident_id=incident.id,
        new_status=IncidentStatus.ACKNOWLEDGED,
        user_id="officer_test",
        assigned_to="operator_test"
    )
    assert ack_incident.status == IncidentStatus.ACKNOWLEDGED
    assert ack_incident.acknowledged_by == "officer_test"
    assert ack_incident.assigned_to == "operator_test"

    # 4. Resolve incident with notes
    res_incident = await EventService.update_incident_status(
        db=db_session,
        incident_id=incident.id,
        new_status=IncidentStatus.RESOLVED,
        user_id="officer_test",
        notes="Containment booms deployed. Mill hydraulic fitting tightened."
    )
    assert res_incident.status == IncidentStatus.RESOLVED
    assert res_incident.resolved_by == "officer_test"
    assert "Containment booms deployed" in res_incident.resolution_notes

    # 5. Reopen incident if condition persists
    reopen_incident = await EventService.update_incident_status(
        db=db_session,
        incident_id=incident.id,
        new_status=IncidentStatus.REOPENED,
        user_id="admin_test",
        notes="Secondary leak observed."
    )
    assert reopen_incident.status == IncidentStatus.REOPENED

@pytest.mark.asyncio
async def test_incidents_and_events_api(client, admin_token):
    # 1. Test incidents list API
    res = await client.get(
        "/api/v1/incidents",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    # 2. Test temporal events API
    temp_res = await client.get(
        "/api/v1/events/temporal",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert temp_res.status_code == 200
    temp_data = temp_res.json()
    assert "total_events" in temp_data
    assert "category_distribution" in temp_data
    assert "events" in temp_data
