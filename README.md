# EvidenceLens 🔍
> **An Evidence-First Research Agent** for the SerpApi India Hackathon 2026 (AI Agents Track).

EvidenceLens takes questions on current, disputed, or scientific topics, retrieves live web, news, and academic citations via SerpApi, extracts atomic claims, searches adversarially for counter-evidence, and constructs an **Evidence Matrix** linking every assertion to traceable source IDs.

---

## 💡 The Core Problem & Innovation

Current AI search tools and summarizers suffer from **epistemic overconfidence** and **information laundering**:
1. They summarize web pages into single paragraphs, obscuring disagreement.
2. They treat 10 syndicated blog posts repeating the same wire dispatch as "10 independent sources".
3. They hallucinate citations that cannot be verified.

### Our Approach:
- **Multi-Engine Retrieval:** Simultaneously queries Google Web, Google News (for breaking reporting), and Google Scholar (for academic rigor) via SerpApi.
- **Dialectical Stress-Testing:** For every supported claim, the agent generates targeted adversarial counter-evidence queries to seek out refutations, replication failures, and criticisms.
- **Syndication Echo Detection & Fragility Analysis:** Evaluates textual Jaccard overlap to detect echoed wire stories and computes **Single Points of Epistemic Failure (SPOF)**.
- **Shannon Entropy Consensus:** Computes mathematical controversy and consensus scores across weighted source tiers.
- **Strict Pydantic Grounding:** Every claim status is mathematically bound to valid source IDs ($S_1, S_2$). Hallucinated IDs are dropped, and unsupported claims are downgraded automatically.

---

## 🛠️ Architecture Pipeline

```text
       User Question
             │
             ▼
   [ src/planner.py ] ──────► Generates 2-4 focused queries (Web, News, Scholar)
             │
             ▼
   [ src/search.py ]  ──────► SerpApi Multi-Engine Search (with disk cache)
             │
             ▼
  [ src/normalize.py ] ─────► URL canonicalization, dedup, assigns S1...Sn
             │
             ▼
   [ src/claims.py ]  ──────► LLM extracts 3-6 atomic claims with source citations
             │
             ▼
   [ src/verify.py ]  ──────► Generates adversarial counter-evidence queries
             │
             ▼
   [ src/search.py ]  ──────► Retrieves counter-evidence (new IDs S_{n+1}...)
             │
             ▼
   [ src/assess.py ]  ──────► Computes Shannon entropy, echo-chambers, SPOF, status
             │
             ▼
   [ src/report.py ]  ──────► Assembles final Report & Evidence Matrix
             │
             ▼
      [ app.py ]      ──────► Interactive Streamlit Interface
```

---

## 🚀 Setup & Local Execution

### 1. Prerequisites
- Python 3.11+
- Virtual environment (`venv`)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/evidencelens.git
cd evidencelens

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate your API keys:
```env
SERPAPI_API_KEY=your_serpapi_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
CACHE_DIR=cache
```

### 4. Running the App
```bash
streamlit run app.py
```
> **Tip for Judges / Offline Review:** In the sidebar, toggle **"Offline Demo Mode"** to test and explore the Evidence Matrix on longevity research without needing any API keys.

### 5. Running the Tests
```bash
pytest
```
All 20 unit and schema traceability tests run in `< 0.5s` using mocked adapters.

---

## 🌐 SerpApi Integration Breakdown

| Engine | Role in EvidenceLens | Value Added |
| :--- | :--- | :--- |
| `google` | Broad factual context and primary entity search | Baseline coverage of public statements |
| `google_news` | Real-time reporting and event tracking | Distinguishes current developments from stale claims |
| `google_scholar` | Peer-reviewed academic trials and meta-analyses | Prevents unvetted blog opinions from dominating science topics |

---

## 📜 Limitations & Epistemic Disclaimer
EvidenceLens does not claim to establish absolute ontological truth. It presents what the indexed web and academic corpus currently state, highlights where sources disagree, and explicitly reveals when evidence is thin or contested.

## 📄 License
MIT License.
