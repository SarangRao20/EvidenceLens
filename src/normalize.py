"""URL canonicalization, dedup, and source ID assignment."""
from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .schemas import Source

_TRACKING_PREFIXES = ("utm_", "mc_", "pk_", "hsa_")
_TRACKING_PARAMS = {
    "fbclid", "gclid", "dclid", "msclkid", "yclid", "igshid", "ref", "ref_src",
    "ref_url", "cmpid", "ocid", "source", "ncid", "_ga", "mkt_tok", "spm",
}


def canonicalize_url(url: str) -> str:
    """Normalize scheme, host, tracking params, fragment and trailing slash."""
    url = url.strip()
    if "://" not in url:
        url = "https://" + url
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if parts.port and parts.port not in (80, 443):
        host = f"{host}:{parts.port}"
    query = sorted(
        (k, v)
        for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if k.lower() not in _TRACKING_PARAMS and not k.lower().startswith(_TRACKING_PREFIXES)
    )
    path = parts.path.rstrip("/") or ""
    return urlunsplit(("https", host, path, urlencode(query), ""))


def extract_domain(url: str) -> str:
    host = urlsplit(canonicalize_url(url)).hostname or ""
    return host


def normalize_results(
    raw_results: list[dict],
    existing: list[Source] | None = None,
    retrieved_at: datetime | None = None,
) -> list[Source]:
    """Dedup raw results by canonical URL and assign sequential IDs.

    Returns the full source list: existing sources first (IDs unchanged),
    followed by newly added ones continuing the S1, S2, ... sequence.
    """
    sources = list(existing or [])
    seen = {canonicalize_url(str(s.url)) for s in sources}
    next_n = 1 + max((int(s.source_id[1:]) for s in sources), default=0)
    now = retrieved_at or datetime.now(timezone.utc)

    for r in raw_results:
        link = r.get("link")
        title = (r.get("title") or "").strip()
        if not link or not title:
            continue
        canon = canonicalize_url(link)
        if canon in seen:
            continue
        seen.add(canon)
        sources.append(
            Source(
                source_id=f"S{next_n}",
                title=title,
                url=canon,
                snippet=(r.get("snippet") or "").strip(),
                source_type=r.get("source_type", "web"),
                published_at=r.get("date"),
                retrieved_at=now,
                domain=extract_domain(canon),
            )
        )
        next_n += 1
    return sources
