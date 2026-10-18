from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class DigitalTwinObject(Base):
    __tablename__ = "digital_twin_objects"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    object_type = Column(String(50), nullable=False)  # equipment, barrier, spill_kit, extinguisher, sensor
    expected_present = Column(Boolean, default=True, nullable=False)
    is_discrepancy = Column(Boolean, default=False, nullable=False)
    discrepancy_details = Column(String(255), nullable=True)
    last_verified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    zone = relationship("Zone", back_populates="digital_twin_objects")
