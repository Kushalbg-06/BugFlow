"""
Sprint Health AI Response Schemas
"""

from pydantic import BaseModel
from typing import List, Optional


class IssueForHealth(BaseModel):
    """Issue details for sprint health analysis."""
    id: int
    title: str
    priority: str
    severity: str
    status: str
    created_at: str
    updated_at: Optional[str] = None


class RankedIssue(BaseModel):
    """Ranked incomplete issue."""
    issue_id: int
    title: str
    priority: str
    severity: str
    status: str
    action_priority: int
    reasoning: str


class HealthScoreSummary(BaseModel):
    """Sprint summary metrics."""
    sprint_progress: int
    time_progress: int
    total_issues: int
    completed_issues: int
    in_progress_issues: int
    open_issues: int
    blocked_issues: int
    high_priority_incomplete: int
    scope_additions: int


class SprintHealthAnalysis(BaseModel):
    """Complete sprint health AI analysis."""
    sprint_id: int
    sprint_name: str
    project_name: str
    
    health_score: int  # 0-100
    health_status: str  # 🟢 Healthy, 🟡 At Risk, 🔴 Critical
    
    summary: HealthScoreSummary
    
    risks: List[str]
    ranked_incomplete_issues: List[RankedIssue]
    
    ai_recommendation: str
    sprint_outlook: str


class HealthScoreRefreshRequest(BaseModel):
    """Request to refresh health analysis."""
    sprint_id: int