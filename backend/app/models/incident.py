import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Enum, ForeignKey
from app.core.database import Base
from app.models.rule import RuleSeverity

class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    REOPENED = "REOPENED"
    DISMISSED = "DISMISSED"

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    rule_id = Column(Integer, ForeignKey("safety_rules.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("detection_events.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    camera_id = Column(Integer, ForeignKey("camera_sources.id"), nullable=False)
    severity = Column(Enum(RuleSeverity), nullable=False, index=True)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False, index=True)

    observation_summary = Column(Text, nullable=False)
    evidence_path = Column(String(500), nullable=True)
    confidence = Column(Float, nullable=False)
    
    # Grounded RAG Procedure Details
    retrieved_procedure = Column(Text, nullable=True)
    citation_source = Column(String(255), nullable=True)
    recommended_action = Column(Text, nullable=False)
    
    # Human Review Workflow
    requires_human_approval = Column(Boolean, default=True, nullable=False)
    assigned_to = Column(String(50), nullable=True)
    acknowledged_by = Column(String(50), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(50), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    is_demo = Column(Boolean, default=False, nullable=False)
    occurrence_count = Column(Integer, default=1, nullable=False)  # Cooldown deduplication counter
    last_detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
