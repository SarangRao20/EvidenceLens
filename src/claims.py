"""Atomic claim extraction from collected web, news, and scholar sources."""
from __future__ import annotations

import logging
from typing import Sequence

from .llm import generate_json
from .schemas import Claim, Source, repair_claim

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an evidence extraction analyst for EvidenceLens.
Your mission is to read a list of retrieved sources and extract 3 to 6 atomic, checkable claims relevant to the user question.

STRICT INVARIANTS:
1. Each claim must be a single, concrete, checkable statement of fact or consensus.
2. You MUST cite source IDs (e.g. S1, S2) ONLY from the provided Source Ledger. NEVER invent IDs.
3. Classify supporting vs contradicting source IDs accurately based only on what the snippets say.
4. If a claim is backed by sources, list them under supporting_source_ids.
5. If some sources dispute it, list them under contradicting_source_ids.
6. Provide an honest 'uncertainty' note highlighting limitations, conflicting data, or snippet ambiguity.
7. Set status to one of: 'supported', 'contradicted', 'mixed', or 'insufficient_evidence'.

Output strictly valid JSON formatted as:
{
  "claims": [
    {
      "claim_id": "C1",
      "text": "Statement of claim",
      "status": "supported",
      "supporting_source_ids": ["S1", "S3"],
      "contradicting_source_ids": [],
      "rationale": "Brief reason based on snippet content",
      "uncertainty": "What remains unverified or ambiguous"
    }
  ]
}
"""


def _format_source_ledger(sources: Sequence[Source]) -> str:
    lines = []
    for s in sources:
        date_str = f" ({s.published_at})" if s.published_at else ""
        lines.append(f"[{s.source_id}] Type: {s.source_type} | Domain: {s.domain}{date_str}")
        lines.append(f"Title: {s.title}")
        lines.append(f"Snippet: {s.snippet}")
        lines.append("---")
    return "\n".join(lines)


def extract_claims(question: str, sources: Sequence[Source]) -> list[Claim]:
    """Extract atomic claims from sources and validate against known source IDs."""
    if not sources:
        return []

    valid_ids = {s.source_id for s in sources}
    ledger = _format_source_ledger(sources)
    prompt = f"User Question: {question}\n\nSource Ledger:\n{ledger}\n\nExtract 3 to 6 atomic claims citing valid Source IDs."

    try:
        data = generate_json(system_instruction=SYSTEM_PROMPT, prompt=prompt)
        raw_claims = data.get("claims", []) if isinstance(data, dict) else []
        claims: list[Claim] = []
        for i, raw in enumerate(raw_claims):
            if not isinstance(raw, dict):
                continue
            if not raw.get("claim_id"):
                raw["claim_id"] = f"C{i+1}"
            repaired = repair_claim(raw, valid_ids)
            claims.append(repaired)
        return claims
    except Exception as e:
        log.error("Claim extraction failed: %s", e)
        return []
