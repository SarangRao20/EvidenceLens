"""EvidenceLens — An Evidence-First Research Agent

Run locally with:
    streamlit run app.py
"""
from __future__ import annotations

import html
import json
from collections import Counter
from pathlib import Path

import streamlit as st

from src.report import run_pipeline
from src.schemas import Claim, Report, Source
from src.ui_styles import CSS

st.set_page_config(
    page_title="EvidenceLens",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="collapsed",
)
st.markdown(CSS, unsafe_allow_html=True)

SAMPLE_PATH = Path(__file__).parent / "examples" / "sample_report.json"

EXAMPLE_QUESTIONS = [
    "Is intermittent fasting proven to extend human lifespan?",
    "Has India's GDP growth slowed in 2026?",
    "Is Rust replacing C++ in production systems?",
    "Are lab-grown diamonds as durable as natural diamonds?",
]

STATUS_META = {
    "supported": ("supported", "SUPPORTED", "🟢", "#22c55e"),
    "contradicted": ("contradicted", "CONTRADICTED", "🔴", "#ef4444"),
    "mixed": ("mixed", "MIXED", "🟡", "#eab308"),
    "insufficient_evidence": ("insufficient", "INSUFFICIENT EVIDENCE", "⚪", "#9ca3af"),
}

# (label, progress fraction at which this step starts), matching run_pipeline's notify() calls
PIPELINE_STEPS = [
    ("Planning search queries", 0.1),
    ("Searching web, news and Google Scholar via SerpApi", 0.25),
    ("Normalizing and deduplicating sources", 0.4),
    ("Extracting atomic claims", 0.55),
    ("Searching for counter-evidence", 0.7),
    ("Assessing evidence", 0.85),
    ("Building report", 0.95),
]

METHODOLOGY = (
    "EvidenceLens searched web, news, and Google Scholar via SerpApi, extracted atomic claims, "
    "then searched for counter-evidence. Assessments are based on retrieved evidence only and "
    "do not represent objective truth."
)
BASE_LIMITATIONS = [
    "Assessments are based on search snippets, not full articles",
    "Source quality is estimated, not formally evaluated",
    "Results depend on search engine ranking and availability",
    "Counter-evidence search may miss relevant sources",
    "Not a substitute for expert review or systematic analysis",
]


# ---------- helpers ----------
def esc(text) -> str:
    return html.escape(str(text), quote=True)


def init_state():
    defaults = {"stage": "input", "question": "", "report": None, "demo": False}
    for k, v in defaults.items():
        st.session_state.setdefault(k, v)


def reset():
    st.session_state.update(stage="input", question="", report=None)


def start_analysis(question: str):
    st.session_state.question = question
    st.session_state.stage = "processing"


def status_badge(status: str) -> str:
    cls, label, _, _ = STATUS_META.get(status, STATUS_META["insufficient_evidence"])
    return f'<span class="status-{cls}">{label}</span>'


def type_badge(source_type: str) -> str:
    dot = {"web": "🔵", "news": "🟠", "scholar": "🟣"}.get(source_type, "⚪")
    return f'<span class="type-badge badge-{source_type}">{dot} {source_type}</span>'


def claim_sources(claim: Claim, by_id: dict[str, Source]) -> list[Source]:
    ids = claim.supporting_source_ids + claim.contradicting_source_ids
    return [by_id[i] for i in dict.fromkeys(ids) if i in by_id]


def domain_ratio(claim: Claim, by_id: dict[str, Source]) -> str:
    srcs = claim_sources(claim, by_id)
    return f"{len({s.domain for s in srcs})}/{len(srcs)}"


def short_date(value: str | None) -> str:
    return value if value else "—"


# ---------- renderers ----------
def render_source_entry(source: Source) -> str:
    snippet = f'<div class="snip">“{esc(source.snippet)}”</div>' if source.snippet else ""
    return (
        f'<div class="source-entry"><span class="source-chip">{esc(source.source_id)}</span>'
        f'<a href="{esc(source.url)}" target="_blank" rel="noopener">{esc(source.title)}</a><br>'
        f'<span class="dom">{esc(source.domain)}</span> · {type_badge(source.source_type)}{snippet}</div>'
    )


def render_input():
    _, mid, _ = st.columns([1, 2, 1])
    with mid:
        st.markdown(
            '<div class="hero"><h1>🔍 EvidenceLens</h1>'
            "<p>Don’t just find answers.<br>Show what the evidence supports.</p></div>",
            unsafe_allow_html=True,
        )
        question = st.text_input(
            "Research question",
            placeholder="Enter a research question…",
            label_visibility="collapsed",
        )
        if st.button("Analyze Evidence", type="primary", use_container_width=True):
            if question.strip():
                start_analysis(question.strip())
                st.rerun()
            else:
                st.error("Please enter a research question.")

        st.markdown('<div class="section-label">Example questions</div>', unsafe_allow_html=True)
        cols = st.columns(2)
        for i, q in enumerate(EXAMPLE_QUESTIONS):
            if cols[i % 2].button(q, key=f"ex{i}", use_container_width=True):
                start_analysis(q)
                st.rerun()

        st.write("")
        st.toggle(
            "Offline demo mode",
            key="demo",
            help="Show a pre-built sample report. No API keys or credits needed.",
        )
        st.markdown(
            '<div class="footer">Powered by SerpApi · Built for SerpApi India Hackathon 2026</div>',
            unsafe_allow_html=True,
        )


