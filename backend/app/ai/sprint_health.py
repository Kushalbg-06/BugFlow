"""
Sprint Health AI Analysis

Analyzes sprint status, calculates health score, identifies risks,
and ranks incomplete issues for prioritization.
"""

from typing import List, Optional, Dict, Tuple
from dataclasses import dataclass
from datetime import datetime
from app.models.sprint import Sprint
from app.models.issue import Issue, IssueStatus, IssuePriority, IssueSeverity
from app.ai.developer_recommendation import _norm


@dataclass
class IssueRank:
    """Ranked issue for prioritization."""
    issue_id: int
    title: str
    priority: str
    severity: str
    status: str
    rank_score: int
    action_priority: int  # 1 = highest priority
    reasoning: str


@dataclass
class HealthScoreBreakdown:
    """Breakdown of health score factors."""
    sprint_progress: int  # 0-100
    time_progress: int  # 0-100
    blocked_issues_factor: int  # 0-100
    scope_changes_factor: int  # 0-100
    high_priority_factor: int  # 0-100


def calculate_health_score(
    sprint: Sprint,
    issues: List[Issue],
) -> Tuple[int, str, HealthScoreBreakdown]:
    """
    Calculate sprint health score (0-100).
    
    Returns: (score, status, breakdown)
    - score: 0-100
    - status: "🟢 Healthy" / "🟡 At Risk" / "🔴 Critical"
    - breakdown: Factor analysis
    """
    
    if not issues:
        return 100, "🟢 Healthy", HealthScoreBreakdown(100, 100, 100, 100, 100)
    
    # ===== FACTOR 1: Sprint Progress =====
    total_issues = len(issues)
    resolved_issues = len([i for i in issues if i.status == IssueStatus.RESOLVED])
    sprint_progress = int((resolved_issues / total_issues) * 100) if total_issues > 0 else 0
    
    # Score: 80-100 = 20pts, 60-79 = 10pts, <60 = 0pts
    sprint_progress_factor = 20 if sprint_progress >= 80 else (10 if sprint_progress >= 60 else 0)
    
    # ===== FACTOR 2: Time Progress =====
    time_progress, time_progress_factor = _calculate_time_progress(sprint)
    
    # ===== FACTOR 3: Blocked Issues =====
    # Count issues that are in_progress but very old (likely blocked)
    in_progress = [i for i in issues if i.status == IssueStatus.IN_PROGRESS]
    potentially_blocked = len([
        i for i in in_progress 
        if _days_since_update(i.updated_at) > 3
    ])
    
    blocked_issues_factor = max(0, 20 - (potentially_blocked * 5))
    
    # ===== FACTOR 4: Scope Changes =====
    # Rough estimate: check if there are many issues created during sprint
    scope_change_factor = _calculate_scope_change_factor(sprint, issues)
    
    # ===== FACTOR 5: High-Priority Incomplete =====
    high_priority_incomplete = len([
        i for i in issues
        if i.status != IssueStatus.RESOLVED 
        and i.priority in [IssuePriority.CRITICAL, IssuePriority.HIGH]
    ])
    
    high_priority_factor = max(0, 20 - (high_priority_incomplete * 5))
    
    # ===== TOTAL SCORE =====
    total_score = (
        sprint_progress_factor +
        time_progress_factor +
        blocked_issues_factor +
        scope_change_factor +
        high_priority_factor
    )
    
    # Determine status
    if total_score >= 80:
        status = "🟢 Healthy"
    elif total_score >= 60:
        status = "🟡 At Risk"
    else:
        status = "🔴 Critical"
    
    breakdown = HealthScoreBreakdown(
        sprint_progress=sprint_progress,
        time_progress=time_progress,
        blocked_issues_factor=blocked_issues_factor,
        scope_changes_factor=scope_change_factor,
        high_priority_factor=high_priority_factor,
    )
    
    return total_score, status, breakdown


