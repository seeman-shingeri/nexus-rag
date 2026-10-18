from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.event import DetectionCategory
from app.models.user import User
from app.schemas.incident import TemporalQueryResponse
from app.services.event_service import EventService
from app.api.deps import get_current_user

router = APIRouter(prefix="/events", tags=["Temporal Memory & Events"])

@router.get("/temporal", response_model=TemporalQueryResponse)
async def get_temporal_events(
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    zone_id: Optional[int] = None,
    category: Optional[DetectionCategory] = None,
    camera_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    # Default to last 2 hours if not provided
    if not end_time:
        end_time = now
    if not start_time:
        start_time = end_time - timedelta(hours=2)

    if start_time > end_time:
        raise HTTPException(status_code=400, detail="start_time cannot be after end_time")

    result = await EventService.query_temporal_events(
        db=db,
        start_time=start_time,
        end_time=end_time,
        zone_id=zone_id,
        category=category,
        camera_id=camera_id,
        limit=limit
    )

    return TemporalQueryResponse(
        start_time=result["start_time"],
        end_time=result["end_time"],
        total_events=result["total_events"],
        category_distribution=result["category_distribution"],
        events=result["events"]
    )
