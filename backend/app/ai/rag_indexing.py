"""
Builds and maintains the RAG knowledge base from resolved BugFlow issues.
This is the write path only — kept separate from embeddings.py (raw
embedding calls) and rag_retrieval.py (search-time logic), per the "keep
retrieval separate from chatbot logic, embedding separate from LLM
generation" requirement.
"""
import hashlib
import json
import logging

from sqlalchemy.orm import Session

from app.ai.embeddings import embed_text, serialize_embedding
from app.models.rag_document import RagDocument, RagDocumentType
from app.models.issue import Issue, IssueStatus
from app.models.comment import Comment
from app.models.test_case import TestCase

logger = logging.getLogger("bugflow.rag.indexing")


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _build_documents(db: Session, issue: Issue) -> list[dict]:
    """Returns the documents that SHOULD exist for this issue right now.
    Only fields that actually exist on the current models are used —
    there is no dedicated 'resolution/fix' text field on Issue yet, only
    ai_root_cause, so that's what gets indexed as the resolution document."""
    docs = []
    base_metadata = {
        "project_id": issue.project_id,
        "status": issue.status.value,
        "category": issue.category,
        "component": issue.component,
    }

    issue_content = (
        f"Title: {issue.title}\n"
        f"Description: {issue.description}\n"
        f"Severity: {issue.severity.value}\n"
        f"Priority: {issue.priority.value}\n"
        f"Category: {issue.category or 'N/A'}\n"
        f"Module/Component: {issue.component or 'N/A'}\n"
        f"Defect type: {issue.defect_type or 'N/A'}"
    )
    docs.append({"document_type": RagDocumentType.ISSUE, "source_id": issue.id, "content": issue_content, "metadata": base_metadata})

    if issue.ai_steps_to_reproduce or issue.ai_expected_result or issue.ai_actual_result:
        parts = []
        if issue.ai_summary:
            parts.append(f"Summary: {issue.ai_summary}")
        if issue.ai_steps_to_reproduce:
            parts.append(f"Steps to reproduce: {issue.ai_steps_to_reproduce}")
        if issue.ai_expected_result:
            parts.append(f"Expected result: {issue.ai_expected_result}")
        if issue.ai_actual_result:
            parts.append(f"Actual result: {issue.ai_actual_result}")
        if issue.ai_environment:
            parts.append(f"Environment: {issue.ai_environment}")
        docs.append({"document_type": RagDocumentType.REPORT, "source_id": issue.id, "content": "\n".join(parts), "metadata": base_metadata})

    if issue.ai_root_cause:
        docs.append({"document_type": RagDocumentType.RESOLUTION, "source_id": issue.id, "content": f"Root cause: {issue.ai_root_cause}", "metadata": base_metadata})

    for c in db.query(Comment).filter(Comment.issue_id == issue.id).all():
        author = getattr(c.author, "username", "unknown")
        docs.append({"document_type": RagDocumentType.COMMENT, "source_id": c.id, "content": f"{author}: {c.content}", "metadata": base_metadata})

    for tc in db.query(TestCase).filter(TestCase.issue_id == issue.id).all():
        docs.append({
            "document_type": RagDocumentType.TEST_CASE,
            "source_id": tc.id,
            "content": f"{tc.title} — expected: {tc.expected_result} (priority: {tc.priority.value})",
            "metadata": base_metadata,
        })

    return docs


def index_issue(db: Session, issue: Issue) -> int:
    """Upserts RagDocument rows to match the issue's current state, skipping
    unchanged content via content_hash (no duplicate embeddings), and removes
    rows for anything deleted (e.g. a removed comment). Returns rows touched."""
    desired = _build_documents(db, issue)
    desired_keys = {(d["document_type"], d["source_id"]) for d in desired}

    existing = db.query(RagDocument).filter(RagDocument.issue_id == issue.id).all()
    existing_by_key = {(row.document_type, row.source_id): row for row in existing}

    changed = 0
    for d in desired:
        key = (d["document_type"], d["source_id"])
        content_hash = _hash(d["content"])
        row = existing_by_key.get(key)
        if row and row.content_hash == content_hash:
            continue
        vector = embed_text(d["content"])
        if row:
            row.content = d["content"]
            row.embedding = serialize_embedding(vector)
            row.doc_metadata = json.dumps(d["metadata"])
            row.content_hash = content_hash
        else:
            db.add(RagDocument(
                issue_id=issue.id,
                document_type=d["document_type"],
                source_id=d["source_id"],
                content=d["content"],
                embedding=serialize_embedding(vector),
                doc_metadata=json.dumps(d["metadata"]),
                content_hash=content_hash,
            ))
        changed += 1

    for key, row in existing_by_key.items():
        if key not in desired_keys:
            db.delete(row)
            changed += 1

    db.commit()
    logger.info("RAG index: issue %s -> %d document(s) touched", issue.id, changed)
    return changed


def index_issue_if_relevant(db: Session, issue: Issue) -> int:
    """Call after any mutation to an issue, its comments, report, or test
    cases. Indexes it if resolved; removes it from the KB if reopened."""
    if issue.status == IssueStatus.RESOLVED:
        return index_issue(db, issue)
    existing = db.query(RagDocument).filter(RagDocument.issue_id == issue.id).all()
    if existing:
        for row in existing:
            db.delete(row)
        db.commit()
        logger.info("RAG index: issue %s no longer resolved — removed %d document(s)", issue.id, len(existing))
    return 0


def index_all_resolved_issues(db: Session) -> dict:
    resolved = db.query(Issue).filter(Issue.status == IssueStatus.RESOLVED).all()
    total, ids = 0, []
    for issue in resolved:
        total += index_issue(db, issue)
        ids.append(issue.id)
    return {"indexed_issue_ids": ids, "documents_created_or_updated": total}