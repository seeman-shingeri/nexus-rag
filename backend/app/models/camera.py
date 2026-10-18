from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CameraSource(Base):
    __tablename__ = "camera_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    stream_url = Column(String(500), nullable=True)  # RTSP or local index '0'
    location = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)
    resolution = Column(String(20), default="1280x720", nullable=False)
    fps = Column(Integer, default=15, nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    zone = relationship("Zone", back_populates="cameras")
    events = relationship("DetectionEvent", back_populates="camera")
