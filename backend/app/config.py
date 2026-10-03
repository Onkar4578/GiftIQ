"""Runtime configuration, read once from environment variables (or a .env file)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _csv(value: str) -> list[str]:
    return [part.strip() for part in value.split(",") if part.strip()]


def _bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str
    gemini_model: str
    database_url: str
    cors_origins: list[str]
    rate_limit_per_minute: int
    ai_timeout_seconds: int
    gst_rate: float
    dispatch_buffer_days: int
    trust_proxy: bool
    log_level: str

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
            gemini_model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip(),
            database_url=os.getenv("DATABASE_URL", "sqlite:///./giftiq.db").strip(),
            cors_origins=_csv(os.getenv("CORS_ORIGINS", "http://localhost:3000")),
            rate_limit_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "10")),
            ai_timeout_seconds=int(os.getenv("AI_TIMEOUT_SECONDS", "30")),
            gst_rate=float(os.getenv("GST_RATE", "0.18")),
            dispatch_buffer_days=int(os.getenv("DISPATCH_BUFFER_DAYS", "2")),
            trust_proxy=_bool(os.getenv("TRUST_PROXY", "false")),
            log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()
