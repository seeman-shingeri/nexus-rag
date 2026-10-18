from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.event import DetectionCategory
from app.models.rule import RuleSeverity

class SafetyRuleBase(BaseModel):
    name: str = Field(..., max_length=150)
    description: str
    category: DetectionCategory
    severity: RuleSeverity = RuleSeverity.MEDIUM
    confidence_threshold: float = Field(0.70, ge=0.1, le=1.0)
    persistence_seconds: int = Field(3, ge=1, le=60)
    cooldown_minutes: int = Field(5, ge=1, le=120)
    zone_id: Optional[int] = None
    is_active: bool = True
    requires_human_approval: bool = True
    standard_procedure: str

class SafetyRuleCreate(SafetyRuleBase):
    pass

class SafetyRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[DetectionCategory] = None
    severity: Optional[RuleSeverity] = None
    confidence_threshold: Optional[float] = Field(None, ge=0.1, le=1.0)
    persistence_seconds: Optional[int] = Field(None, ge=1, le=60)
    cooldown_minutes: Optional[int] = Field(None, ge=1, le=120)
    zone_id: Optional[int] = None
    is_active: Optional[bool] = None
    requires_human_approval: Optional[bool] = None
    standard_procedure: Optional[str] = None

class SafetyRuleResponse(SafetyRuleBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class RuleSimulationRequest(BaseModel):
    category: DetectionCategory
    confidence: float = Field(..., ge=0.0, le=1.0)
    duration_seconds: float = Field(..., ge=0.0)
    zone_id: Optional[int] = None
    camera_id: int = 1
    custom_confidence_threshold: Optional[float] = None
    custom_persistence_seconds: Optional[int] = None

class RuleSimulationResponse(BaseModel):
    matched_rule_id: Optional[int] = None
    matched_rule_name: Optional[str] = None
    severity: Optional[RuleSeverity] = None
    confidence_met: bool
    persistence_met: bool
    alert_triggered: bool
    required_confidence: float
    observed_confidence: float
    required_persistence_seconds: int
    observed_duration_seconds: float
    linked_sop_excerpt: Optional[str] = None
    citation_source: Optional[str] = None
    recommended_action: str
    simulation_notes: str
