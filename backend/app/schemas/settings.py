from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class SystemSettingsResponse(BaseModel):
    llm_provider: str
    privacy_mode: str
    retention_days: int
    auto_purge_enabled: bool
    gemini_api_key_configured: bool

class SystemSettingsUpdate(BaseModel):
    llm_provider: Optional[str] = None
    privacy_mode: Optional[str] = None
    retention_days: Optional[int] = Field(None, ge=1, le=365)
    gemini_api_key: Optional[str] = None

class AuditLogResponse(BaseModel):
    id: int
    user_id: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    model_config = {"from_attributes": True}

class UserSummaryResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
