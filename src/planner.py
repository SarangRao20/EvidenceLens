"""Query planner: decomposes a user question into 2-4 focused search queries."""
from __future__ import annotations

import logging
from typing import Sequence

from .llm import generate_json

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert research query planner for an evidence-first fact-checking agent.
Your mission is to take a research question and generate 2 to 4 diverse, focused search queries.

Guidelines:
1. Cover multiple dimensions:
   - Factual consensus / official claims
   - Scientific or scholarly perspective (suitable for Google Scholar)
   - Recent news / reporting (suitable for Google News)
   - Emerging criticisms or alternative viewpoints
2. Keep queries search-engine friendly (concise keywords, avoid conversational filler like 'please search for').
3. Output strictly valid JSON matching this schema:
   {
     "queries": ["query 1", "query 2", "query 3"]
   }
Generate between 2 and 4 queries.
"""


def plan_queries(question: str) -> list[str]:
    """Given a user question, return 2-4 focused queries to execute across search engines."""
    prompt = f"Research Question: {question.strip()}\nGenerate 2 to 4 search queries."
    try:
        data = generate_json(system_instruction=SYSTEM_PROMPT, prompt=prompt)
        queries = data.get("queries", []) if isinstance(data, dict) else []
        queries = [q.strip() for q in queries if isinstance(q, str) and q.strip()]
        if 2 <= len(queries) <= 4:
            return queries
        if len(queries) > 4:
            return queries[:4]
        if queries:
            return queries
    except Exception as e:
        log.warning("Planner LLM call failed (%s); using heuristic fallback", e)

    # Heuristic fallback if LLM unavailable
    q = question.strip()
    return [
        q,
        f"{q} scientific evidence study",
        f"{q} controversy criticism",
    ]
