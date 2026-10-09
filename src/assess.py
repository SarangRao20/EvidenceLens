"""Evidence assessment, source-quality signals, and epistemic origin analysis.

Computes:
1. Domain diversity and independence.
2. Syndication / Echo-chamber overlap: detects if multiple sources rephrase the same wire/blog snippet.
3. Single Point of Epistemic Failure (SPOF) / Fragility Index: tests if dropping a single source collapses the claim.
4. Epistemic Consensus & Controversy Index (Shannon Entropy over evidence distribution).
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Sequence

from .llm import generate_json
from .schemas import Claim, Source, repair_claim

log = logging.getLogger(__name__)


@dataclass
class QualitySignals:
    domain_diversity: int
    has_independent_sources: bool
    source_type_mix: list[str]
    is_fragile: bool
    spof_source_id: str | None
    consensus_score: float  # 0.0 (contested) to 1.0 (settled)
    controversy_index: float  # Shannon entropy: 0.0 (unanimous) to 1.0 (split)
    echo_chamber_detected: bool
    unique_origin_count: int


def _jaccard_similarity(s1: str, s2: str) -> float:
    """Compute token Jaccard similarity between two snippet strings."""
    tokens1 = set(s1.lower().split())
    tokens2 = set(s2.lower().split())
    if not tokens1 or not tokens2:
        return 0.0
    return len(tokens1 & tokens2) / len(tokens1 | tokens2)


def compute_quality_signals(claim: Claim, all_sources: Sequence[Source]) -> QualitySignals:
    """Compute mathematical quality, independence, fragility, and consensus signals."""
    source_map = {s.source_id: s for s in all_sources}
    sup_sources = [source_map[i] for i in claim.supporting_source_ids if i in source_map]
    con_sources = [source_map[i] for i in claim.contradicting_source_ids if i in source_map]
    cited_sources = sup_sources + con_sources

    if not cited_sources:
        return QualitySignals(
            domain_diversity=0,
            has_independent_sources=False,
            source_type_mix=[],
            is_fragile=True,
            spof_source_id=None,
            consensus_score=0.0,
            controversy_index=0.0,
            echo_chamber_detected=False,
            unique_origin_count=0,
        )

    # 1. Domain diversity & Independence
    domains = {s.domain for s in cited_sources if s.domain}
    has_independent = len(domains) >= 2
    type_mix = sorted(list({s.source_type for s in cited_sources}))

    # 2. Echo chamber / Syndication detection (Snippet textual overlap > 0.45)
    echo_chamber = False
    unique_origins = len(cited_sources)
    if len(sup_sources) >= 2:
        for i in range(len(sup_sources)):
            for j in range(i + 1, len(sup_sources)):
                sim = _jaccard_similarity(sup_sources[i].snippet, sup_sources[j].snippet)
                if sim > 0.45:
                    echo_chamber = True
                    unique_origins = max(1, unique_origins - 1)

    # 3. Fragility & Single Point of Failure (SPOF)
    is_fragile = False
    spof_id = None
    if len(sup_sources) == 1 and claim.status in ("supported", "mixed"):
        is_fragile = True
        spof_id = sup_sources[0].source_id
    elif echo_chamber and unique_origins == 1:
        is_fragile = True
        spof_id = sup_sources[0].source_id

    # 4. Weighted Epistemic Consensus & Shannon Entropy
    # Scholar = 3.0 weight, News = 2.0, Web = 1.0
    type_weights = {"scholar": 3.0, "news": 2.0, "web": 1.0}
    w_sup = sum(type_weights.get(s.source_type, 1.0) for s in sup_sources)
    w_con = sum(type_weights.get(s.source_type, 1.0) for s in con_sources)
    total_w = w_sup + w_con

    if total_w > 0:
        p_sup = w_sup / total_w
        p_con = w_con / total_w
        # Shannon entropy normalized to [0, 1]
        entropy = 0.0
        if 0 < p_sup < 1:
            h = - (p_sup * math.log2(p_sup) + p_con * math.log2(p_con))
            entropy = round(min(1.0, h), 2)
        consensus = round(abs(p_sup - p_con), 2)
    else:
        consensus = 0.0
        entropy = 0.0

    return QualitySignals(
        domain_diversity=len(domains),
        has_independent_sources=has_independent,
        source_type_mix=type_mix,
        is_fragile=is_fragile,
        spof_source_id=spof_id,
        consensus_score=consensus,
        controversy_index=entropy,
        echo_chamber_detected=echo_chamber,
        unique_origin_count=unique_origins,
    )


ASSESSMENT_SYSTEM_PROMPT = """You are a senior epistemic assessment analyst.
You will evaluate candidate claims against the entire corpus of retrieved sources (both original and counter-evidence).

Your job:
1. Re-verify the status ('supported', 'contradicted', 'mixed', 'insufficient_evidence') of each claim based on ALL sources.
2. If counter-evidence search surfaced valid rebuttals, mark as 'mixed' or 'contradicted' and add to contradicting_source_ids.
3. Explicitly evaluate source credibility: peer-reviewed Scholar papers and established News carry more weight than unverified blogs.
4. Output a precise rationale explaining why the evidence supports or contradicts the claim.
5. Provide a clear uncertainty statement explaining any missing data, caveats, or scope limitations.
6. CITE ONLY SOURCE IDs FROM THE PROVIDED SOURCE LIST.

Output strictly valid JSON formatted as:
{
  "assessed_claims": [
    {
      "claim_id": "C1",
      "text": "Statement of claim",
      "status": "supported",
      "supporting_source_ids": ["S1"],
      "contradicting_source_ids": ["S4"],
      "rationale": "Detailed rationale",
      "uncertainty": "Epistemic uncertainty note"
    }
  ]
}
"""


def assess_claims(
    claims: Sequence[Claim],
    all_sources: Sequence[Source],
) -> tuple[list[Claim], dict[str, QualitySignals]]:
    """Assess claims against all sources, running final LLM classification and signal metrics."""
    if not claims or not all_sources:
        return list(claims), {}

    valid_ids = {s.source_id for s in all_sources}
    source_summary = "\n".join(
        f"[{s.source_id}] ({s.source_type} / {s.domain}): {s.title} — {s.snippet}"
        for s in all_sources
    )
    claims_input = "\n".join(
        f"- [{c.claim_id}] {c.text} (Current: {c.status}, Cited: {c.supporting_source_ids + c.contradicting_source_ids})"
        for c in claims
    )

    prompt = f"Corpus of Sources:\n{source_summary}\n\nClaims to re-assess:\n{claims_input}\n\nRe-assess and return assessed_claims JSON."

    updated_claims = list(claims)
    try:
        data = generate_json(system_instruction=ASSESSMENT_SYSTEM_PROMPT, prompt=prompt)
        raw_list = data.get("assessed_claims", []) if isinstance(data, dict) else []
        if raw_list:
            repaired_list = []
            for raw in raw_list:
                if isinstance(raw, dict):
                    repaired_list.append(repair_claim(raw, valid_ids))
            if repaired_list:
                updated_claims = repaired_list
    except Exception as e:
        log.warning("LLM claim re-assessment failed (%s); retaining initial claims", e)

    # Compute mathematical signals for all claims
    signals_map: dict[str, QualitySignals] = {}
    for c in updated_claims:
        signals_map[c.claim_id] = compute_quality_signals(c, all_sources)

    return updated_claims, signals_map
