# Rules — for the AI building EvidenceLens

These bind any AI tool working in this repo. Edit to taste.

## Process
1. Read `docs/Memory.md` first (once it exists), then only the files you need. Do not re-read the whole codebase.
2. Work one phase at a time, in `docs/Phases.md` order. Do not start the next phase until the current one's exit criteria pass.
3. After each phase, update `docs/Memory.md`.
4. Ask before adding features not listed in the PRD.
5. Check official docs before writing SerpApi or Gemini code. SDKs change; do not rely on memory.

## Allowed libraries
`streamlit`, `pydantic`, `serpapi`, `google-genai`, `python-dotenv`, standard library; `networkx`, `pytest` for dev.

## Forbidden
- Agent frameworks (LangChain, LlamaIndex, CrewAI, AutoGen, etc.).
- Databases, auth, cloud deploy config.
- Other LLM providers.
- Adding dependencies without asking.
- Committing `.env` or any key. Only `.env.example` with empty values.

## Code style
- Small functions, type hints, Pydantic for all structured data.
- Match existing naming and comment density; comment the *why*, not the *what*.
- Keep SerpApi calls only inside `src/search.py`; Gemini calls only inside `src/llm.py`.
- Hackathon scope: clean but not over-engineered. No speculative abstractions.

## Evidence integrity (non-negotiable)
- LLM prompts receive the full source list with IDs and must reference only those IDs.
- Unknown IDs are dropped and logged (`repair_claim`); status is downgraded if evidence disappears.
- Never display a claim as verified without at least one valid supporting source.
- Source count is not proof: assessment must weigh independence, quality, recency.
- Always surface uncertainty. Never use language like "proven", "true", or "debunked" as the system's own verdict. Use "supported by", "contradicted by".

## Error handling
- Never crash the pipeline on a single failed search; log and continue.
- LLM JSON parse failure: retry once, then show a clear error. Never fabricate output.
- Surface user-facing errors in the UI in plain language; log details.

## Budget and caching
- Max ~7 SerpApi calls per question. Enforce in code, not just in prompts.
- Use `CACHE_DIR` during development. Never loop live calls in tests; mock the adapter.

## Testing
- Unit tests for normalize, schemas, traceability, and quality signals.
- LLM and SerpApi are mocked in tests.
- Run `pytest` before declaring a phase done. Report failures honestly.

## Communication
- State what was done, what was verified, and what was not.
- If something is unconfirmed (e.g. an engine name or response key), say so.