def identify_risks(
    sprint: Sprint,
    issues: List[Issue],
    health_score: int,
) -> List[str]:
    """Identify specific risks affecting this sprint."""
    
    risks = []
    total_issues = len(issues)
    
    if total_issues == 0:
        return risks
    
    # Risk 1: Time Progress
    time_progress, _ = _calculate_time_progress(sprint)
    if time_progress >= 80:
        resolved = len([i for i in issues if i.status == IssueStatus.RESOLVED])
        sprint_progress = int((resolved / total_issues) * 100)
        risks.append(f"{time_progress}% of sprint time has elapsed")
        if sprint_progress < time_progress:
            risks.append(f"Only {sprint_progress}% of issues are completed")
    
    # Risk 2: Blocked Issues
    in_progress = [i for i in issues if i.status == IssueStatus.IN_PROGRESS]
    blocked = [i for i in in_progress if _days_since_update(i.updated_at) > 3]
    if blocked:
        risks.append(f"{len(blocked)} issue{'s' if len(blocked) > 1 else ''} appear to be blocked")
    
    # Risk 3: High Priority Incomplete
    high_priority_incomplete = [
        i for i in issues
        if i.status != IssueStatus.RESOLVED 
        and i.priority in [IssuePriority.CRITICAL, IssuePriority.HIGH]
    ]
    if high_priority_incomplete:
        risks.append(f"{len(high_priority_incomplete)} high-priority issue{'s' if len(high_priority_incomplete) > 1 else ''} remain incomplete")
    
    # Risk 4: Scope changes
    if sprint.start_date:
        created_after_start = [
            i for i in issues
            if i.created_at and i.created_at.date() > sprint.start_date
        ]
        if created_after_start:
            risks.append(f"{len(created_after_start)} issue{'s' if len(created_after_start) > 1 else ''} {'were' if len(created_after_start) > 1 else 'was'} added after sprint started")
    
    return risks


def rank_incomplete_issues(issues: List[Issue]) -> List[IssueRank]:
    """
    Rank incomplete issues by action priority.
    
    Factors considered:
    - Priority (critical/high > medium > low)
    - Severity
    - Status (in_progress > in_review > open)
    - Age/staleness (longer = more blocked)
    - Whether it blocks other work (inferred)
    """
    
    incomplete = [i for i in issues if i.status != IssueStatus.RESOLVED]
    
    if not incomplete:
        return []
    
    ranked = []
    
    for issue in incomplete:
        score = 0
        reasoning_parts = []
        
        # ===== Priority Score =====
        if issue.priority == IssuePriority.CRITICAL:
            score += 40
            reasoning_parts.append("Critical priority")
        elif issue.priority == IssuePriority.HIGH:
            score += 30
            reasoning_parts.append("High priority")
        elif issue.priority == IssuePriority.MEDIUM:
            score += 15
        else:
            score += 5
        
        # ===== Severity Score =====
        if issue.severity == IssueSeverity.CRITICAL:
            score += 25
            reasoning_parts.append("Critical severity")
        elif issue.severity == IssueSeverity.HIGH:
            score += 15
            reasoning_parts.append("High severity")
        elif issue.severity == IssueSeverity.MEDIUM:
            score += 8
        
        # ===== Status Score =====
        if issue.status == IssueStatus.IN_PROGRESS:
            score += 20
            reasoning_parts.append("In progress (should be completed)")
        elif issue.status == IssueStatus.IN_REVIEW:
            score += 15
            reasoning_parts.append("In review (near completion)")
        else:
            score += 5
        
        # ===== Staleness/Blocked Factor =====
        days_stale = _days_since_update(issue.updated_at)
        if issue.status == IssueStatus.IN_PROGRESS and days_stale > 3:
            score += 20
            reasoning_parts.append(f"Stalled for {days_stale} days (likely blocked)")
        elif days_stale > 7:
            score += 10
            reasoning_parts.append(f"Not updated for {days_stale} days")
        
        # ===== Age Factor =====
        days_created = _days_since_update(issue.created_at)
        if days_created > 14:
            score += 10
            reasoning_parts.append("Long-standing issue")
        
        reasoning = " • ".join(reasoning_parts) if reasoning_parts else "Available for work"
        
        ranked.append(IssueRank(
            issue_id=issue.id,
            title=issue.title,
            priority=issue.priority.value if issue.priority else "unknown",
            severity=issue.severity.value if issue.severity else "unknown",
            status=issue.status.value if issue.status else "unknown",
            rank_score=score,
            action_priority=0,  # Will be set after sorting
            reasoning=reasoning,
        ))
    
    # Sort by score descending
    ranked.sort(key=lambda x: x.rank_score, reverse=True)
    
    # Set action priority (1 = highest)
    for idx, item in enumerate(ranked, 1):
        item.action_priority = idx
    
    return ranked


