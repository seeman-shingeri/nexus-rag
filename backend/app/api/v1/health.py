from datetime import datetime, timezone
import time
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from app.core.database import get_db
from app.core.config import settings
from app.schemas.system import HealthResponse, SystemStatusResponse
from app.models.camera import CameraSource
from app.models.incident import Incident, IncidentStatus
from app.models.rule import RuleSeverity
from app.models.document import Document, DocumentChunk
from app.models.zone import Zone

START_TIME = time.time()

router = APIRouter(tags=["Health & Status"])

@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable: {str(e)}"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status,
        timestamp=datetime.now(timezone.utc)
    )

@router.get("/system/status", response_model=SystemStatusResponse)
async def system_status(db: AsyncSession = Depends(get_db)):
    # Query metrics from DB
    cameras_cnt = (await db.execute(select(func.count(CameraSource.id)).where(CameraSource.is_active == True))).scalar() or 0
    open_incidents_cnt = (await db.execute(select(func.count(Incident.id)).where(Incident.status == IncidentStatus.OPEN))).scalar() or 0
    critical_alerts_cnt = (await db.execute(select(func.count(Incident.id)).where(
        Incident.status == IncidentStatus.OPEN,
        Incident.severity == RuleSeverity.CRITICAL
    ))).scalar() or 0
    docs_cnt = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    chunks_cnt = (await db.execute(select(func.count(DocumentChunk.id)))).scalar() or 0
    zones_cnt = (await db.execute(select(func.count(Zone.id)))).scalar() or 0

    uptime = time.time() - START_TIME

    overall_status = "OPTIMAL"
    if critical_alerts_cnt > 0:
        overall_status = "WARNING_CRITICAL_INCIDENTS"
    elif open_incidents_cnt > 5:
        overall_status = "ATTENTION_REQUIRED"

    return SystemStatusResponse(
        status=overall_status,
        active_cameras=cameras_cnt,
        open_incidents=open_incidents_cnt,
        critical_alerts=critical_alerts_cnt,
        indexed_documents=docs_cnt,
        total_chunks=chunks_cnt,
        active_zones=zones_cnt,
        demo_mode=settings.DEMO_MODE,
        llm_provider=settings.LLM_PROVIDER,
        privacy_mode="ANONYMIZED_EVIDENCE",
        uptime_seconds=round(uptime, 2)
    )
