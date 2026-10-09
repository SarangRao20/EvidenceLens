# Phases — EvidenceLens

Each phase has exit criteria. Do not advance until they pass.

## Phase 1 — Foundation ✅ done
- [x] Repo structure, requirements, `.env.example`, `.gitignore`, `config.py`
- [x] `schemas.py` with validation and `repair_claim`
- [x] `search.py` adapter (web/news/scholar) with disk cache
- [x] `normalize.py` (canonical URLs, dedup, IDs)
- [x] Tests for normalize, schemas (14 pass)

**Still to verify:** one live SerpApi call confirming `google_news` engine and `news_results` key, and scholar result shape. Do this at the start of Phase 2 with a real key, with cache on.

## Phase 2 — Pipeline
Exit: `python -m src.report "question"` (or a script) returns a valid `Report` from real searches.

1. Confirm Gemini client usage from current docs; write `src/llm.py` (JSON-mode wrapper, one retry, mockable).
2. `planner.py`: question → 2–4 queries.
3. `claims.py`: sources → 3–6 atomic claims; run through `repair_claim`.
4. `verify.py`: counter-evidence queries for top claims → search → normalize (IDs continue).
5. `assess.py`: quality signals (computed in Python) + LLM status/rationale/uncertainty.
6. `report.py`: assemble `Report`, evidence matrix, limitations, queries used; `run_pipeline` with progress callback.
7. Tests with mocked search and LLM; create `examples/sample_report.json` so the traceability test runs for real.

## Phase 3 — UI (Streamlit)
Exit: full flow works in browser with a real question.

1. Input + Analyze + progress.
2. Executive summary.
3. Evidence Matrix (colored, centerpiece) — see `Design.md`.
4. Expandable claim cards.
5. Source ledger, limitations, queries used (collapsible).
6. Error states: missing keys, no results, LLM failure.

## Phase 4 — Polish and submission
1. README: description, problem, ASCII pipeline, setup, screenshot, stack, SerpApi usage, limitations, license.
2. Capture screenshot; record a demo question set (2–3 good disputed topics, pre-cached).
3. Optional (decide in PRD): demo mode, JSON download, page-text fetch.
4. Final pass: key hygiene, `.gitignore`, run all tests, fresh-venv install check.

## After each phase
Update `docs/Memory.md` (created at the start of Phase 2) with: what exists, decisions made, known gaps, next step.
