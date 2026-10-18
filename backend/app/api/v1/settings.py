from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.schemas.settings import (
    SystemSettingsResponse,
    SystemSettingsUpdate,
    AuditLogResponse,
    UserSummaryResponse
)
from app.services.governance_service import GovernanceService
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="", tags=["System Settings & Security Governance"])

@router.get("/system/settings", response_model=SystemSettingsResponse)
async def get_system_settings(
    current_user: User = Depends(get_current_user)
):
    return GovernanceService.get_settings()

@router.put("/system/settings", response_model=SystemSettingsResponse)
async def update_system_settings(
    update_data: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    return await GovernanceService.update_settings(
        db=db,
        update=update_data,
        user_id=current_user.username
    )

@router.post("/system/purge-retention", status_code=status.HTTP_200_OK)
async def purge_retention(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER]))
):
    purged_count = await GovernanceService.execute_retention_purge(
        db=db,
        user_id=current_user.username
    )
    return {
        "status": "success",
        "purged_records": purged_count,
        "retention_days": GovernanceService.get_settings().retention_days,
        "message": f"Successfully executed retention policy. Purged {purged_count} records."
    }

@router.get("/audit/logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER]))
):
    query = select(AuditLog)
    conditions = []
    if action:
        conditions.append(AuditLog.action == action)
    if user_id:
        conditions.append(AuditLog.user_id == user_id)

    if conditions:
        query = query.where(and_(*conditions))
    query = query.order_by(desc(AuditLog.timestamp)).limit(limit)

    res = await db.execute(query)
    return res.scalars().all()

@router.get("/users", response_model=List[UserSummaryResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = select(User).order_by(User.id)
    res = await db.execute(query)
    return res.scalars().all()
