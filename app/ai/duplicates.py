"""
Uses difflib text similarity as a lightweight stand-in for vector-embedding
search (Pinecone/pgvector) — no external service or API key required.
To upgrade: embed each issue's text and compare via cosine similarity
instead of SequenceMatcher; the rest of the flow is unchanged.
"""
from difflib import SequenceMatcher
from typing import Iterable

SIMILARITY_THRESHOLD = 0.45

def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def find_possible_duplicates(title: str, description: str, candidates: Iterable) -> list[dict]:
    """candidates: iterable of Issue ORM objects. Returns sorted list of matches above threshold."""
    text = f"{title} {description}"
    matches = []
    for issue in candidates:
        score = _similarity(text, f"{issue.title} {issue.description}")
        if score >= SIMILARITY_THRESHOLD:
            matches.append({"issue_id": issue.id, "title": issue.title, "similarity": round(score, 2)})
    matches.sort(key=lambda m: m["similarity"], reverse=True)
    return matches[:5]
