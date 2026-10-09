"""Every claim reference in a report must resolve to a listed source."""
import json
from pathlib import Path

import pytest

from src.schemas import Report

SAMPLE = Path(__file__).resolve().parent.parent / "examples" / "sample_report.json"


@pytest.mark.skipif(not SAMPLE.exists(), reason="sample report not created yet (Phase 2)")
def test_sample_report_is_traceable():
    report = Report.model_validate(json.loads(SAMPLE.read_text()))
    ids = {s.source_id for s in report.sources}
    for c in report.claims:
        assert set(c.supporting_source_ids + c.contradicting_source_ids) <= ids
