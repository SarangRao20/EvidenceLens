# PRD — EvidenceLens

> Edit freely. Items marked **[DECIDE]** are open choices for you.

## 1. One-liner
An evidence-first research agent: ask about a current or disputed topic, and get a report where every assessment is linked to the live-web sources behind it, including counter-evidence.

## 2. Context
- Event: SerpApi India Hackathon 2026, AI Agents track.
- Core idea: do not just summarize search results. Extract atomic claims, actively look for evidence against them, and show the result as an evidence matrix.
- Principle: the system never claims to prove truth. It shows what the sources say and how uncertain that is.

## 3. Problem
LLM answers and search summaries blend sources together, hide disagreement, and cannot be traced. On disputed or fast-moving topics, readers need to see **which source says what**, and **who disagrees**.

## 4. Target users
| User | Need |
|---|---|
| Student / researcher | Quick, traceable overview of a disputed topic |
| Journalist / fact-checker | Candidate claims with sources for and against, to follow up manually |
| Curious general reader | Plain-language view of "what's actually known" |
| Hackathon judges | Clear demo of agentic use of SerpApi (web + news + scholar) |

## 5. Core user flow
1. User types a question.
2. Clicks **Analyze**; sees pipeline progress.
3. Reads executive summary, then the **Evidence Matrix** (centerpiece).
4. Expands claim cards for rationale, uncertainty, and linked sources.
5. Checks the source ledger and limitations.

## 6. Features
### Must have (MVP)
- Question input and Analyze button with progress spinner.
- Query planning: 2–4 focused searches from the question.
- Multi-engine retrieval via SerpApi: web, news, scholar.
- Source normalization: canonical URLs, dedup, IDs (S1, S2…).
- Atomic claim extraction (3–6 claims), each citing valid source IDs.
- Counter-evidence search for top claims (1–3 extra queries).
- Status per claim: supported / contradicted / mixed / insufficient_evidence.
- Evidence Matrix (colored grid), claim cards, source ledger, limitations, queries used.
- Validation: any unknown source ID is dropped; no unsupported claim shown as verified.
- Disk cache for SerpApi responses during development.

### Should have
- Source-quality signals per claim: domain diversity, independence, recency, source type mix.
- Downloadable report JSON.
- Sample report in `examples/` for the README and offline demo.

### Could have **[DECIDE]**
- Offline "demo mode" that loads the sample report when no API keys are set.
- Fetching full page text for top sources (not just snippets).
- Source-claim graph view (networkx).

### Out of scope
Authentication, database, cloud deployment, agent frameworks, multi-user features, claims of "truth" or verdicts.

## 7. Success criteria
- End-to-end run on a real question in under ~60 seconds, using at most ~7 SerpApi calls.
- 100% of claim source references resolve to listed sources (tested).
- Every claim card shows uncertainty.
- A judge can understand the output in under 30 seconds from the matrix alone.

## 8. Constraints
- Python 3.11+, Streamlit, Pydantic, SerpApi, Gemini (`gemini-2.0-flash`, to be confirmed against current docs).
- Hackathon scope: clean, not over-engineered.
- API keys only via `.env`; never committed.

## 9. Risks
| Risk | Mitigation |
|---|---|
| SerpApi credit burn | Disk cache, hard cap of ~7 calls per run |
| LLM hallucinated sources | Source ID validation and repair; prompts restrict to provided IDs |
| Snippets too thin for claims | Mark `insufficient_evidence`; optional page fetch later |
| Gemini model or SDK drift | Check docs before coding; isolate LLM calls in one wrapper |
| Over-confident presentation | Mandatory uncertainty field and limitations section |

## 10. Open questions **[DECIDE]**
1. Demo mode with canned report: yes/no?
2. Page-text fetching: in or out for MVP?
3. Gemini model: keep `gemini-2.0-flash` or use whatever current docs recommend?
