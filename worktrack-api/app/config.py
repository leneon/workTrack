# ============================================================
# WorkTrack API - Configuration Centralisée
# Utilise pydantic-settings pour charger le .env
# ============================================================

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # ─── Application ──────────────────────────────────────
    APP_NAME: str = "WorkTrack API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "API de gestion des tâches employés - Hyundai Motor Company"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development | staging | production

    # ─── CORS ─────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",   # Admin Web (dev)
        "http://localhost:5173",   # Admin Web (Vite)
        "http://localhost:8000",   # API elle-même
    ]

    # ─── Base de données PostgreSQL ────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://worktrack:worktrack_pass@localhost:5432/worktrack_db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_ECHO: bool = False  # True = log SQL en dev

    # ─── JWT ──────────────────────────────────────────────
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_openssl_rand_hex_32"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60          # 1h
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30            # 30j

    # ─── AWS S3 / MinIO ───────────────────────────────────
    S3_ENDPOINT_URL: str = "http://localhost:9000"     # MinIO local / vide pour AWS
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "worktrack-reports"
    S3_REGION: str = "us-east-1"
    S3_PRESIGNED_URL_EXPIRY: int = 3600               # 1h en secondes

    # ─── Firebase Cloud Messaging (push) ──────────────────
    FCM_SERVER_KEY: str = ""                           # clé Firebase

    # ─── Pagination ───────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # ─── Upload fichiers ──────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_EXTENSIONS: List[str] = [
        "pdf", "doc", "docx", "xls", "xlsx",
        "png", "jpg", "jpeg", "gif", "zip"
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
