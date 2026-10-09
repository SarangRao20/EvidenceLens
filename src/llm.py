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

# Testing hook: when set, intercepts generate_json calls
_mock_responder: Callable[[str, str], dict | list] | None = None


def configure(config: Config | None = None, mock_responder: Callable[[str, str], dict | list] | None = None) -> None:
    """Inject configuration or a mock LLM responder for testing."""
    global _client, _config, _mock_responder
    _config = config
    _mock_responder = mock_responder
    _client = None


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


def generate_json(
    system_instruction: str,
    prompt: str,
    model: str | None = None,
    retries: int = 1,
) -> Any:
    """Generate structured JSON output from Gemini.

    Retries once on JSON parse errors. Returns parsed dict or list.
    """
    if _mock_responder is not None:
        return _mock_responder(system_instruction, prompt)

    cfg = _get_config()
    target_model = model or cfg.gemini_model
    client = _get_client()

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        temperature=0.2,
    )

    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            response = client.models.generate_content(
                model=target_model,
                contents=prompt,
                config=config,
            )
            raw_text = response.text or ""
            # Strip any accidental markdown formatting if present
            clean_text = raw_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()

            return json.loads(clean_text)
        except Exception as e:
            last_error = e
            log.warning("Gemini JSON generation failed (attempt %d/%d): %s", attempt + 1, retries + 1, e)

    raise RuntimeError(f"Gemini failed to return valid JSON after {retries + 1} attempts: {last_error}")
