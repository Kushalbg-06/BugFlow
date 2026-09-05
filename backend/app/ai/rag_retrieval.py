"""
RAG retrieval: searches historical (resolved) issue embeddings for the
current issue + question, enforcing RBAC BEFORE anything reaches the LLM.
"""
import logging
from sqlalchemy.orm import Session

from app.ai.embeddings import embed_text, deserialize_embedding, cosine_similarity
from app.models.rag_document import RagDocument, RagDocumentType
from app.models.issue import Issue, IssueStatus
from app.models.user import User
from app.core.permissions import Permission, has_permission

logger = logging.getLogger("bugflow.rag.retrieval")

TOP_K = 5
MIN_SIMILARITY = 0.30


def _allowed_document_types(user: User) -> set[RagDocumentType]:
    """Test cases are gated on VIEW_ISSUES to mirror the app's existing
    /test-cases endpoints — there is currently no QA-only permission on
    TestCase in this codebase. If one is added later, swap this check to
    that permission instead."""
    types = {RagDocumentType.ISSUE, RagDocumentType.REPORT, RagDocumentType.RESOLUTION, RagDocumentType.COMMENT}
    if has_permission(user.role, Permission.VIEW_ISSUES):
        types.add(RagDocumentType.TEST_CASE)
    return types


def search_historical_knowledge(db: Session, current_issue: Issue, question: str, user: User, top_k: int = TOP_K) -> list[dict]:
    allowed_types = _allowed_document_types(user)

    query_text = (
        f"{current_issue.title}\n{current_issue.description}\n"
        f"Category: {current_issue.category or ''} Component: {current_issue.component or ''}\n"
        f"Question: {question}"
    )
    query_vector = embed_text(query_text)

    candidates = (
        db.query(RagDocument)
        .join(Issue, Issue.id == RagDocument.issue_id)
        .filter(Issue.id != current_issue.id)
        .filter(Issue.status == IssueStatus.RESOLVED)
        .filter(RagDocument.document_type.in_(allowed_types))
        .all()
    )

    scored = []
    for doc in candidates:
        try:
            vector = deserialize_embedding(doc.embedding)
        except Exception:
            continue
        score = cosine_similarity(query_vector, vector)
        if score >= MIN_SIMILARITY:
            scored.append((score, doc))

    scored.sort(key=lambda pair: pair[0], reverse=True)

    results = [
        {"issue_id": doc.issue_id, "document_type": doc.document_type.value, "content": doc.content, "similarity": round(score, 3)}
        for score, doc in scored[:top_k]
    ]
    if not results:
        logger.info("RAG retrieval: no historical matches above threshold for issue %s", current_issue.id)
    return results