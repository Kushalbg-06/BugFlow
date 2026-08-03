from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.activity import log_activity
from app.models.issue import Issue
from app.models.comment import Comment
from app.models.user import User
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
def list_comments(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Issue).filter(Issue.id == issue_id).first():
        raise HTTPException(status_code=404, detail="Issue not found")
    comments = db.query(Comment).filter(Comment.issue_id == issue_id).order_by(Comment.created_at.asc()).all()
    return [_to_out(c) for c in comments]

@router.post("", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(issue_id: int, payload: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    comment = Comment(issue_id=issue_id, author_id=current_user.id, content=payload.content)
    db.add(comment)
    db.flush()
    log_activity(db, issue_id, current_user.id, "commented", payload.content[:120])
    db.commit()
    db.refresh(comment)
    return _to_out(comment)
