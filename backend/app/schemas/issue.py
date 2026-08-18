from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.issue import IssuePriority, IssueSeverity, IssueStatus

class IssueCreate(BaseModel):
    title: str
    description: str
    severity: IssueSeverity = IssueSeverity.MEDIUM
    priority: IssuePriority = IssuePriority.MEDIUM
    project_id: int
    sprint_id: Optional[int] = None
    assignee_id: Optional[int] = None
    generate_report: bool = True
    category: Optional[str] = None
    component: Optional[str] = None
    defect_type: Optional[str] = None

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[IssueSeverity] = None
    priority: Optional[IssuePriority] = None
    status: Optional[IssueStatus] = None
    sprint_id: Optional[int] = None
    assignee_id: Optional[int] = None
    category: Optional[str] = None
    component: Optional[str] = None
    defect_type: Optional[str] = None

class IssueOut(BaseModel):
    id: int
    title: str
    description: str
    severity: IssueSeverity
    priority: IssuePriority
    status: IssueStatus
    category: Optional[str] = None
    component: Optional[str] = None
    defect_type: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_steps_to_reproduce: Optional[str] = None
    ai_expected_result: Optional[str] = None
    ai_actual_result: Optional[str] = None
    ai_environment: Optional[str] = None
    ai_root_cause: Optional[str] = None
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

class ReportPreview(BaseModel):
    category: str
    summary: str
    steps_to_reproduce: str
    expected_result: str
    actual_result: str
    environment: str
    root_cause: str

class ClassificationSuggestion(BaseModel):
    category: str
    module: str
    defect_type: str
    severity: str
    priority: str
    cleaned_description: str

class Hypothesis(BaseModel):
    hypothesis: str
    confidence: int

class InvestigationArea(BaseModel):
    area: str
    detail: str

class CodeAreas(BaseModel):
    frontend: list[str] = []
    backend: list[str] = []
    api: list[str] = []

class DebugStep(BaseModel):
    step: str
    detail: str

class DetectedMismatch(BaseModel):
    expected: str
    actual: str
    likely_issue: str

class ResolutionAssistance(BaseModel):
    root_cause_hypotheses: list[Hypothesis]
    investigation_areas: list[InvestigationArea]
    suggested_code_areas: CodeAreas
    debugging_steps: list[DebugStep]
    detected_mismatch: Optional[DetectedMismatch] = None
    similar_defects: list[DuplicateMatch]
    previous_resolution: Optional[str] = None
    possible_resolution: str
    confidence_score: int
    impact_area: list[str]
    estimated_effort: str
    verification_checklist: list[str]