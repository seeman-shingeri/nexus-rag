import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.event import DetectionEvent, DetectionCategory
from app.models.audit import AuditLog
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_system_settings_read_and_update(client: AsyncClient, db_session: AsyncSession):
    # Setup Admin
    admin_user = User(
        username="settings_admin",
        email="settings_admin@nexus.ai",
        hashed_password="hash",
        role=UserRole.ADMIN,
        is_active=True
    )
    # Setup Operator
    op_user = User(
        username="settings_op",
        email="settings_op@nexus.ai",
        hashed_password="hash",
        role=UserRole.OPERATOR,
        is_active=True
    )
    db_session.add_all([admin_user, op_user])
    await db_session.commit()

    admin_token = create_access_token(subject=admin_user.username, role=admin_user.role.value)
    op_token = create_access_token(subject=op_user.username, role=op_user.role.value)

    # 1. Read settings as operator
    get_res = await client.get("/api/v1/system/settings", headers={"Authorization": f"Bearer {op_token}"})
    assert get_res.status_code == 200
    settings_data = get_res.json()
    assert "llm_provider" in settings_data
    assert "privacy_mode" in settings_data

    # 2. Operator attempt to update settings -> 403 Forbidden
    put_op_res = await client.put(
        "/api/v1/system/settings",
        json={"retention_days": 60},
        headers={"Authorization": f"Bearer {op_token}"}
    )
    assert put_op_res.status_code == 403

    # 3. Admin updates settings
    put_admin_res = await client.put(
        "/api/v1/system/settings",
        json={"privacy_mode": "ANONYMIZED_BLUR", "retention_days": 45},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert put_admin_res.status_code == 200
    updated_data = put_admin_res.json()
    assert updated_data["privacy_mode"] == "ANONYMIZED_BLUR"
    assert updated_data["retention_days"] == 45

@pytest.mark.asyncio
async def test_retention_purge_and_audit(client: AsyncClient, db_session: AsyncSession):
    admin_user = User(
        username="purge_admin",
        email="purge_admin@nexus.ai",
        hashed_password="hash",
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(admin_user)
    await db_session.commit()

    admin_token = create_access_token(subject=admin_user.username, role=admin_user.role.value)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Add old event (90 days old)
    old_time = datetime.now(timezone.utc) - timedelta(days=90)
    old_event = DetectionEvent(
        camera_id=1,
        zone_id=1,
        category=DetectionCategory.PERSON,
        confidence=0.9,
        bounding_box_json="[0, 0, 1, 1]",
        timestamp=old_time,
        is_demo=False
    )
    db_session.add(old_event)
    await db_session.commit()

    # Trigger retention purge
    purge_res = await client.post("/api/v1/system/purge-retention", headers=headers)
    assert purge_res.status_code == 200
    purge_data = purge_res.json()
    assert purge_data["status"] == "success"
    assert purge_data["purged_records"] >= 1

    # Check audit log
    audit_res = await client.get("/api/v1/audit/logs?action=EXECUTE_RETENTION_PURGE", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 1
    assert logs[0]["user_id"] == admin_user.username
