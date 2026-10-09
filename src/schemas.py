"""Pydantic data contracts for EvidenceLens."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, HttpUrl, model_validator

log = logging.getLogger(__name__)

SourceType = Literal["web", "news", "scholar"]
ClaimStatus = Literal["supported", "contradicted", "mixed", "insufficient_evidence"]


class Source(BaseModel):
    source_id: str
    title: str
    url: HttpUrl
    snippet: str = ""
    source_type: SourceType
    published_at: Optional[str] = None
    retrieved_at: datetime
    domain: str


class Claim(BaseModel):
    claim_id: str
    text: str
    status: ClaimStatus
    supporting_source_ids: list[str] = Field(default_factory=list)
    contradicting_source_ids: list[str] = Field(default_factory=list)
    rationale: str = ""
    uncertainty: str = ""

    @model_validator(mode="after")
    def _status_matches_evidence(self) -> "Claim":
        # Never display an unsupported claim as verified.
        if self.status == "supported" and not self.supporting_source_ids:
            raise ValueError(f"{self.claim_id}: 'supported' requires supporting sources")
        if self.status == "contradicted" and not self.contradicting_source_ids:
            raise ValueError(f"{self.claim_id}: 'contradicted' requires contradicting sources")
        if self.status == "mixed" and not (
            self.supporting_source_ids and self.contradicting_source_ids
        ):
            raise ValueError(f"{self.claim_id}: 'mixed' requires both source lists")
        return self


class Report(BaseModel):
    question: str
    generated_at: datetime
    executive_summary: str
    claims: list[Claim]
    sources: list[Source]
    evidence_matrix: list[dict] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    search_queries_used: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _references_resolve(self) -> "Report":
        ids = {s.source_id for s in self.sources}
        if len(ids) != len(self.sources):
            raise ValueError("Duplicate source_id in sources")
        for c in self.claims:
            bad = [i for i in c.supporting_source_ids + c.contradicting_source_ids if i not in ids]
            if bad:
                raise ValueError(f"{c.claim_id} references unknown source IDs: {bad}")
        return self


def repair_claim(raw: dict, valid_ids: set[str]) -> Claim:
    """Build a Claim from LLM output, dropping unknown source IDs.

    If dropping references removes the evidence behind the stated status,
    the status is downgraded rather than shown as verified.
    """
    sup = [i for i in raw.get("supporting_source_ids", []) if i in valid_ids]
    con = [i for i in raw.get("contradicting_source_ids", []) if i in valid_ids]
    dropped = (len(raw.get("supporting_source_ids", [])) - len(sup)) + (
        len(raw.get("contradicting_source_ids", [])) - len(con)
    )
    if dropped:
        log.warning("%s: dropped %d unknown source reference(s)", raw.get("claim_id"), dropped)

    status = raw.get("status", "insufficient_evidence")
    if sup and con:
        status = "mixed" if status in ("supported", "contradicted", "mixed") else status
    elif status in ("supported", "mixed") and not sup:
        status = "contradicted" if con else "insufficient_evidence"
    elif status in ("contradicted", "mixed") and not con:
        status = "supported" if sup else "insufficient_evidence"

    uncertainty = raw.get("uncertainty", "")
    if dropped:
        uncertainty = (uncertainty + " Some cited sources were invalid and removed.").strip()
    return Claim(
        claim_id=raw["claim_id"],
        text=raw["text"],
        status=status,
        supporting_source_ids=sup,
        contradicting_source_ids=con,
        rationale=raw.get("rationale", ""),
        uncertainty=uncertainty,
    )
