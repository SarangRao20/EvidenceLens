# Memory — EvidenceLens

## Current State (Phase 1, 2, and 3 Complete)
- **Phase 1 (Foundation):** Core configuration, Pydantic data schemas, canonical URL normalizer, and SerpApi caching adapter are complete and verified.
- **Phase 2 (Pipeline):**
  - `src/llm.py`: Google Gemini wrapper using modern `google-genai` with JSON mode, retry, and mock responder for tests.
  - `src/planner.py`: Multi-perspective query planner (Web, News, Scholar).
  - `src/claims.py`: Atomic claim extractor with strict source ID validation via `repair_claim`.
  - `src/verify.py`: Adversarial counter-evidence query generator for dialectical stress-testing.
  - `src/assess.py`: Source quality signals + **Thoughtful Innovation**:
    - Snippet Jaccard overlap to detect echoed syndication (wire news repetition).
    - Single Point of Epistemic Failure (SPOF) / Fragility detection.
    - Shannon entropy calculation for controversy & consensus scoring.
  - `src/report.py`: End-to-end pipeline orchestrator `run_pipeline(question, progress_cb)` and report assembler.
  - `examples/sample_report.json`: Clean offline reference report.
- **Phase 3 (UI):**
  - `app.py`: High-polish Streamlit app implementing Design.md:
    - Executive summary.
    - Color-coded **Evidence Matrix** as the visual hero.
    - Fragility / Resilient badges and Controversy indicators.
    - Expandable claim cards with source chips ($S_1, S_2$) and epistemic uncertainty callouts.
    - Verified Source Ledger with direct links and domain attribution.
    - **Offline Demo Mode** toggle in sidebar for instant zero-credential judge demos.
- **Test Suite:** 20/20 tests passing in `<0.4s` (`tests/test_normalize.py`, `tests/test_schemas.py`, `tests/test_source_traceability.py`, `tests/test_pipeline.py`).
- **Phase 4 (Submission Ready):** Comprehensive `README.md` with problem statement, ASCII architecture diagram, setup instructions, and SerpApi engine table.

## Next Step
- Test live run with user's `.env` keys or test locally via `streamlit run app.py` (with demo mode enabled).
