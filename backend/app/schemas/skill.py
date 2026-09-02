from pydantic import BaseModel
from typing import Optional, List


class SkillsOut(BaseModel):
    core_skills: List[str] = []
    domain_expertise: List[str] = []
    experience_level: Optional[str] = None
    total_experience_years: Optional[float] = None


class SkillsUpdate(BaseModel):
    core_skills: List[str] = []
    domain_expertise: List[str] = []
    experience_level: Optional[str] = None
    total_experience_years: Optional[float] = None