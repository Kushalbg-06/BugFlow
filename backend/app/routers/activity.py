from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.issue import Issue
from app.models.activity import ActivityLog
from app.models.user import User
from app.schemas.activity import ActivityOut

router = APIRouter(prefix="/issues/{issue_id}/activity", tags=["activity"])

@router.get("", response_model=List[ActivityOut])
def list_activity(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Issue).filter(Issue.id == issue_id).first():
        raise HTTPException(status_code=404, detail="Issue not found")
    logs = db.query(ActivityLog).filter(ActivityLog.issue_id == issue_id).order_by(ActivityLog.created_at.desc()).all()
    return [
        ActivityOut(
            id=log.id, issue_id=log.issue_id, user_id=log.user_id,
            username=log.user.username, action=log.action, detail=log.detail,
            created_at=log.created_at,
        )
        for log in logs
    ]
