from datetime import datetime
from typing import Dict, Any, List
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    database: str
    timestamp: datetime

class SystemStatusResponse(BaseModel):
    status: str
    active_cameras: int
    open_incidents: int
    critical_alerts: int
    indexed_documents: int
    total_chunks: int
    active_zones: int
    demo_mode: bool
    llm_provider: str
    privacy_mode: str
    uptime_seconds: float
