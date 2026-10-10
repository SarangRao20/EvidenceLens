"""Load and validate environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class ConfigError(RuntimeError):
    pass


# gemini-2.0-flash was shut down by Google on 2026-06-01; keep this on a
# currently-served model. Override with the GEMINI_MODEL env var.
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash"


@dataclass(frozen=True)
class Config:
    serpapi_api_key: str
    gemini_api_key: str
    cache_dir: Path | None
    gemini_model: str = DEFAULT_GEMINI_MODEL
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
    model = os.getenv("GEMINI_MODEL", "").strip() or DEFAULT_GEMINI_MODEL
    return Config(
        serpapi_api_key=serp,
        gemini_api_key=gem,
        cache_dir=Path(cache) if cache else None,
        gemini_model=model,
    )
