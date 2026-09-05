"""
Embedding generation for the RAG knowledge base.
Kept separate from retrieval (rag_retrieval.py) and chat generation
(rag_chat.py) so any of the three can be swapped independently — same
philosophy as report_generator.py's provider abstraction.

Uses sentence-transformers locally (no API key, no network call) so
embeddings never depend on which AI_PROVIDER is configured for chat.
"""
import functools
import json
import logging

logger = logging.getLogger("bugflow.rag.embeddings")

EMBEDDING_DIM = 384  # all-MiniLM-L6-v2


@functools.lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer
    logger.info("Loading embedding model (all-MiniLM-L6-v2)...")
    return SentenceTransformer("all-MiniLM-L6-v2")


def embed_text(text: str) -> list[float]:
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIM
    vector = _model().encode(text, normalize_embeddings=True)
    return vector.tolist()


def serialize_embedding(vector: list[float]) -> str:
    return json.dumps(vector)


def deserialize_embedding(raw: str) -> list[float]:
    return json.loads(raw)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Vectors from embed_text() are already L2-normalized, so a plain dot
    product equals cosine similarity — no separate normalization needed."""
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))