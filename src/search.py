"""SerpApi adapter: web, news and scholar search behind a small interface.

Every function returns raw result dicts with the keys:
title, link, snippet, source_type, date (None when unavailable).
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from pathlib import Path
from typing import Callable

import serpapi

from .config import Config, load_config

log = logging.getLogger(__name__)

_ENGINES = {
    "web": ("google", "organic_results"),
    "news": ("google_news", "news_results"),
    "scholar": ("google_scholar", "organic_results"),
}

_client: serpapi.Client | None = None
_config: Config | None = None
_search_call_count: int = 0
MAX_SEARCH_CALLS_PER_RUN: int = 7


def reset_search_counter() -> None:
    """Reset the live search call counter."""
    global _search_call_count
    _search_call_count = 0


def get_search_call_count() -> int:
    """Return the number of API calls made in the current session."""
    return _search_call_count


def configure(config: Config | None = None) -> None:
    """Inject a config (useful for tests); resets the cached client."""
    global _client, _config
    _config = config
    _client = None


def _get_config() -> Config:
    global _config
    if _config is None:
        _config = load_config(require_gemini=False)
    return _config


def _get_client() -> serpapi.Client:
    global _client
    if _client is None:
        _client = serpapi.Client(api_key=_get_config().serpapi_api_key, timeout=20)
    return _client


def _cache_path(cache_dir: Path, engine: str, query: str) -> Path:
    key = hashlib.sha256(f"{engine}\n{query}".encode()).hexdigest()[:24]
    return cache_dir / f"{engine}_{key}.json"


def _fetch(source_type: str, query: str, retries: int = 2) -> dict:
    """Return the raw SerpApi response, using the disk cache when configured."""
    engine, _ = _ENGINES[source_type]
    cfg = _get_config()
    path = None
    if cfg.cache_dir:
        cfg.cache_dir.mkdir(parents=True, exist_ok=True)
        path = _cache_path(cfg.cache_dir, engine, query)
        if path.exists():
            log.info("cache hit: %s %r", engine, query)
            return json.loads(path.read_text())

    params = {"engine": engine, "q": query}
    if source_type == "web":
        params["num"] = cfg.results_per_search

    global _search_call_count
    if _search_call_count >= MAX_SEARCH_CALLS_PER_RUN:
        log.warning("Search budget cap reached (%d calls). Skipping live call for %s %r", MAX_SEARCH_CALLS_PER_RUN, engine, query)
        return {}

    _search_call_count += 1
    for attempt in range(retries + 1):
        try:
            data = dict(_get_client().search(params))
            break
        except serpapi.HTTPError as e:
            # 429 = rate limited; back off and retry. Anything else is fatal for this call.
            if e.status_code == 429 and attempt < retries:
                time.sleep(2 ** attempt)
                continue
            log.error("SerpApi HTTP error %s for %s %r: %s", e.status_code, engine, query, e)
            return {}
        except serpapi.TimeoutError as e:
            if attempt < retries:
                continue
            log.error("SerpApi timeout for %s %r: %s", engine, query, e)
            return {}
        except Exception as e:  # network errors etc. -- never crash the pipeline
            log.error("SerpApi call failed for %s %r: %s", engine, query, e)
            return {}

    if path is not None and "error" not in data:
        path.write_text(json.dumps(data))
    return data


def _extract_news_link_fields(item: dict) -> tuple[str, str, str | None]:
    """News results sometimes nest the story under 'highlight' or 'stories'."""
    return item.get("link", ""), item.get("snippet", ""), item.get("date")


def _parse(source_type: str, data: dict) -> list[dict]:
    if not data or "error" in data:
        if data and "error" in data:
            log.warning("SerpApi returned error: %s", data["error"])
        return []
    _, key = _ENGINES[source_type]
    items = data.get(key) or []
    out: list[dict] = []
    for it in items:
        # Google News groups some results as {"stories": [...]} or {"highlight": {...}}.
        candidates = [it]
        if isinstance(it.get("highlight"), dict):
            candidates.append(it["highlight"])
        candidates.extend(s for s in it.get("stories", []) if isinstance(s, dict))
        for c in candidates:
            link = c.get("link")
            title = c.get("title")
            if not link or not title:
                continue
            snippet = c.get("snippet") or c.get("description") or ""
            date = c.get("date")
            if not date and source_type == "scholar":
                date = (c.get("publication_info") or {}).get("summary")
            out.append(
                {
                    "title": title,
                    "link": link,
                    "snippet": snippet,
                    "source_type": source_type,
                    "date": date,
                }
            )
    return out


def _search(source_type: str, query: str) -> list[dict]:
    query = query.strip()
    if not query:
        return []
    return _parse(source_type, _fetch(source_type, query))


def search_web(query: str) -> list[dict]:
    return _search("web", query)


def search_news(query: str) -> list[dict]:
    return _search("news", query)


def search_scholar(query: str) -> list[dict]:
    return _search("scholar", query)


SEARCHERS: dict[str, Callable[[str], list[dict]]] = {
    "web": search_web,
    "news": search_news,
    "scholar": search_scholar,
}
