from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.zone import Zone
from app.schemas.digital_twin import DigitalTwinOverviewResponse, ZoneSummaryResponse
from app.services.twin_service import TwinService
from app.api.deps import get_current_user

router = APIRouter(prefix="/digital-twin", tags=["Digital Twin & Spatial Anomaly Detection"])

@router.get("/state", response_model=DigitalTwinOverviewResponse)
async def get_digital_twin_state(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await TwinService.evaluate_facility(db)

@router.get("/zones/{zone_id}", response_model=ZoneSummaryResponse)
async def get_zone_state(
    zone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    overview = await TwinService.evaluate_facility(db)
    zone_match = next((z for z in overview.zones if z.id == zone_id), None)
    if not zone_match:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone_match

@router.post("/evaluate", response_model=DigitalTwinOverviewResponse)
async def evaluate_discrepancies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await TwinService.evaluate_facility(db)
