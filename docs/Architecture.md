# Architecture — EvidenceLens

## 1. Stack
| Layer | Choice |
|---|---|
| Language | Python 3.11+ |
| UI | Streamlit |
| Schemas | Pydantic v2 |
| Search | SerpApi (`serpapi` package): `google`, `google_news`, `google_scholar` |
| LLM | Google Gemini via `google-genai` (`gemini-2.0-flash`; confirm against docs) |
| Env | python-dotenv |
| Dev | pytest, networkx (optional) |

No database, no auth, no agent framework. Plain functions called in sequence.

## 2. Pipeline
```
Question
   │
   ▼
planner.py ──► 2–4 queries
   │
   ▼
search.py (SerpApi: web / news / scholar, disk-cached)
   │
   ▼
normalize.py ──► canonical URLs, dedup, IDs S1..Sn
   │
   ▼
claims.py (LLM, JSON) ──► 3–6 atomic claims citing source IDs
   │             └─ schemas.repair_claim drops unknown IDs
   ▼
verify.py ──► 1–3 counter-evidence queries ──► search ──► normalize (new IDs continue)
   │
   ▼
assess.py (LLM, JSON) ──► status + rationale + uncertainty, plus quality signals
   │
   ▼
report.py ──► Report (evidence matrix, limitations, queries used)
   │
   ▼
app.py (Streamlit)
```
Budget: 2–4 initial + 1–3 counter-evidence = max ~7 SerpApi calls per question.

## 3. Folder structure
```
evidencelens/
├── app.py                  # Streamlit UI
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
├── docs/                   # PRD, Architecture, Rules, Phases, Design, Memory
├── src/
│   ├── config.py           # env loading/validation            [done]
│   ├── schemas.py          # Source, Claim, Report, repair_claim [done]
│   ├── search.py           # SerpApi adapter + cache            [done]
│   ├── normalize.py        # canonicalize, dedup, IDs           [done]
│   ├── llm.py              # single Gemini wrapper (JSON mode)  [new]
│   ├── planner.py
│   ├── claims.py
│   ├── verify.py
│   ├── assess.py           # also quality signals
│   └── report.py
├── tests/
└── examples/sample_report.json
```
`llm.py` is an addition to the original spec so Gemini usage lives in one place and is easy to mock in tests.

## 4. Key data contracts
- **Source**: source_id, title, url, snippet, source_type (web/news/scholar), published_at, retrieved_at, domain.
- **Claim**: claim_id, text, status, supporting_source_ids, contradicting_source_ids, rationale, uncertainty.
- **Report**: question, generated_at, executive_summary, claims, sources, evidence_matrix, limitations, search_queries_used.

Invariants (enforced in code and tests):
1. Every claim source ID exists in `sources`.
2. `supported` needs supporting sources; `contradicted` needs contradicting; `mixed` needs both.
3. LLM output is repaired (drop unknown IDs, downgrade status), never trusted.

## 5. Module interfaces
```python
search_web(q) / search_news(q) / search_scholar(q) -> list[dict]   # title, link, snippet, source_type, date
normalize_results(raw, existing=None) -> list[Source]
plan_queries(question) -> list[str]
extract_claims(question, sources) -> list[Claim]
build_counter_queries(claims) -> list[str]
assess_claims(claims, sources) -> tuple[list[Claim], dict[claim_id, QualitySignals]]
build_report(question, claims, sources, queries, signals) -> Report
```
`run_pipeline(question, progress_cb)` lives in `report.py` (or a small `pipeline` function) and is what `app.py` calls.

## 6. Quality signals
Per claim: `domain_diversity`, `has_independent_sources`, `recency_score`, `source_type_mix`. Computed in Python from sources (not by the LLM) and fed to the assessment prompt and shown in the UI.

## 7. Error handling flow
- SerpApi failure → empty list, logged; pipeline continues with whatever was found.
- No sources at all → report with zero claims and a limitation, no LLM calls.
- LLM invalid JSON → one retry, then fail that stage with a clear UI message.
- Each stage reports progress to the UI via a callback.

## 8. Config
`.env`: `SERPAPI_API_KEY`, `GEMINI_API_KEY`, optional `CACHE_DIR`.
