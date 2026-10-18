import os
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc

from app.models.audit import AuditLog
from app.models.event import DetectionEvent
from app.models.incident import Incident
from app.schemas.settings import SystemSettingsResponse, SystemSettingsUpdate

class GovernanceService:
    # Runtime settings state
    _llm_provider: str = os.getenv("DEFAULT_LLM_PROVIDER", "LOCAL_GROUNDED")
    _privacy_mode: str = os.getenv("DEFAULT_PRIVACY_MODE", "STANDARD_SECURE")
    _retention_days: int = int(os.getenv("EVIDENCE_RETENTION_DAYS", "30"))
    _auto_purge_enabled: bool = True
    _gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    @classmethod
    def get_settings(cls) -> SystemSettingsResponse:
        return SystemSettingsResponse(
            llm_provider=cls._llm_provider,
            privacy_mode=cls._privacy_mode,
            retention_days=cls._retention_days,
            auto_purge_enabled=cls._auto_purge_enabled,
            gemini_api_key_configured=bool(cls._gemini_api_key)
        )

    @classmethod
    async def update_settings(
        cls,
        db: AsyncSession,
        update: SystemSettingsUpdate,
        user_id: str
    ) -> SystemSettingsResponse:
        changes = []
        if update.llm_provider is not None:
            changes.append(f"llm_provider: {cls._llm_provider} -> {update.llm_provider}")
            cls._llm_provider = update.llm_provider
        if update.privacy_mode is not None:
            changes.append(f"privacy_mode: {cls._privacy_mode} -> {update.privacy_mode}")
            cls._privacy_mode = update.privacy_mode
        if update.retention_days is not None:
            changes.append(f"retention_days: {cls._retention_days} -> {update.retention_days}")
            cls._retention_days = update.retention_days
        if update.gemini_api_key is not None:
            cls._gemini_api_key = update.gemini_api_key
            changes.append("gemini_api_key: [UPDATED_SECURE_TOKEN]")

        # Log change in audit trail
        audit = AuditLog(
            user_id=user_id,
            action="UPDATE_SYSTEM_SETTINGS",
            resource_type="CONFIGURATION",
            resource_id="RUNTIME_SETTINGS",
            details=", ".join(changes) if changes else "No fields changed",
            ip_address="127.0.0.1"
        )
        db.add(audit)
        await db.commit()

        return cls.get_settings()

    @classmethod
    async def log_action(
        cls,
        db: AsyncSession,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = "127.0.0.1"
    ):
        audit = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address
        )
        db.add(audit)
        await db.commit()

    @classmethod
    async def execute_retention_purge(
        cls,
        db: AsyncSession,
        user_id: str
    ) -> int:
        now_utc = datetime.now(timezone.utc)
        cutoff = now_utc - timedelta(days=cls._retention_days)

        # Select IDs of events older than cutoff that are NOT marked for required review
        query = select(DetectionEvent.id).where(
            DetectionEvent.timestamp < cutoff
        )
        res = await db.execute(query)
        event_ids = res.scalars().all()

        if event_ids:
            del_stmt = delete(DetectionEvent).where(DetectionEvent.id.in_(event_ids))
            await db.execute(del_stmt)

        # Log audit entry
        await cls.log_action(
            db=db,
            user_id=user_id,
            action="EXECUTE_RETENTION_PURGE",
            resource_type="DETECTION_EVENTS",
            resource_id=f"CUTOFF_{cutoff.date()}",
            details=f"Purged {len(event_ids)} events older than {cls._retention_days} days."
        )

        await db.commit()
        return len(event_ids)
