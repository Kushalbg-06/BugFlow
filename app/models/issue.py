import enum
from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IssueStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IssueSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# Allowed forward transitions for the workflow state machine.
VALID_TRANSITIONS: dict[IssueStatus, set[IssueStatus]] = {
    IssueStatus.OPEN: {IssueStatus.IN_PROGRESS, IssueStatus.CLOSED},
    IssueStatus.IN_PROGRESS: {IssueStatus.IN_REVIEW, IssueStatus.OPEN, IssueStatus.CLOSED},
    IssueStatus.IN_REVIEW: {IssueStatus.RESOLVED, IssueStatus.IN_PROGRESS, IssueStatus.CLOSED},
    IssueStatus.RESOLVED: {IssueStatus.CLOSED, IssueStatus.IN_PROGRESS},
    IssueStatus.CLOSED: {IssueStatus.OPEN},  # reopen
}


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[IssueStatus] = mapped_column(SAEnum(IssueStatus), default=IssueStatus.OPEN, nullable=False)
    severity: Mapped[IssueSeverity] = mapped_column(SAEnum(IssueSeverity), default=IssueSeverity.MEDIUM, nullable=False)

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    sprint_id: Mapped[int | None] = mapped_column(ForeignKey("sprints.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    project = relationship("Project", back_populates="issues")
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_issues")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_issues")
    sprint = relationship("Sprint", back_populates="issues")
    comments = relationship("Comment", back_populates="issue", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="issue", cascade="all, delete-orphan")
