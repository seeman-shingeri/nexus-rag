import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXUS Safety Intelligence Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Host & Port
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Security & JWT
    JWT_SECRET_KEY: str = "nexus_super_secret_development_key_change_in_production_32b"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./nexus.db"

    # Storage Paths
    STORAGE_DIR: str = "./storage"
    EVIDENCE_DIR: str = "./storage/evidence"
    DOCUMENTS_DIR: str = "./storage/documents"

    # AI Model Strategy
    LLM_PROVIDER: str = "local"  # "local" | "gemini"
    GEMINI_API_KEY: str = ""

    # Vision & Safety Thresholds
    CAMERA_INDEX: int = 0
    VISION_CONFIDENCE_THRESHOLD: float = 0.65
    DEMO_MODE: bool = True
    MAX_PERSISTENCE_SECONDS: int = 3
    COOLDOWN_MINUTES: int = 5

    # Privacy & Evidence Retention
    EVIDENCE_RETENTION_DAYS: int = 30
    AUTO_PURGE_ENABLED: bool = True
    MASK_SENSITIVE_REGIONS: bool = False

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "allow"
    }

settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
os.makedirs(settings.DOCUMENTS_DIR, exist_ok=True)
