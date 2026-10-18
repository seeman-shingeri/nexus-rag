import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Enum, ForeignKey
from app.core.database import Base
from app.models.event import DetectionCategory

class RuleSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class SafetyRule(Base):
    __tablename__ = "safety_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Enum(DetectionCategory), nullable=False)
    severity = Column(Enum(RuleSeverity), default=RuleSeverity.MEDIUM, nullable=False)
    confidence_threshold = Column(Float, default=0.70, nullable=False)
    persistence_seconds = Column(Integer, default=3, nullable=False)
    cooldown_minutes = Column(Integer, default=5, nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)  # Null = All zones
    is_active = Column(Boolean, default=True, nullable=False)
    requires_human_approval = Column(Boolean, default=True, nullable=False)
    standard_procedure = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
