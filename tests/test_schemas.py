from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from src.schemas import Claim, Report, Source, repair_claim

NOW = datetime.now(timezone.utc)


def src(i):
    return Source(source_id=f"S{i}", title="t", url=f"https://e{i}.com/a", source_type="web",
                  retrieved_at=NOW, domain=f"e{i}.com")


def test_supported_requires_sources():
    with pytest.raises(ValidationError):
        Claim(claim_id="C1", text="x", status="supported")


def test_mixed_requires_both():
    with pytest.raises(ValidationError):
        Claim(claim_id="C1", text="x", status="mixed", supporting_source_ids=["S1"])


def test_report_rejects_unknown_source_id():
    c = Claim(claim_id="C1", text="x", status="supported", supporting_source_ids=["S9"])
    with pytest.raises(ValidationError):
        Report(question="q", generated_at=NOW, executive_summary="", claims=[c], sources=[src(1)])


def test_report_rejects_duplicate_source_ids():
    with pytest.raises(ValidationError):
        Report(question="q", generated_at=NOW, executive_summary="", claims=[], sources=[src(1), src(1)])


def test_repair_drops_unknown_ids_and_downgrades():
    raw = {"claim_id": "C1", "text": "x", "status": "supported", "supporting_source_ids": ["S9"]}
    c = repair_claim(raw, {"S1"})
    assert c.status == "insufficient_evidence"
    assert c.supporting_source_ids == []
    assert "removed" in c.uncertainty


def test_repair_keeps_valid_refs():
    raw = {"claim_id": "C1", "text": "x", "status": "supported", "supporting_source_ids": ["S1", "S9"]}
    c = repair_claim(raw, {"S1"})
    assert c.status == "supported" and c.supporting_source_ids == ["S1"]


def test_repair_both_sides_becomes_mixed():
    raw = {"claim_id": "C1", "text": "x", "status": "supported",
           "supporting_source_ids": ["S1"], "contradicting_source_ids": ["S2"]}
    assert repair_claim(raw, {"S1", "S2"}).status == "mixed"
