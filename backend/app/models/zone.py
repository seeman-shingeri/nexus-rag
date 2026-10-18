from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    risk_level = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    is_restricted = Column(Boolean, default=False, nullable=False)
    max_occupancy = Column(Integer, default=10, nullable=False)
    expected_conditions = Column(Text, nullable=True)  # JSON or text description
    polygon_coords = Column(Text, nullable=True)       # JSON string of normalized [x, y] coordinates
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    cameras = relationship("CameraSource", back_populates="zone")
    events = relationship("DetectionEvent", back_populates="zone")
    digital_twin_objects = relationship("DigitalTwinObject", back_populates="zone")
