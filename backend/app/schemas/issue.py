from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.issue import IssuePriority, IssueStatus

class IssueCreate(BaseModel):
    title: str
    description: str
    priority: IssuePriority = IssuePriority.MEDIUM
    project_id: int
    sprint_id: Optional[int] = None
    assignee_id: Optional[int] = None
    generate_report: bool = True

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[IssuePriority] = None
    status: Optional[IssueStatus] = None
    sprint_id: Optional[int] = None
    assignee_id: Optional[int] = None

class IssueOut(BaseModel):
    id: int
    title: str
    description: str
    priority: IssuePriority
    status: IssueStatus
    category: Optional[str] = None
    ai_steps_to_reproduce: Optional[str] = None
    ai_expected_result: Optional[str] = None
    ai_actual_result: Optional[str] = None
    project_id: int
    sprint_id: Optional[int] = None
    reporter_id: int
    assignee_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PrioritySuggestRequest(BaseModel):
    title: str
    description: str

class DuplicateCheckRequest(BaseModel):
    title: str
    description: str
    project_id: int

class DuplicateMatch(BaseModel):
    issue_id: int
    title: str
    similarity: float

class PrioritySuggestion(BaseModel):
    suggested_priority: IssuePriority
