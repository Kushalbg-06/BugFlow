"""
Recommend developers for an issue using profile skills, similar past work, and workload.
"""
from typing import List, Optional
from dataclasses import dataclass
from app.models.issue import Issue
from app.models.user import User


@dataclass
class DeveloperMatch:
    user_id: int
    username: str
    full_name: Optional[str]
    match_score: int
    skills: List[str]
    active_issues_count: int
    reasoning: List[str]


_CATEGORY_SKILLS = {
    "authentication": ["auth", "authentication", "security", "python", "backend", "java"],
    "api": ["api", "backend", "rest", "fastapi", "python", "node.js", "nodejs"],
    "database": ["database", "sql", "postgres", "backend"],
    "ui/ux": ["react", "frontend", "javascript", "css", "ui", "ux"],
    "ui": ["react", "frontend", "javascript", "css", "ui"],
    "performance": ["optimization", "profiling", "backend", "database"],
    "security": ["security", "auth", "encryption", "backend"],
    "payment": ["backend", "api", "python"],
}

_DEFECT_SKILLS = {
    "functional defect": ["backend", "api", "logic"],
    "performance issue": ["optimization", "profiling", "database"],
    "ui bug": ["react", "frontend", "javascript"],
    "configuration": ["devops", "configuration", "backend"],
    "data integrity": ["database", "backend", "sql"],
}

_CANDIDATE_ROLES = {"developer", "admin"}


def get_developer_recommendations(
    issue: Issue,
    all_users: List[User],
    similar_resolved_counts: Optional[dict] = None,
    max_results: int = 3,
) -> List[DeveloperMatch]:
    similar_resolved_counts = similar_resolved_counts or {}
    required = _required_skills(issue)
    matches: List[DeveloperMatch] = []

    for user in all_users:
        role = getattr(getattr(user, "role", None), "value", None)
        if role not in _CANDIDATE_ROLES:
            continue
        if issue.assignee_id and user.id == issue.assignee_id:
            continue
        if user.id == issue.reporter_id:
            continue
        if getattr(user, "is_active", True) is False:
            continue

        display_skills = _get_user_skills(user)
        skill_keys = {_norm(s) for s in display_skills}
        match_score = 0
        reasoning: List[str] = []

        if required:
            overlap = required & skill_keys
            match_score += int(round((len(overlap) / len(required)) * 50))
            if overlap:
                labels = _pretty_overlap(overlap, display_skills)
                if issue.category:
                    reasoning.append(f"Strong experience in {issue.category} module")
                elif labels:
                    reasoning.append(f"Strong experience in {', '.join(labels[:3])}")
        else:
            match_score += 20

        similar = similar_resolved_counts.get(user.id, 0)
        if similar > 0:
            match_score += min(25, 8 + similar * 2)
            reasoning.append(f"Resolved {similar} similar issue{'s' if similar != 1 else ''}")

        active_count = int(getattr(user, "_active_issues_count", 0) or 0)
        if active_count <= 2:
            match_score += 20
            reasoning.append("Low current workload")
        elif active_count <= 4:
            match_score += 10
            reasoning.append("Moderate current workload")

        level = (user.experience_level or "").lower() if getattr(user, "experience_level", None) else ""
        years = getattr(user, "total_experience_years", None) or 0
        if level in {"expert", "advanced"} or years >= 3:
            match_score += 10
            if level:
                reasoning.append(f"{level.capitalize()} experience level")

        match_score = min(100, int(match_score))
        matches.append(
            DeveloperMatch(
                user_id=user.id,
                username=user.username,
                full_name=getattr(user, "full_name", None) or None,
                match_score=match_score,
                skills=display_skills[:4],
                active_issues_count=active_count,
                reasoning=reasoning or ["Available developer on the team"],
            )
        )

    matches.sort(key=lambda m: m.match_score, reverse=True)
    return matches[:max_results]


def _required_skills(issue: Issue) -> set[str]:
    skills: set[str] = set()
    category = _norm(issue.category)
    if category in _CATEGORY_SKILLS:
        skills.update(_CATEGORY_SKILLS[category])
    component = _norm(issue.component)
    if component:
        skills.add(component)
        if "auth" in component or "security" in component:
            skills.update(["auth", "authentication", "security", "backend"])
        if "api" in component:
            skills.update(["api", "backend", "rest"])
        if "front" in component or "ui" in component:
            skills.update(["react", "frontend", "javascript"])
        if "database" in component or "db" in component:
            skills.update(["database", "sql"])
    defect = _norm(issue.defect_type)
    if defect in _DEFECT_SKILLS:
        skills.update(_DEFECT_SKILLS[defect])
    return skills


def _get_user_skills(user: User) -> List[str]:
    names = []
    for skill in getattr(user, "skills", None) or []:
        if getattr(skill, "name", None):
            names.append(skill.name)
    if names:
        seen = set()
        unique = []
        for name in names:
            key = _norm(name)
            if key not in seen:
                seen.add(key)
                unique.append(name)
        return unique

    username = (user.username or "").lower()
    if any(x in username for x in ["auth", "sec"]):
        return ["Authentication", "Security", "Python"]
    if any(x in username for x in ["front", "ui", "react"]):
        return ["Frontend", "React", "JavaScript"]
    if any(x in username for x in ["api", "rest"]):
        return ["API", "REST", "Backend"]
    return ["Backend", "Python", "SQL"]


def _pretty_overlap(overlap: set[str], display_skills: List[str]) -> List[str]:
    by_key = {_norm(s): s for s in display_skills}
    return [by_key[k] for k in overlap if k in by_key]


def _norm(value: Optional[str]) -> str:
    return (value or "").strip().lower()
