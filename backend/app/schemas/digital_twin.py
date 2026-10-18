from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class DigitalTwinObjectResponse(BaseModel):
    id: int
    zone_id: int
    name: str
    object_type: str
    expected_present: bool
    is_discrepancy: bool
    discrepancy_details: Optional[str] = None
    last_verified_at: datetime

    model_config = {"from_attributes": True}

class ZoneDiscrepancyItem(BaseModel):
    id: str
    zone_id: int
    zone_name: str
    discrepancy_type: str
    severity: str
    description: str
    detected_at: datetime
    confidence: float
    recommended_action: str

class ZoneSummaryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    risk_level: str
    is_restricted: bool
    max_occupancy: int
    current_occupancy: int
    expected_conditions: Optional[str] = None
    polygon_coords: Optional[str] = None
    status: str
    camera_count: int
    active_discrepancies: List[ZoneDiscrepancyItem]
    objects: List[DigitalTwinObjectResponse]
    last_telemetry_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class DigitalTwinOverviewResponse(BaseModel):
    zones: List[ZoneSummaryResponse]
    total_zones: int
    restricted_zones_count: int
    total_discrepancies: int
    facility_status: str
    evaluated_at: datetime