def render_processing():
    question = st.session_state.question
    st.markdown(f'<div class="section-label">Analyzing</div><div class="report-q">“{esc(question)}”</div>',
                unsafe_allow_html=True)

    if st.session_state.demo:
        st.session_state.report = Report.model_validate(json.loads(SAMPLE_PATH.read_text()))
        st.session_state.stage = "report"
        st.rerun()

    with st.status("Running evidence pipeline…", expanded=True) as status:
        checklist = st.empty()
        bar = st.progress(0.0)

        def on_progress(msg: str, frac: float):
            lines = []
            for label, start in PIPELINE_STEPS:
                nxt = next((s for _, s in PIPELINE_STEPS if s > start), 1.01)
                if frac >= 1.0 or frac >= nxt:
                    lines.append(f"✅ {label}")
                elif frac >= start:
                    lines.append(f"🔄 **{label}…** _{msg}_")
                else:
                    lines.append(f"⬜ {label}")
            checklist.markdown("\n\n".join(lines))
            bar.progress(min(frac, 1.0))

        try:
            report, _signals = run_pipeline(question, progress_callback=on_progress)
        except Exception as e:  # shown to the user; keep the app usable
            status.update(label="Analysis failed", state="error")
            st.error(f"Analysis failed: {e}")
            st.info("Check your API keys in .env, or use Offline demo mode on the home screen.")
            st.button("← Back", on_click=reset)
            return
        status.update(label="Analysis complete", state="complete", expanded=False)

    st.session_state.report = report
    st.session_state.stage = "report"
    st.rerun()


def render_header(report: Report):
    st.button("← New Question", on_click=reset)
    st.markdown(
        f'<div class="section-label">Research report</div>'
        f'<div class="report-q">“{esc(report.question)}”</div>'
        f'<div class="report-meta">Generated {report.generated_at:%b %d, %Y} · '
        f"{len(report.sources)} sources · {len(report.claims)} claims</div>",
        unsafe_allow_html=True,
    )
    st.markdown('<div class="section-label">Executive summary</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="summary">{esc(report.executive_summary)}</div>', unsafe_allow_html=True)
    st.caption("A summary of what retrieved sources say, not a verdict on what is true.")

    counts = Counter(c.status for c in report.claims)
    cols = st.columns(4)
    for col, key in zip(cols, STATUS_META):
        _, label, icon, color = STATUS_META[key]
        col.markdown(
            f'<div class="metric-card"><div class="number" style="color:{color}">{counts.get(key, 0)}</div>'
            f'<div class="label">{icon} {label.title()}</div></div>',
            unsafe_allow_html=True,
        )


def render_matrix(report: Report):
    st.markdown('<div class="section-label">Evidence matrix</div>', unsafe_allow_html=True)
    by_id = {s.source_id: s for s in report.sources}
    claims = {c.claim_id: c for c in report.claims}
    rows = []
    for i, item in enumerate(report.evidence_matrix):
        status = item.get("status", "insufficient_evidence")
        cls = STATUS_META.get(status, STATUS_META["insufficient_evidence"])[0]
        claim = claims.get(item.get("claim_id"))
        domains = domain_ratio(claim, by_id) if claim else "—"
        health = (
            '<span class="tag tag-fragile">⚠ Fragile origin</span>'
            if item.get("is_fragile")
            else '<span class="tag tag-resilient">✓ Resilient</span>'
        )
        if item.get("controversy_index", 0.0) > 0.4:
            health += '<span class="tag tag-fragile">⚡ High controversy</span>'
        rows.append(
            f'<tr class="row" style="animation-delay:{i * 0.12:.2f}s">'
            f'<td class="mono">{esc(item.get("claim_id", ""))}</td>'
            f'<td>{esc(item.get("text", ""))}</td>'
            f'<td class="cell-{cls}">{status_badge(status)}</td>'
            f'<td>{item.get("supporting_count", 0)}</td>'
            f'<td>{item.get("contradicting_count", 0)}</td>'
            f'<td class="mono">{domains}</td>'
            f"<td>{health}</td></tr>"
        )
    st.markdown(
        '<div class="table-wrap"><table class="evidence-matrix"><thead><tr><th>ID</th><th>Claim</th>'
        "<th>Status</th><th>For</th><th>Against</th><th>Domains</th><th>Epistemic health</th></tr></thead>"
        f'<tbody>{"".join(rows)}</tbody></table></div>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="legend">🟢 Supported &nbsp; 🔴 Contradicted &nbsp; 🟡 Mixed &nbsp; ⚪ Insufficient evidence '
        "&nbsp;·&nbsp; Domains = unique domains / sources cited. Counts are sources, not proof.</div>",
        unsafe_allow_html=True,
    )


