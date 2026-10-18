from typing import List, Optional, Any
from pydantic import BaseModel

class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class DetectionResult(BaseModel):
    category: str
    confidence: float
    bounding_box: List[float]  # [x, y, w, h] normalized
    label: str
    requires_review: bool

class ProcessFrameRequest(BaseModel):
    image_base64: str
    camera_id: int = 1
    zone_id: Optional[int] = None
    is_demo: bool = False

class ProcessFrameResponse(BaseModel):
    camera_id: int
    detections: List[DetectionResult]
    annotated_frame_base64: Optional[str] = None
    processing_time_ms: float
    timestamp: str

class CameraItem(BaseModel):
    id: int
    name: str
    location: str
    is_active: bool
    is_demo: bool
    resolution: str
    fps: int
    zone_id: Optional[int] = None

    model_config = {"from_attributes": True}
