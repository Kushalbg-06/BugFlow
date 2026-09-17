from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from ..schemas.notification import (
    MarkReadResult,
    NotificationListOut,
    UnreadCountOut,
)
from ..services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListOut)
def list_notifications(
    category: Optional[str] = Query(
        None, description="all | assigned | comments | status | ai | system"
    ),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items, unread_count, total = notification_service.get_notifications(
        db, current_user.id, category=category, limit=limit, offset=offset
    )
    return {"items": items, "unread_count": unread_count, "total": total}


@router.get("/unread-count", response_model=UnreadCountOut)
def unread_count(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _, count, _ = notification_service.get_notifications(db, current_user.id, limit=1)
    return {"count": count}


@router.post("/{notification_id}/read", response_model=MarkReadResult)
def mark_one_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    updated = notification_service.mark_read(db, current_user.id, [notification_id])
    return {"updated": updated}


@router.post("/mark-all-read", response_model=MarkReadResult)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    updated = notification_service.mark_all_read(db, current_user.id)
    return {"updated": updated}