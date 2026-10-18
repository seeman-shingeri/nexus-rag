import os
import cv2
import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from app.core.config import settings
from app.models.event import DetectionEvent, DetectionCategory
from app.models.incident import Incident, IncidentStatus
from app.models.rule import SafetyRule, RuleSeverity
from app.models.zone import Zone
from app.models.camera import CameraSource
from app.models.audit import AuditLog

class EventService:
    """
    Temporal Event Memory & Incident Lifecycle Management Service.
    Handles persistent event logging, snapshot evidence storage, time-window queries,
    and formal human-approval incident workflows.
    """

    @classmethod
    def save_evidence_snapshot(
        cls,
        frame_bytes: bytes,
        category: str,
        timestamp_str: Optional[str] = None
    ) -> str:
        """
        Saves a single evidence snapshot JPEG to the evidence directory.
        """
        if not timestamp_str:
            timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
        filename = f"ev_{category}_{timestamp_str}.jpg"
        target_path = os.path.join(settings.EVIDENCE_DIR, filename)
        with open(target_path, "wb") as f:
            f.write(frame_bytes)
        return target_path

    @classmethod
    async def record_detection_event(
        cls,
        db: AsyncSession,
        camera_id: int,
        category: DetectionCategory,
        confidence: float,
        bounding_box: List[float],
        zone_id: Optional[int] = None,
        evidence_path: Optional[str] = None,
        is_demo: bool = False,
        requires_review: bool = False
    ) -> DetectionEvent:
        event = DetectionEvent(
            camera_id=camera_id,
            zone_id=zone_id,
            category=category,
            confidence=confidence,
            bounding_box_json=json.dumps(bounding_box),
            evidence_path=evidence_path,
            is_demo=is_demo,
            requires_review=requires_review
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event

    @classmethod
    async def query_temporal_events(
        cls,
        db: AsyncSession,
        start_time: datetime,
        end_time: datetime,
        zone_id: Optional[int] = None,
        category: Optional[DetectionCategory] = None,
        camera_id: Optional[int] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Retrieves events within a defined time window with aggregate statistics.
        """
        conditions = [
            DetectionEvent.timestamp >= start_time,
            DetectionEvent.timestamp <= end_time
        ]
        if zone_id:
            conditions.append(DetectionEvent.zone_id == zone_id)
        if category:
            conditions.append(DetectionEvent.category == category)
        if camera_id:
            conditions.append(DetectionEvent.camera_id == camera_id)

        # 1. Fetch paginated records
        q = (
            select(DetectionEvent)
            .where(and_(*conditions))
            .order_by(desc(DetectionEvent.timestamp))
            .limit(limit)
        )
        res = await db.execute(q)
        events = res.scalars().all()

        # 2. Count total in window
        count_q = select(func.count(DetectionEvent.id)).where(and_(*conditions))
        total_count = (await db.execute(count_q)).scalar() or 0

        # 3. Category distribution
        cat_q = (
            select(DetectionEvent.category, func.count(DetectionEvent.id))
            .where(and_(*conditions))
            .group_by(DetectionEvent.category)
        )
        cat_res = await db.execute(cat_q)
        cat_dist = {str(cat.value if hasattr(cat, 'value') else cat): count for cat, count in cat_res.all()}

        return {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "total_events": total_count,
            "category_distribution": cat_dist,
            "events": [
                {
                    "id": e.id,
                    "camera_id": e.camera_id,
                    "zone_id": e.zone_id,
                    "category": e.category.value,
                    "confidence": e.confidence,
                    "bounding_box": json.loads(e.bounding_box_json),
                    "evidence_path": e.evidence_path,
                    "timestamp": e.timestamp.isoformat(),
                    "requires_review": e.requires_review
                }
                for e in events
            ]
        }

    @classmethod
    async def create_incident(
        cls,
        db: AsyncSession,
        title: str,
        rule_id: int,
        event_id: int,
        camera_id: int,
        zone_id: Optional[int],
        severity: RuleSeverity,
        observation_summary: str,
        confidence: float,
        evidence_path: Optional[str] = None,
        retrieved_procedure: Optional[str] = None,
        citation_source: Optional[str] = None,
        recommended_action: str = "Dispatch safety personnel for immediate onsite verification.",
        is_demo: bool = False
    ) -> Incident:
        incident = Incident(
            title=title,
            rule_id=rule_id,
            event_id=event_id,
            camera_id=camera_id,
            zone_id=zone_id,
            severity=severity,
            status=IncidentStatus.OPEN,
            observation_summary=observation_summary,
            confidence=confidence,
            evidence_path=evidence_path,
            retrieved_procedure=retrieved_procedure,
            citation_source=citation_source,
            recommended_action=recommended_action,
            is_demo=is_demo,
            occurrence_count=1
        )
        db.add(incident)
        await db.commit()
        await db.refresh(incident)
        return incident

    @classmethod
    async def update_incident_status(
        cls,
        db: AsyncSession,
        incident_id: int,
        new_status: IncidentStatus,
        user_id: str,
        notes: Optional[str] = None,
        assigned_to: Optional[str] = None
    ) -> Incident:
        q = select(Incident).where(Incident.id == incident_id)
        res = await db.execute(q)
        incident = res.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident #{incident_id} not found")

        now = datetime.now(timezone.utc)
        old_status = incident.status.value

        if new_status == IncidentStatus.ACKNOWLEDGED:
            incident.status = IncidentStatus.ACKNOWLEDGED
            incident.acknowledged_by = user_id
            incident.acknowledged_at = now
            if assigned_to:
                incident.assigned_to = assigned_to

        elif new_status == IncidentStatus.RESOLVED:
            incident.status = IncidentStatus.RESOLVED
            incident.resolved_by = user_id
            incident.resolved_at = now
            incident.resolution_notes = notes

        elif new_status == IncidentStatus.REOPENED:
            incident.status = IncidentStatus.REOPENED
            incident.resolved_at = None

        elif new_status == IncidentStatus.DISMISSED:
            incident.status = IncidentStatus.DISMISSED
            incident.resolution_notes = notes or "Dismissed by safety operator after visual inspection."

        await db.commit()
        await db.refresh(incident)

        # Record audit log
        audit = AuditLog(
            user_id=user_id,
            action=f"INCIDENT_{new_status.value}",
            resource_type="INCIDENT",
            resource_id=str(incident_id),
            details=f"Status transitioned from {old_status} to {new_status.value}. Notes: {notes or 'N/A'}"
        )
        db.add(audit)
        await db.commit()

        return incident
