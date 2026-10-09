"""Report assembly and end-to-end pipeline orchestration for EvidenceLens."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Callable, Sequence

from .assess import QualitySignals, assess_claims
from .claims import extract_claims
from .llm import generate_json
from .normalize import normalize_results
from .planner import plan_queries
from .schemas import Claim, Report, Source
from .search import reset_search_counter, search_news, search_scholar, search_web
from .verify import build_counter_queries

log = logging.getLogger(__name__)

SUMMARY_SYSTEM_PROMPT = """You are an objective research editor for EvidenceLens.
Given a research question, the list of atomic claims, and their evidentiary statuses, write a concise 2-3 paragraph Executive Summary.

Guidelines:
1. Summarize the state of the evidence objectively.
2. State clearly what is supported, what is disputed/contradicted, and where evidence is lacking.
3. NEVER make absolute truth claims (e.g., avoid "we proved" or "is entirely false"). Use calibrated language like "Evidence from news and academic sources indicates...".
4. Output strictly valid JSON matching:
{
  "executive_summary": "Paragraphs of summary...",
  "limitations": [
    "Limitation 1 regarding search snippet depth",
    "Limitation 2 regarding time bounds or source coverage"
  ]
}
"""


def _generate_executive_summary_and_limitations(
    question: str,
    claims: Sequence[Claim],
) -> tuple[str, list[str]]:
    """Generate executive summary and limitations using LLM."""
    if not claims:
        return (
            f"No conclusive evidence could be retrieved for '{question}'. "
            "Search queries returned insufficient or ambiguous results.",
            ["Searches returned insufficient high-confidence results."],
        )

    claims_text = "\n".join(
        f"- [{c.claim_id}] {c.text} (Status: {c.status})" for c in claims
    )
    prompt = f"Question: {question}\n\nClaims and Statuses:\n{claims_text}\n\nGenerate executive summary and limitations."

    try:
        data = generate_json(system_instruction=SUMMARY_SYSTEM_PROMPT, prompt=prompt)
        summary = data.get("executive_summary", "")
        limitations = data.get("limitations", [])
        if summary:
            return summary, limitations
    except Exception as e:
        log.warning("Executive summary generation failed: %s", e)

    # Fallback summary
    statuses = [c.status for c in claims]
    sup_count = statuses.count("supported")
    con_count = statuses.count("contradicted")
    mixed_count = statuses.count("mixed")
    summary = (
        f"Research analysis for '{question}' identified {len(claims)} atomic claims across web, news, and academic sources. "
        f"Of these, {sup_count} are supported by available evidence, {con_count} are contradicted, and {mixed_count} show mixed reporting. "
        "Readers should review the evidence matrix and linked sources below."
    )
    limitations = [
        "Evaluations are based on search snippets and abstracts, not full-text paywalled documents.",
        "Web search is subject to temporal index recency and publishing biases.",
    ]
    return summary, limitations


def assemble_report(
    question: str,
    claims: list[Claim],
    sources: list[Source],
    queries_used: list[str],
    signals_map: dict[str, QualitySignals] | None = None,
) -> Report:
    """Assemble a validated Pydantic Report instance."""
    summary, limitations = _generate_executive_summary_and_limitations(question, claims)

    matrix = []
    signals = signals_map or {}
    for c in claims:
        sig = signals.get(c.claim_id)
        matrix.append(
            {
                "claim_id": c.claim_id,
                "text": c.text,
                "status": c.status,
                "supporting_count": len(c.supporting_source_ids),
                "contradicting_count": len(c.contradicting_source_ids),
                "is_fragile": sig.is_fragile if sig else False,
                "consensus_score": sig.consensus_score if sig else 0.0,
                "controversy_index": sig.controversy_index if sig else 0.0,
                "domain_diversity": sig.domain_diversity if sig else 1,
            }
        )

    return Report(
        question=question,
        generated_at=datetime.now(timezone.utc),
        executive_summary=summary,
        claims=claims,
        sources=sources,
        evidence_matrix=matrix,
        limitations=limitations,
        search_queries_used=queries_used,
    )


def run_pipeline(
    question: str,
    progress_callback: Callable[[str, float], None] | None = None,
) -> tuple[Report, dict[str, QualitySignals]]:
    """End-to-end execution of the EvidenceLens pipeline.

    Args:
        question: User research question.
        progress_callback: Optional fn(message: str, progress_ratio: float).

    Returns:
        tuple[Report, dict[str, QualitySignals]]: Final report and mathematical signals.
    """
    def notify(msg: str, frac: float):
        if progress_callback:
            progress_callback(msg, frac)

    reset_search_counter()
    queries_used: list[str] = []

    # Step 1: Query Planning
    notify("Formulating research queries across web, news, and scholar...", 0.1)
    planned_queries = plan_queries(question)
    queries_used.extend(planned_queries)

    # Step 2: Multi-Engine Search
    notify("Retrieving live web, news, and academic sources via SerpApi...", 0.25)
    raw_results = []
    for q in planned_queries:
        raw_results.extend(search_web(q))
    if planned_queries:
        raw_results.extend(search_news(planned_queries[0]))
        if len(planned_queries) > 1:
            raw_results.extend(search_scholar(planned_queries[1]))

    # Step 3: Normalization & Deduplication
    notify("Canonicalizing URLs and indexing sources...", 0.4)
    sources = normalize_results(raw_results)

    if not sources:
        notify("No sources found; compiling fallback report...", 1.0)
        report = assemble_report(question, [], [], queries_used)
        return report, {}

    # Step 4: Atomic Claim Extraction
    notify(f"Extracting atomic claims from {len(sources)} verified sources...", 0.55)
    claims = extract_claims(question, sources)

    # Step 5: Adversarial Counter-Evidence Retrieval
    notify("Formulating adversarial queries to search for counter-evidence...", 0.7)
    counter_queries = build_counter_queries(claims)
    queries_used.extend(counter_queries)

    raw_counter = []
    for cq in counter_queries:
        raw_counter.extend(search_web(cq))
        raw_counter.extend(search_news(cq))

    # Normalize new counter sources, continuing the S1..Sn sequence
    all_sources = normalize_results(raw_counter, existing=sources)

    # Step 6: Epistemic Assessment & Quality Signals
    notify("Computing epistemic consensus, entropy, and source independence...", 0.85)
    assessed_claims, signals_map = assess_claims(claims, all_sources)

    # Step 7: Assemble Report
    notify("Finalizing Evidence Matrix and Executive Summary...", 0.95)
    report = assemble_report(question, assessed_claims, all_sources, queries_used, signals_map)

    notify("Analysis complete!", 1.0)
    return report, signals_map
