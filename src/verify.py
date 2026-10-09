"""Counter-evidence retrieval and adversarial query generation."""
from __future__ import annotations

import logging
from typing import Sequence

from .llm import generate_json
from .schemas import Claim

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an adversarial fact-checking researcher.
Given a list of candidate claims, your mission is to formulate targeted counter-evidence search queries to stress-test them.

Formulate queries using dialectical angles:
1. Methodological criticism or confounding factors (e.g., "[topic] criticism OR methodology flaws")
2. Refutation or replication failure (e.g., "[topic] debunked OR refuted OR incorrect")
3. Counter-arguments from credible scientific or investigative sources.

Generate 1 to 3 concise, high-impact counter queries total across the top claims.

Output strictly valid JSON formatted as:
{
  "counter_queries": ["query 1", "query 2"]
}
"""


def build_counter_queries(claims: Sequence[Claim]) -> list[str]:
    """Generate 1-3 targeted queries to look for counter-evidence against key claims."""
    if not claims:
        return []

    # Focus on top claims that are marked supported or mixed
    target_claims = [c for c in claims if c.status in ("supported", "mixed")][:3]
    if not target_claims:
        target_claims = list(claims[:2])

    summary = "\n".join(f"- [{c.claim_id}] {c.text}" for c in target_claims)
    prompt = f"Key Claims to stress-test:\n{summary}\n\nGenerate 1 to 3 targeted counter-evidence search queries."

    try:
        data = generate_json(system_instruction=SYSTEM_PROMPT, prompt=prompt)
        queries = data.get("counter_queries", []) if isinstance(data, dict) else []
        queries = [q.strip() for q in queries if isinstance(q, str) and q.strip()]
        if queries:
            return queries[:3]
    except Exception as e:
        log.warning("Counter query generation failed (%s); using fallback", e)

    # Heuristic fallback
    if target_claims:
        first_topic = " ".join(target_claims[0].text.split()[:5])
        return [f"{first_topic} criticism controversy", f"{first_topic} debunked OR refuted"]
    return []
