from sqlalchemy.orm import Session
from app.models.activity import ActivityLog

def log_activity(db: Session, issue_id: int, user_id: int, action: str, detail: str | None = None) -> ActivityLog:
    entry = ActivityLog(issue_id=issue_id, user_id=user_id, action=action, detail=detail)
    db.add(entry)
    return entry
