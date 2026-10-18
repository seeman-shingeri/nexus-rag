import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.zone import Zone
from app.models.camera import CameraSource
from app.models.event import DetectionEvent, DetectionCategory
from app.models.digital_twin import DigitalTwinObject
from app.services.twin_service import TwinService
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_digital_twin_evaluation_optimal(db_session: AsyncSession):
    # Setup test zones
    zone1 = Zone(
        name="Zone A - Assembly North",
        description="Standard assembly area",
        risk_level="MEDIUM",
        is_restricted=False,
        max_occupancy=10,
        expected_conditions="Standard equipment operation."
    )
    db_session.add(zone1)
    await db_session.commit()
    await db_session.refresh(zone1)

    overview = await TwinService.evaluate_facility(db_session)
    assert overview.total_zones >= 1
    matched = next((z for z in overview.zones if z.id == zone1.id), None)
    assert matched is not None
    assert matched.status == "OPTIMAL"
    assert len(matched.active_discrepancies) == 0

@pytest.mark.asyncio
async def test_digital_twin_discrepancy_unauthorized_entry(db_session: AsyncSession):
    # Setup restricted zone
    sec_zone = Zone(
        name="Zone B - High Security Vault",
        description="Restricted vault",
        risk_level="CRITICAL",
        is_restricted=True,
        max_occupancy=2,
        expected_conditions="Strict badge clearance required."
    )
    db_session.add(sec_zone)
    await db_session.commit()
    await db_session.refresh(sec_zone)

    # Add camera in this zone
    cam = CameraSource(
        name="CAM-SEC-01",
        stream_url="0",
        location="Zone B Portal",
        is_active=True,
        is_demo=False,
        zone_id=sec_zone.id
    )
    db_session.add(cam)
    await db_session.commit()
    await db_session.refresh(cam)

    # Add an unauthorized person detection event
    event = DetectionEvent(
        camera_id=cam.id,
        zone_id=sec_zone.id,
        category=DetectionCategory.PERSON,
        confidence=0.88,
        bounding_box_json="[0.2, 0.3, 0.4, 0.5]",
        evidence_path="/evidence/sec_intrusion.jpg",
        timestamp=datetime.now(timezone.utc),
        is_demo=False
    )
    db_session.add(event)
    await db_session.commit()

    overview = await TwinService.evaluate_facility(db_session)
    matched = next((z for z in overview.zones if z.id == sec_zone.id), None)
    assert matched is not None
    assert matched.status == "ANOMALY_DETECTED"
    assert len(matched.active_discrepancies) > 0
    assert any(d.discrepancy_type == "UNAUTHORIZED_INTRUSION" for d in matched.active_discrepancies)
    assert overview.facility_status == "CRITICAL_ALERT"

@pytest.mark.asyncio
async def test_digital_twin_api_endpoints(client: AsyncClient, db_session: AsyncSession):
    admin_user = User(
        username="twin_admin",
        email="twin_admin@nexus.internal",
        hashed_password="hash",
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(admin_user)
    await db_session.commit()
    token = create_access_token(subject=admin_user.username, role=admin_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET /api/v1/digital-twin/state
    res = await client.get("/api/v1/digital-twin/state", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "zones" in data
    assert "facility_status" in data
    assert "total_zones" in data

    # 2. POST /api/v1/digital-twin/evaluate
    eval_res = await client.post("/api/v1/digital-twin/evaluate", headers=headers)
    assert eval_res.status_code == 200
    assert eval_res.json()["total_zones"] == data["total_zones"]