def generate_ai_recommendation(
    sprint: Sprint,
    issues: List[Issue],
    ranked_issues: List[IssueRank],
    health_score: int,
) -> str:
    """Generate actionable AI recommendation text."""
    
    if not ranked_issues:
        return "No incomplete issues in this sprint. Consider if the sprint is closed or requires additional work."
    
    recommendations = []
    
    # Top 3 actionable items
    for idx, ranked_issue in enumerate(ranked_issues[:3], 1):
        issue = next((i for i in issues if i.id == ranked_issue.issue_id), None)
        if issue:
            action = "Complete first" if idx == 1 else ("Complete second" if idx == 2 else "Complete third")
            recommendations.append(
                f"{idx}. {action} BUG-{issue.id} ({issue.title}) because {ranked_issue.reasoning}."
            )
    
    # General guidance
    if health_score < 60:
        recommendations.append("Sprint is critical — prioritize completion of high-priority issues only.")
    elif health_score < 80:
        recommendations.append("Focus on completing in-progress issues before starting new work.")
    
    time_progress, _ = _calculate_time_progress(sprint)
    if time_progress > 80:
        recommendations.append("Remaining sprint time is limited — defer non-critical work if necessary.")
    
    return "\n".join(recommendations)


def generate_sprint_outlook(
    sprint: Sprint,
    issues: List[Issue],
    health_score: int,
    risks: List[str],
) -> str:
    """Generate sprint outlook summary."""
    
    total = len(issues)
    resolved = len([i for i in issues if i.status == IssueStatus.RESOLVED])
    progress = int((resolved / total) * 100) if total > 0 else 0
    
    if health_score >= 80:
        outlook = f"Sprint is healthy. {progress}% of issues are completed. "
        outlook += "Continue at current pace to meet sprint goals."
    elif health_score >= 60:
        outlook = f"Sprint is at risk. {progress}% of issues are completed. "
        if risks:
            outlook += f"Main concerns: {risks[0].lower()}. "
        outlook += "Prioritize in-progress issues and defer lower-priority work."
    else:
        outlook = f"Sprint is critical. {progress}% of issues are completed. "
        outlook += "Focus on resolving blockers and completing high-priority issues immediately."
    
    return outlook


# ===== HELPERS =====

def _calculate_time_progress(sprint: Sprint) -> Tuple[int, int]:
    """
    Calculate how much of the sprint time has elapsed.
    
    Returns: (time_progress%, factor_score)
    """
    
    if not sprint.start_date or not sprint.end_date:
        return 0, 10  # No dates, assume early in sprint
    
    now = datetime.now().date()
    start = sprint.start_date
    end = sprint.end_date
    
    if now < start:
        return 0, 20  # Sprint hasn't started
    
    if now >= end:
        return 100, 0  # Sprint is over
    
    total_days = (end - start).days + 1
    elapsed_days = (now - start).days
    time_progress = int((elapsed_days / total_days) * 100)
    
    # Score: <60% elapsed = 20pts, 60-79% = 10pts, 80%+ = 0pts
    if time_progress < 60:
        factor_score = 20
    elif time_progress < 80:
        factor_score = 10
    else:
        factor_score = 0
    
    return time_progress, factor_score


def _calculate_scope_change_factor(sprint: Sprint, issues: List[Issue]) -> int:
    """Estimate scope changes based on issue creation dates."""
    
    if not sprint.start_date or not issues:
        return 15
    
    created_after_start = len([
        i for i in issues
        if i.created_at and i.created_at.date() > sprint.start_date
    ])
    
    # More issues added = lower score
    if created_after_start == 0:
        return 20
    elif created_after_start <= 2:
        return 15
    elif created_after_start <= 5:
        return 10
    else:
        return 5


def _days_since_update(dt) -> int:
    """Calculate days since a datetime."""
    if not dt:
        return 0
    
    if hasattr(dt, 'date'):
        # datetime object
        dt = dt.date()
    
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt).date()
        except:
            return 0
    
    now = datetime.now().date()
    return (now - dt).days