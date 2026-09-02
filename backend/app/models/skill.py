from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class SkillCategory(str, enum.Enum):
    CORE = "core"
    DOMAIN = "domain"


class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(50), nullable=False)
    category = Column(Enum(SkillCategory), nullable=False, default=SkillCategory.CORE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="skills")