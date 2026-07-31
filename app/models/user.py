import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DEVELOPER = "developer"
    QA = "qa"
    REPORTER = "reporter"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.REPORTER, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    issues_reported = relationship("Issue", back_populates="reporter", foreign_keys="Issue.reporter_id")
    issues_assigned = relationship("Issue", back_populates="assignee", foreign_keys="Issue.assignee_id")
