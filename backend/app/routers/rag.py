from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Permission, require_permission
from app.models.issue import Issue
from app.models.user import User
from app.ai.rag_retrieval import search_historical_knowledge
from app.ai.rag_chat import generate_chat_answer, RagChatError
from app.ai.rag_indexing import index_all_resolved_issues
from app.schemas.rag import (
    RagChatRequest, RagChatResponse, RetrievedDocument,
    RagSearchRequest, RagSearchResponse, RagIndexResponse,
)

router = APIRouter(prefix="/rag", tags=["rag"])


def _get_issue_or_404(db: Session, issue_id: int) -> Issue:
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.post("/search", response_model=RagSearchResponse)
def rag_search(
    payload: RagSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AI_RESOLUTION)),
):
    issue = _get_issue_or_404(db, payload.issue_id)
    retrieved = search_historical_knowledge(db, issue, payload.question, current_user)
    return RagSearchResponse(retrieved=[RetrievedDocument(**r) for r in retrieved])


@router.post("/chat", response_model=RagChatResponse)
def rag_chat(
    payload: RagChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AI_RESOLUTION)),
):
    issue = _get_issue_or_404(db, payload.issue_id)
    retrieved = search_historical_knowledge(db, issue, payload.question, current_user)

    try:
        answer = generate_chat_answer(
            issue, payload.question, retrieved,
            conversation_history=[t.model_dump() for t in payload.conversation_history],
        )
    except RagChatError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return RagChatResponse(
        answer=answer,
        retrieved=[RetrievedDocument(**r) for r in retrieved],
        has_historical_context=len(retrieved) > 0,
    )


@router.post("/index", response_model=RagIndexResponse)
def rag_reindex(
    db: Session = Depends(get_db),
    # Admin-only — there's no dedicated "manage RAG" permission yet, so this
    # borrows MANAGE_ROLES (admin-exclusive in your ROLE_PERMISSIONS map).
    current_user: User = Depends(require_permission(Permission.MANAGE_ROLES)),
):
    return RagIndexResponse(**index_all_resolved_issues(db))