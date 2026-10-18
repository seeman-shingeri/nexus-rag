import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class DetectionCategory(str, enum.Enum):
    PERSON = "person"
    MACHINERY = "machinery"
    LIQUID_SPILL = "liquid_spill"
    FIRE_SMOKE_SUSPICION = "fire_smoke_suspicion"
    MISSING_PPE_HELMET = "missing_ppe_helmet"
    MISSING_PPE_VEST = "missing_ppe_vest"
    BLOCKED_EXIT = "blocked_exit"

class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("camera_sources.id"), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True, index=True)
    category = Column(Enum(DetectionCategory), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    # Normalized bounding box [x, y, w, h] as JSON
    bounding_box_json = Column(String(200), nullable=False)
    evidence_path = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    requires_review = Column(Boolean, default=False, nullable=False)

    camera = relationship("CameraSource", back_populates="events")
    zone = relationship("Zone", back_populates="events")
