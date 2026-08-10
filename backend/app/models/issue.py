import enum
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class IssuePriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class IssueSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class IssueStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"

class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(IssueSeverity), default=IssueSeverity.MEDIUM, nullable=False)
    priority = Column(Enum(IssuePriority), default=IssuePriority.MEDIUM, nullable=False)
    status = Column(Enum(IssueStatus), default=IssueStatus.OPEN, nullable=False)
    category = Column(String(50), nullable=True)

    ai_summary = Column(Text, nullable=True)
    ai_steps_to_reproduce = Column(Text, nullable=True)
    ai_expected_result = Column(Text, nullable=True)
    ai_actual_result = Column(Text, nullable=True)
    ai_environment = Column(Text, nullable=True)
    ai_root_cause = Column(Text, nullable=True)
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", back_populates="issues")
    sprint = relationship("Sprint", back_populates="issues")
    reporter = relationship("User", back_populates="issues_reported", foreign_keys=[reporter_id])
    assignee = relationship("User", back_populates="issues_assigned", foreign_keys=[assignee_id])
    comments = relationship("Comment", back_populates="issue", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="issue", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="issue", cascade="all, delete-orphan")
