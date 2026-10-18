from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.models.zone import Zone
from app.models.camera import CameraSource
from app.models.event import DetectionEvent, DetectionCategory
from app.models.incident import Incident, IncidentStatus
from app.models.digital_twin import DigitalTwinObject
from app.schemas.digital_twin import (
    ZoneSummaryResponse,
    ZoneDiscrepancyItem,
    DigitalTwinOverviewResponse,
    DigitalTwinObjectResponse
)

class TwinService:
    @classmethod
    async def evaluate_facility(cls, db: AsyncSession) -> DigitalTwinOverviewResponse:
        now_utc = datetime.now(timezone.utc)
        recency_cutoff = now_utc - timedelta(minutes=15)

        # 1. Fetch all zones
        zones_res = await db.execute(select(Zone).order_by(Zone.id))
        zones = zones_res.scalars().all()

        zone_summaries: List[ZoneSummaryResponse] = []
        total_discrepancies_count = 0
        restricted_count = 0

        for zone in zones:
            if zone.is_restricted:
                restricted_count += 1

            # Get cameras in this zone
            cam_query = select(CameraSource).where(CameraSource.zone_id == zone.id)
            cams_res = await db.execute(cam_query)
            cameras = cams_res.scalars().all()

            # Get digital twin registered objects in this zone
            obj_query = select(DigitalTwinObject).where(DigitalTwinObject.zone_id == zone.id)
            objs_res = await db.execute(obj_query)
            twin_objs = objs_res.scalars().all()

            # Get recent events in this zone
            events_query = select(DetectionEvent).where(
                and_(
                    DetectionEvent.zone_id == zone.id,
                    DetectionEvent.timestamp >= recency_cutoff
                )
            ).order_by(desc(DetectionEvent.timestamp))
            events_res = await db.execute(events_query)
            recent_events = events_res.scalars().all()

            # Get active unresolved incidents in this zone
            inc_query = select(Incident).where(
                and_(
                    Incident.zone_id == zone.id,
                    Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED])
                )
            ).order_by(desc(Incident.created_at))
            inc_res = await db.execute(inc_query)
            active_incidents = inc_res.scalars().all()

            # Calculate occupancy: count of person detections in recent window (with sample upper bound)
            recent_persons = [e for e in recent_events if e.category == DetectionCategory.PERSON]
            current_occupancy = len(recent_persons)

            # Evaluate discrepancies
            discrepancies: List[ZoneDiscrepancyItem] = []

            # 1. Unauthorized entry check
            if zone.is_restricted and current_occupancy > 0:
                discrepancies.append(
                    ZoneDiscrepancyItem(
                        id=f"disc_unauth_{zone.id}",
                        zone_id=zone.id,
                        zone_name=zone.name,
                        discrepancy_type="UNAUTHORIZED_INTRUSION",
                        severity="CRITICAL",
                        description=f"Personnel presence ({current_occupancy}) detected in restricted security zone.",
                        detected_at=recent_persons[0].timestamp if recent_persons else now_utc,
                        confidence=recent_persons[0].confidence if recent_persons else 0.85,
                        recommended_action="Execute SOP-SEC-101: Broadcast audio warning and dispatch security marshal."
                    )
                )

            # 2. Overcapacity check
            if current_occupancy > zone.max_occupancy:
                discrepancies.append(
                    ZoneDiscrepancyItem(
                        id=f"disc_overcap_{zone.id}",
                        zone_id=zone.id,
                        zone_name=zone.name,
                        discrepancy_type="CAPACITY_EXCEEDED",
                        severity="MEDIUM",
                        description=f"Current occupancy ({current_occupancy}) exceeds safety limit ({zone.max_occupancy}).",
                        detected_at=now_utc,
                        confidence=0.90,
                        recommended_action="Direct excess personnel to adjoining walkways to maintain safe clearances."
                    )
                )

            # 3. Active Incident Discrepancies (Liquid spills, blocked exits, smoke)
            for inc in active_incidents:
                discrepancies.append(
                    ZoneDiscrepancyItem(
                        id=f"disc_inc_{inc.id}",
                        zone_id=zone.id,
                        zone_name=zone.name,
                        discrepancy_type=inc.severity.value,
                        severity=inc.severity.value,
                        description=f"{inc.title}: {inc.observation_summary}",
                        detected_at=inc.last_detected_at,
                        confidence=inc.confidence,
                        recommended_action=inc.recommended_action
                    )
                )

            # 4. Registered Physical Asset Discrepancies
            for obj in twin_objs:
                if obj.is_discrepancy:
                    discrepancies.append(
                        ZoneDiscrepancyItem(
                            id=f"disc_obj_{obj.id}",
                            zone_id=zone.id,
                            zone_name=zone.name,
                            discrepancy_type="MISSING_EQUIPMENT",
                            severity="HIGH",
                            description=f"Asset '{obj.name}' ({obj.object_type}) displaced or missing from assigned bay.",
                            detected_at=obj.last_verified_at,
                            confidence=0.95,
                            recommended_action=f"Inspect mounting position of {obj.name}. Verify presence in equipment registry."
                        )
                    )

            # Zone status determination
            has_critical = any(d.severity == "CRITICAL" for d in discrepancies)
            has_warning = any(d.severity in ["HIGH", "MEDIUM"] for d in discrepancies)

            if has_critical:
                zone_status = "ANOMALY_DETECTED"
            elif has_warning:
                zone_status = "CAUTION"
            else:
                zone_status = "OPTIMAL"

            total_discrepancies_count += len(discrepancies)

            last_telemetry = recent_events[0].timestamp if recent_events else now_utc

            obj_responses = [
                DigitalTwinObjectResponse(
                    id=o.id,
                    zone_id=o.zone_id,
                    name=o.name,
                    object_type=o.object_type,
                    expected_present=o.expected_present,
                    is_discrepancy=o.is_discrepancy,
                    discrepancy_details=o.discrepancy_details,
                    last_verified_at=o.last_verified_at
                )
                for o in twin_objs
            ]

            zone_summaries.append(
                ZoneSummaryResponse(
                    id=zone.id,
                    name=zone.name,
                    description=zone.description,
                    risk_level=zone.risk_level,
                    is_restricted=zone.is_restricted,
                    max_occupancy=zone.max_occupancy,
                    current_occupancy=current_occupancy,
                    expected_conditions=zone.expected_conditions,
                    polygon_coords=zone.polygon_coords,
                    status=zone_status,
                    camera_count=len(cameras),
                    active_discrepancies=discrepancies,
                    objects=obj_responses,
                    last_telemetry_at=last_telemetry
                )
            )

        # Overall Facility Status
        if any(z.status == "ANOMALY_DETECTED" for z in zone_summaries):
            fac_status = "CRITICAL_ALERT"
        elif any(z.status == "CAUTION" for z in zone_summaries):
            fac_status = "ELEVATED_RISK"
        else:
            fac_status = "OPTIMAL"

        return DigitalTwinOverviewResponse(
            zones=zone_summaries,
            total_zones=len(zones),
            restricted_zones_count=restricted_count,
            total_discrepancies=total_discrepancies_count,
            facility_status=fac_status,
            evaluated_at=now_utc
        )
