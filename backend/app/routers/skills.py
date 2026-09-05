from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.skill import UserSkill, SkillCategory
from app.schemas.skill import SkillsOut, SkillsUpdate

router = APIRouter(prefix="/users/me/skills", tags=["skills"])


@router.get("", response_model=SkillsOut)
def get_my_skills(current_user: User = Depends(get_current_user)):
    core = [s.name for s in current_user.skills if s.category == SkillCategory.CORE]
    domain = [s.name for s in current_user.skills if s.category == SkillCategory.DOMAIN]
    return SkillsOut(
        core_skills=core,
        domain_expertise=domain,
        experience_level=current_user.experience_level,
        total_experience_years=current_user.total_experience_years,
    )


@router.put("", response_model=SkillsOut)
def update_my_skills(
    payload: SkillsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(UserSkill).filter(UserSkill.user_id == current_user.id).delete()

    for name in payload.core_skills:
        db.add(UserSkill(user_id=current_user.id, name=name, category=SkillCategory.CORE))
    for name in payload.domain_expertise:
        db.add(UserSkill(user_id=current_user.id, name=name, category=SkillCategory.DOMAIN))

    current_user.experience_level = payload.experience_level
    current_user.total_experience_years = payload.total_experience_years

    db.commit()
    db.refresh(current_user)

    return SkillsOut(
        core_skills=payload.core_skills,
        domain_expertise=payload.domain_expertise,
        experience_level=current_user.experience_level,
        total_experience_years=current_user.total_experience_years,
    )