"""Unit tests for pipeline components (planner, claims, verify, assess, report) with mocks."""
from datetime import datetime, timezone
import pytest

from src import llm, search
from src.assess import compute_quality_signals
from src.claims import extract_claims
from src.planner import plan_queries
from src.report import assemble_report, run_pipeline
from src.schemas import Claim, Source
from src.verify import build_counter_queries


@pytest.fixture
def sample_sources():
    now = datetime.now(timezone.utc)
    return [
        Source(
            source_id="S1",
            title="Paper on Dietary Interventions",
            url="https://nature.com/articles/sample1",
            snippet="Intermittent fasting increases human autophagy significantly in clinical trials.",
            source_type="scholar",
            retrieved_at=now,
            domain="nature.com",
        ),
        Source(
            source_id="S2",
            title="Clinical Study on Calorie Matching",
            url="https://nejm.org/articles/sample2",
            snippet="Isocaloric fasting vs continuous restriction showed identical mortality outcomes.",
            source_type="scholar",
            retrieved_at=now,
            domain="nejm.org",
        ),
        Source(
            source_id="S3",
            title="Wire Story on Fasting",
            url="https://reuters.com/health/sample3",
            snippet="Intermittent fasting increases human autophagy significantly in clinical trials.",
            source_type="news",
            retrieved_at=now,
            domain="reuters.com",
        ),
    ]


def test_planner_fallback_on_error():
    llm.configure(mock_responder=lambda s, p: (_ for _ in ()).throw(RuntimeError("API error")))
    queries = plan_queries("Does caffeine improve memory?")
    assert len(queries) >= 2
    assert any("caffeine" in q for q in queries)


def test_claims_extraction_with_mock(sample_sources):
    def mock_llm(system, prompt):
        return {
            "claims": [
                {
                    "claim_id": "C1",
                    "text": "Fasting boosts autophagy",
                    "status": "supported",
                    "supporting_source_ids": ["S1", "S999"],  # S999 is invalid
                    "contradicting_source_ids": [],
                    "rationale": "Clinical trials show increase",
                    "uncertainty": "Long-term data limited",
                }
            ]
        }

    llm.configure(mock_responder=mock_llm)
    claims = extract_claims("Test question", sample_sources)
    assert len(claims) == 1
    # Unknown S999 must be dropped by repair_claim
    assert "S999" not in claims[0].supporting_source_ids
    assert "S1" in claims[0].supporting_source_ids


def test_quality_signals_and_echo_detection(sample_sources):
    # S1 and S3 share the exact same snippet phrasing (reuters syndicating nature study)
    claim = Claim(
        claim_id="C1",
        text="Fasting boosts autophagy",
        status="supported",
        supporting_source_ids=["S1", "S3"],
        contradicting_source_ids=[],
    )
    signals = compute_quality_signals(claim, sample_sources)
    assert signals.domain_diversity == 2
    assert signals.echo_chamber_detected is True
    assert signals.is_fragile is True  # Collapses to 1 true origin


def test_entropy_and_controversy(sample_sources):
    # Claim with both support and contradiction
    claim = Claim(
        claim_id="C1",
        text="Fasting has superior outcomes",
        status="mixed",
        supporting_source_ids=["S1"],
        contradicting_source_ids=["S2"],
    )
    signals = compute_quality_signals(claim, sample_sources)
    assert signals.controversy_index > 0.0
    assert signals.consensus_score < 1.0


def test_assemble_report_structure(sample_sources):
    claim = Claim(
        claim_id="C1",
        text="Fasting boosts autophagy",
        status="supported",
        supporting_source_ids=["S1"],
        contradicting_source_ids=[],
    )
    report = assemble_report("Sample Q", [claim], sample_sources, ["query 1"])
    assert report.question == "Sample Q"
    assert len(report.claims) == 1
    assert len(report.evidence_matrix) == 1
    assert report.evidence_matrix[0]["status"] == "supported"
