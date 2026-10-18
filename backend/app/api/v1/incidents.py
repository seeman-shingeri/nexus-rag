from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.incident import Incident, IncidentStatus
from app.models.rule import RuleSeverity
from app.schemas.incident import IncidentResponse, IncidentStatusUpdate
from app.services.event_service import EventService
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/incidents", tags=["Incident Center & Human Review"])

@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    status: Optional[IncidentStatus] = None,
    severity: Optional[RuleSeverity] = None,
    zone_id: Optional[int] = None,
    camera_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conditions = []
    if status:
        conditions.append(Incident.status == status)
    if severity:
        conditions.append(Incident.severity == severity)
    if zone_id:
        conditions.append(Incident.zone_id == zone_id)
    if camera_id:
        conditions.append(Incident.camera_id == camera_id)

    query = select(Incident)
    if conditions:
        query = query.where(and_(*conditions))
    query = query.order_by(desc(Incident.created_at)).limit(limit)

    res = await db.execute(query)
    return res.scalars().all()

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Incident).where(Incident.id == incident_id)
    res = await db.execute(query)
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.patch("/{incident_id}/status", response_model=IncidentResponse)
async def update_status(
    incident_id: int,
    update_data: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER, UserRole.OPERATOR]))
):
    try:
        incident = await EventService.update_incident_status(
            db=db,
            incident_id=incident_id,
            new_status=update_data.status,
            user_id=current_user.username,
            notes=update_data.notes,
            assigned_to=update_data.assigned_to
        )
        return incident
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
