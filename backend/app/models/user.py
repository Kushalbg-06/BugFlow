from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, DateTime, ForeignKey,Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    REPORTER = "reporter"
    DEVELOPER = "developer"
    MANAGER = "manager"
    QA = "qa"
    ADMIN = "admin"


class NotificationPreference(str, enum.Enum):
    ON = "on"
    OFF = "off"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.REPORTER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)  
    
    full_name = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)  # User bio/description
    avatar_url = Column(String(255), nullable=True)  # Profile picture URL
    experience_level = Column(String(20), nullable=True)       # e.g. "Intermediate"
    total_experience_years = Column(Float, nullable=True)       # e.g. 1.8


    
    theme = Column(String(20), default="light")  # light, dark
    timezone = Column(String(50), default="UTC")
    date_format = Column(String(20), default="DD MMM YYYY")
    time_format = Column(String(20), default="12 Hour")
    items_per_page = Column(Integer, default=10)
    default_project_id = Column(Integer, ForeignKey("projects.id", name="fk_users_default_project_id_projects"), nullable=True)
    
    notify_issue_assigned = Column(Enum(NotificationPreference), default=NotificationPreference.ON)
    notify_issue_status_changed = Column(Enum(NotificationPreference), default=NotificationPreference.ON)
    notify_new_comment = Column(Enum(NotificationPreference), default=NotificationPreference.ON)
    notify_mention = Column(Enum(NotificationPreference), default=NotificationPreference.ON)
    notify_sprint_deadline = Column(Enum(NotificationPreference), default=NotificationPreference.ON)
    
    
    two_factor_auth = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    issues_reported = relationship("Issue", back_populates="reporter", foreign_keys="Issue.reporter_id")
    issues_assigned = relationship("Issue", back_populates="assignee", foreign_keys="Issue.assignee_id")
    comments = relationship("Comment", back_populates="author")
    activity_logs = relationship("ActivityLog", back_populates="user")
    default_project = relationship("Project", foreign_keys=[default_project_id])
    skills = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")


