"""Load and validate environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class ConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class Config:
    serpapi_api_key: str
    gemini_api_key: str
    cache_dir: Path | None
    gemini_model: str = "gemini-2.0-flash"
    results_per_search: int = 8


def load_config(require_gemini: bool = True) -> Config:
    serp = os.getenv("SERPAPI_API_KEY", "").strip()
    gem = os.getenv("GEMINI_API_KEY", "").strip()
    missing = []
    if not serp:
        missing.append("SERPAPI_API_KEY")
    if require_gemini and not gem:
        missing.append("GEMINI_API_KEY")
    if missing:
        raise ConfigError(
            f"Missing environment variables: {', '.join(missing)}. "
            "Copy .env.example to .env and fill them in."
        )
    cache = os.getenv("CACHE_DIR", "").strip()
    return Config(
        serpapi_api_key=serp,
        gemini_api_key=gem,
        cache_dir=Path(cache) if cache else None,
    )
