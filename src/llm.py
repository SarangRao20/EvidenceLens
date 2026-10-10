"""Unified Google Gemini client wrapper using google-genai SDK.

Supports JSON-mode generation with automated parsing, prompt templating, and mock injection for testing.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Callable

from google import genai
from google.genai import types

from .config import Config, load_config

log = logging.getLogger(__name__)

_client: genai.Client | None = None
_config: Config | None = None

# Tried in order when the configured model is unavailable (e.g. shut down,
# renamed, or not enabled for this API key). The first one that works is
# remembered for the rest of the process.
MODEL_FALLBACKS = (
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
)
_resolved_model: str | None = None

# Testing hook: when set, intercepts generate_json calls
_mock_responder: Callable[[str, str], dict | list] | None = None


def configure(config: Config | None = None, mock_responder: Callable[[str, str], dict | list] | None = None) -> None:
    """Inject configuration or a mock LLM responder for testing."""
    global _client, _config, _mock_responder, _resolved_model
    _config = config
    _mock_responder = mock_responder
    _client = None
    _resolved_model = None


def _get_config() -> Config:
    global _config
    if _config is None:
        _config = load_config(require_gemini=True)
    return _config


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        cfg = _get_config()
        _client = genai.Client(api_key=cfg.gemini_api_key)
    return _client


def _clean_json_text(raw_text: str) -> str:
    """Strip accidental markdown fences around a JSON payload."""
    clean = (raw_text or "").strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    if clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


def _is_model_unavailable(error: Exception) -> bool:
    """True when the error means 'this model name cannot be used', not a transient failure."""
    msg = str(error).lower()
    return any(
        token in msg
        for token in ("not found", "not_found", "404", "unsupported", "does not exist",
                      "no longer available", "deprecated", "shut down", "permission")
    )


def generate_json(
    system_instruction: str,
    prompt: str,
    model: str | None = None,
    retries: int = 1,
) -> Any:
    """Generate structured JSON output from Gemini.

    Retries once on JSON parse errors and falls back through MODEL_FALLBACKS
    when the configured model is unavailable. Returns parsed dict or list.
    """
    global _resolved_model

    if _mock_responder is not None:
        return _mock_responder(system_instruction, prompt)

    cfg = _get_config()
    target = model or _resolved_model or cfg.gemini_model
    candidates = [target] + [m for m in MODEL_FALLBACKS if m != target]
    client = _get_client()

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        temperature=0.2,
    )

    last_error: Exception | None = None
    for candidate in candidates:
        for attempt in range(retries + 1):
            try:
                response = client.models.generate_content(
                    model=candidate,
                    contents=prompt,
                    config=config,
                )
                parsed = json.loads(_clean_json_text(response.text or ""))
                if _resolved_model != candidate:
                    log.info("Using Gemini model %s", candidate)
                _resolved_model = candidate
                return parsed
            except json.JSONDecodeError as e:
                last_error = e
                log.warning("Gemini returned invalid JSON on %s (attempt %d/%d): %s",
                            candidate, attempt + 1, retries + 1, e)
                continue
            except Exception as e:
                last_error = e
                if _is_model_unavailable(e):
                    log.warning("Gemini model %s unavailable (%s); trying next model", candidate, e)
                    break
                log.warning("Gemini generation failed on %s (attempt %d/%d): %s",
                            candidate, attempt + 1, retries + 1, e)

    raise RuntimeError(
        f"Gemini failed to return valid JSON. Tried models: {', '.join(candidates)}. "
        f"Last error: {last_error}"
    )
