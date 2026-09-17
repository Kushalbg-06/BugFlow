from pydantic import BaseModel
from typing import List, Optional


class IssueForHealth(BaseModel):
    id: int
    title: str
    priority: str
    severity: str
    status: str
    created_at: str
    updated_at: Optional[str] = None


class RankedIssue(BaseModel):
    issue_id: int
    title: str
    priority: str
    severity: str
    status: str
    action_priority: int
    reasoning: str


class HealthScoreSummary(BaseModel):
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
    sprint_id: int
    sprint_name: str
    project_name: str
    
    health_score: int  
    health_status: str  
    
    summary: HealthScoreSummary
    
    risks: List[str]
    ranked_incomplete_issues: List[RankedIssue]
    
    ai_recommendation: str
    sprint_outlook: str


class HealthScoreRefreshRequest(BaseModel):
    sprint_id: int