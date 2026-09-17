from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import Permission, require_permission
from app.services.activity import log_activity
from app.ai.rag_indexing import index_issue_if_relevant
from app.models.issue import Issue
from app.models.comment import Comment
from app.models.user import User, UserRole
from app.schemas.comment import CommentCreate, CommentOut

router = APIRouter(prefix="/issues/{issue_id}/comments", tags=["comments"])

def _to_out(comment: Comment) -> CommentOut:
    return CommentOut(
        id=comment.id,
        issue_id=comment.issue_id,
        author_id=comment.author_id,
        author_username=comment.author.username,
        content=comment.content,
        created_at=comment.created_at,
    )

@router.get("", response_model=List[CommentOut])
def list_comments(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ISSUES)),
):
    if not db.query(Issue).filter(Issue.id == issue_id).first():
        raise HTTPException(status_code=404, detail="Issue not found")
    comments = db.query(Comment).filter(Comment.issue_id == issue_id).order_by(Comment.created_at.asc()).all()
    return [_to_out(c) for c in comments]

@router.post("", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    issue_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ADD_COMMENT)),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    comment = Comment(issue_id=issue_id, author_id=current_user.id, content=payload.content)
    db.add(comment)
    db.flush()
    log_activity(db, issue_id, current_user.id, "commented", payload.content[:120])
    db.commit()
    db.refresh(comment)

    index_issue_if_relevant(db, issue)

    return _to_out(comment)


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    issue_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a comment: the author, or an Admin, can delete it."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.issue_id == issue_id
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only the comment author or an admin can delete this comment"
        )

    db.delete(comment)
    log_activity(db, issue_id, current_user.id, "comment_deleted", comment.content[:50])
    db.commit()

    index_issue_if_relevant(db, issue)

    return None