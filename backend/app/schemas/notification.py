"""
app/schemas/notification.py
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    event_type: str
    category: str
    title: str
    message: Optional[str] = None
    issue_id: Optional[int] = None
    sprint_id: Optional[int] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True  # pydantic v2; use orm_mode = True on pydantic v1


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
    unread_count: int
    total: int


class UnreadCountOut(BaseModel):
    count: int


class MarkReadResult(BaseModel):
    updated: int