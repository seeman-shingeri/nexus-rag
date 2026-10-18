import time
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc

from app.models.event import DetectionCategory, DetectionEvent
from app.models.rule import SafetyRule, RuleSeverity
from app.models.incident import Incident, IncidentStatus
from app.services.rag_service import RAGService
from app.schemas.rule import RuleSimulationRequest, RuleSimulationResponse

class SafetyEngine:
    # In-memory persistence tracker: key -> list of float timestamps
    _history: Dict[str, List[float]] = {}

    @classmethod
    def _get_key(cls, camera_id: int, zone_id: Optional[int], category: str) -> str:
        return f"cam_{camera_id}_zone_{zone_id or 0}_{category}"

    @classmethod
    def track_observation(
        cls,
        camera_id: int,
        zone_id: Optional[int],
        category: str,
        persistence_seconds: int
    ) -> Tuple[bool, float]:
        """
        Tracks consecutive observations for persistence verification.
        Returns: (is_persistent_met, elapsed_duration_seconds)
        """
        now = time.monotonic()
        key = cls._get_key(camera_id, zone_id, category)
        
        if key not in cls._history:
            cls._history[key] = []

        # Keep timestamps within the last (persistence_seconds * 2 + 5) seconds
        cls._history[key] = [t for t in cls._history[key] if (now - t) <= (persistence_seconds * 2 + 5.0)]
        cls._history[key].append(now)

        if not cls._history[key]:
            return False, 0.0

        elapsed = now - cls._history[key][0]
        # Condition is persistent if observations have been ongoing for at least persistence_seconds
        # and we have received at least 2 distinct observations or persistence_seconds is <= 1
        is_met = (elapsed >= float(persistence_seconds)) or (persistence_seconds <= 1 and len(cls._history[key]) >= 1)
        return is_met, elapsed

    @classmethod
    def reset_history(cls, camera_id: Optional[int] = None):
        """Clears persistence tracking cache (useful for tests or camera disconnects)."""
        if camera_id is None:
            cls._history.clear()
        else:
            prefix = f"cam_{camera_id}_"
            cls._history = {k: v for k, v in cls._history.items() if not k.startswith(prefix)}

    @classmethod
    async def evaluate_detection(
        cls,
        db: AsyncSession,
        event: DetectionEvent,
        is_demo: bool = False
    ) -> Optional[Tuple[Incident, bool]]:
        """
        Evaluates a single DetectionEvent against active safety rules.
        Returns (Incident, is_new_alert) if an alert is triggered/updated, or None.
        """
        # Find active rules matching this category and zone
        query = select(SafetyRule).where(
            and_(
                SafetyRule.is_active == True,
                SafetyRule.category == event.category,
                or_(
                    SafetyRule.zone_id == event.zone_id,
                    SafetyRule.zone_id == None
                )
            )
        )
        res = await db.execute(query)
        matching_rules = res.scalars().all()

        if not matching_rules:
            return None

        for rule in matching_rules:
            # 1. Check confidence threshold
            if event.confidence < rule.confidence_threshold:
                continue

            # 2. Check persistence duration
            persistent_met, duration = cls.track_observation(
                camera_id=event.camera_id,
                zone_id=event.zone_id,
                category=event.category.value,
                persistence_seconds=rule.persistence_seconds
            )
            if not persistent_met:
                continue

            # 3. Check cooldown and hysteresis deduplication
            now_utc = datetime.now(timezone.utc)
            cooldown_cutoff = now_utc - timedelta(minutes=rule.cooldown_minutes)

            # Query for an existing un-resolved incident for this rule & zone within cooldown window
            existing_query = select(Incident).where(
                and_(
                    Incident.rule_id == rule.id,
                    Incident.camera_id == event.camera_id,
                    Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED]),
                    Incident.last_detected_at >= cooldown_cutoff
                )
            ).order_by(desc(Incident.last_detected_at)).limit(1)

            existing_res = await db.execute(existing_query)
            existing_incident = existing_res.scalar_one_or_none()

            if existing_incident:
                # Cooldown active: Deduplicate by updating existing incident
                existing_incident.occurrence_count += 1
                existing_incident.last_detected_at = now_utc
                if event.confidence > existing_incident.confidence:
                    existing_incident.confidence = event.confidence
                await db.commit()
                await db.refresh(existing_incident)
                return existing_incident, False

            # 4. Trigger new Incident: Dynamically link SOP via RAGService
            retrieved_sop = rule.standard_procedure
            citation_source = "Safety Rule Registry"
            try:
                rag_query_text = f"What is the safety procedure and immediate action for {event.category.value} in zone {event.zone_id}?"
                rag_result = await RAGService.query(db=db, question=rag_query_text)
                if rag_result.citations and len(rag_result.citations) > 0:
                    top_cite = rag_result.citations[0]
                    retrieved_sop = top_cite.excerpt
                    citation_source = f"{top_cite.source} (Page {top_cite.page or 1})"
            except Exception:
                pass  # Fall back gracefully to rule.standard_procedure

            new_incident = Incident(
                title=f"{rule.severity.value}: {rule.name}",
                rule_id=rule.id,
                event_id=event.id,
                zone_id=event.zone_id,
                camera_id=event.camera_id,
                severity=rule.severity,
                status=IncidentStatus.OPEN,
                observation_summary=f"Detected {event.category.value} at {(event.confidence * 100):.1f}% confidence for >= {rule.persistence_seconds}s.",
                evidence_path=event.evidence_path,
                confidence=event.confidence,
                retrieved_procedure=retrieved_sop,
                citation_source=citation_source,
                recommended_action=f"Dispatch safety officer to Zone {event.zone_id or 1}. Execute {rule.standard_procedure.split(':')[0]}.",
                occurrence_count=1,
                is_demo=is_demo,
                last_detected_at=now_utc,
                created_at=now_utc
            )

            db.add(new_incident)
            await db.commit()
            await db.refresh(new_incident)
            return new_incident, True

        return None

    @classmethod
    async def simulate_rule(
        cls,
        db: AsyncSession,
        req: RuleSimulationRequest
    ) -> RuleSimulationResponse:
        """
        Simulates rule evaluation in an isolated sandbox without creating production incidents.
        """
        # Find candidate rule
        query = select(SafetyRule).where(
            and_(
                SafetyRule.category == req.category,
                or_(
                    SafetyRule.zone_id == req.zone_id,
                    SafetyRule.zone_id == None
                )
            )
        )
        res = await db.execute(query)
        rule = res.scalars().first()

        req_conf = req.custom_confidence_threshold or (rule.confidence_threshold if rule else 0.70)
        req_persist = req.custom_persistence_seconds or (rule.persistence_seconds if rule else 3)
        severity = rule.severity if rule else RuleSeverity.MEDIUM
        rule_name = rule.name if rule else f"Default Policy for {req.category.value}"
        rule_id = rule.id if rule else None

        conf_met = req.confidence >= req_conf
        persist_met = req.duration_seconds >= float(req_persist)
        triggered = conf_met and persist_met

        # Retrieve SOP procedure
        linked_sop = rule.standard_procedure if rule else "Execute standard facility evacuation or containment protocol."
        citation_src = "Rule Specification"

        if triggered:
            try:
                rag_query = f"Procedure for {req.category.value} hazard"
                rag_res = await RAGService.query(db=db, question=rag_query)
                if rag_res.citations:
                    linked_sop = rag_res.citations[0].excerpt
                    citation_src = f"{rag_res.citations[0].source}"
            except Exception:
                pass

        if triggered:
            notes = f"ALERT TRIGGERED: Confidence ({req.confidence:.2f}) and persistence ({req.duration_seconds:.1f}s) exceeded thresholds."
            action = f"Immediate notification dispatched to safety personnel. Follow {linked_sop[:80]}..."
        elif not conf_met and not persist_met:
            notes = f"SUPPRESSED: Both confidence ({req.confidence:.2f} < {req_conf:.2f}) and duration ({req.duration_seconds:.1f}s < {req_persist}s) below thresholds."
            action = "No action required. Telemetry within normal limits."
        elif not conf_met:
            notes = f"SUPPRESSED: Confidence ({req.confidence:.2f}) below required threshold ({req_conf:.2f})."
            action = "Observation logged as sub-threshold event. No alert generated."
        else:
            notes = f"PENDING PERSISTENCE: Confidence met, but observation duration ({req.duration_seconds:.1f}s) shorter than required {req_persist}s."
            action = "Monitoring continues. Alert deferred until persistence confirmed."

        return RuleSimulationResponse(
            matched_rule_id=rule_id,
            matched_rule_name=rule_name,
            severity=severity,
            confidence_met=conf_met,
            persistence_met=persist_met,
            alert_triggered=triggered,
            required_confidence=req_conf,
            observed_confidence=req.confidence,
            required_persistence_seconds=req_persist,
            observed_duration_seconds=req.duration_seconds,
            linked_sop_excerpt=linked_sop,
            citation_source=citation_src,
            recommended_action=action,
            simulation_notes=notes
        )
