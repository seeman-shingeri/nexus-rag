from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.models.incident import IncidentStatus
from app.models.rule import RuleSeverity

class IncidentResponse(BaseModel):
    id: int
    title: str
    rule_id: int
    event_id: int
    zone_id: Optional[int] = None
    camera_id: int
    severity: RuleSeverity
    status: IncidentStatus
    observation_summary: str
    evidence_path: Optional[str] = None
    confidence: float
    retrieved_procedure: Optional[str] = None
    citation_source: Optional[str] = None
    recommended_action: str
    occurrence_count: int
    assigned_to: Optional[str] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    is_demo: bool
    last_detected_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}

class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class TemporalEventItem(BaseModel):
    id: int
    camera_id: int
    zone_id: Optional[int] = None
    category: str
    confidence: float
    bounding_box: List[float]
    evidence_path: Optional[str] = None
    timestamp: str
    requires_review: bool

class TemporalQueryResponse(BaseModel):
    start_time: str
    end_time: str
    total_events: int
    category_distribution: Dict[str, int]
    events: List[TemporalEventItem]
