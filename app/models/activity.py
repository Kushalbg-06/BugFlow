from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Activity(Base):
    """
    Audit-trail entry recording an action taken on an issue,
    e.g. status change, assignment change, comment added.
    """
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "status_changed"
    details: Mapped[str | None] = mapped_column(Text, nullable=True)  # e.g. "open -> in_progress"
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    issue = relationship("Issue", back_populates="activities")
    user = relationship("User", back_populates="activities")