def render_claim_card(claim: Claim, by_id: dict[str, Source], expanded: bool):
    _, label, icon, _ = STATUS_META[claim.status]
    with st.expander(f"{claim.claim_id}: {claim.text}  ·  {icon} {label}", expanded=expanded):
        if claim.rationale:
            st.markdown(f"**Rationale**\n\n{claim.rationale}")
        if claim.uncertainty:
            st.markdown(
                f'<div class="uncertainty"><strong>⚠ Uncertainty:</strong> {esc(claim.uncertainty)}</div>',
                unsafe_allow_html=True,
            )
        left, right = st.columns(2)
        for col, title, ids in (
            (left, "Supporting evidence", claim.supporting_source_ids),
            (right, "Contradicting evidence", claim.contradicting_source_ids),
        ):
            with col:
                st.markdown(f"**{title}**")
                entries = [render_source_entry(by_id[i]) for i in ids if i in by_id]
                st.markdown("".join(entries) or '<span class="dom">(none)</span>', unsafe_allow_html=True)

        srcs = claim_sources(claim, by_id)
        if srcs:
            domains = {s.domain for s in srcs}
            mix = Counter(s.source_type for s in srcs)
            independent = "All independent ✓" if len(domains) == len(srcs) else "Some sources share a domain"
            st.markdown(
                f'<div class="quality">Source quality: {len(domains)} unique domain(s) · {independent}<br>'
                f'Source types: {" · ".join(f"{n} {t}" for t, n in mix.items())}</div>',
                unsafe_allow_html=True,
            )


def render_claim_cards(report: Report):
    st.markdown('<div class="section-label">Claim analysis</div>', unsafe_allow_html=True)
    by_id = {s.source_id: s for s in report.sources}
    for i, claim in enumerate(report.claims):
        render_claim_card(claim, by_id, expanded=(i == 0))


def render_source_ledger(report: Report):
    st.markdown(f'<div class="section-label">Source ledger ({len(report.sources)} sources)</div>',
                unsafe_allow_html=True)
    rows = "".join(
        f'<tr><td class="mono">{esc(s.source_id)}</td>'
        f'<td><a href="{esc(s.url)}" target="_blank" rel="noopener">{esc(s.title)}</a></td>'
        f"<td>{esc(s.domain)}</td><td>{type_badge(s.source_type)}</td><td>{esc(short_date(s.published_at))}</td></tr>"
        for s in report.sources
    )
    st.markdown(
        '<div class="table-wrap"><table class="ledger"><thead><tr><th>ID</th><th>Title</th><th>Domain</th>'
        f"<th>Type</th><th>Date</th></tr></thead><tbody>{rows}</tbody></table></div>"
        '<div class="legend">Source types: 🔵 Web &nbsp; 🟠 News &nbsp; 🟣 Scholar. '
        "All retrieved sources are listed, including any not cited by a claim.</div>",
        unsafe_allow_html=True,
    )


def render_footer(report: Report):
    st.markdown('<div class="section-label">Methodology</div>', unsafe_allow_html=True)
    st.info(METHODOLOGY)
    with st.expander("Limitations"):
        for lim in dict.fromkeys(BASE_LIMITATIONS + list(report.limitations)):
            st.markdown(f"- {lim}")
    with st.expander("Search queries used"):
        for q in report.search_queries_used:
            st.markdown(f"- `{q}`")
    st.download_button(
        "📥 Download report JSON",
        data=report.model_dump_json(indent=2),
        file_name="evidencelens_report.json",
        mime="application/json",
    )
    st.markdown(
        '<div class="footer">Powered by SerpApi · Built for SerpApi India Hackathon 2026</div>',
        unsafe_allow_html=True,
    )


def render_report():
    report: Report = st.session_state.report
    if report.sources and not report.claims:
        st.warning(
            "Sources were retrieved, but the claim-extraction step returned nothing. "
            "This usually means the Gemini call failed (check `GEMINI_API_KEY` and "
            "`GEMINI_MODEL` in `.env`)."
        )
    render_header(report)
    render_matrix(report)
    render_claim_cards(report)
    render_source_ledger(report)
    render_footer(report)


def main():
    init_state()
    stage = st.session_state.stage
    if stage == "report" and st.session_state.report is not None:
        render_report()
    elif stage == "processing":
        render_processing()
    else:
        render_input()


main()
