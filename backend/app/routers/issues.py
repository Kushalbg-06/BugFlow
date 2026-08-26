from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.state_machine import is_valid_transition
from app.ai.report_generator import generate_report, AIReportError
from app.ai.triage import suggest_priority
from app.ai.duplicates import find_possible_duplicates
from app.services.activity import log_activity
from app.models.issue import Issue, IssueStatus
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.user import User, UserRole
from app.schemas.issue import IssueCreate, IssueUpdate, IssueOut, DuplicateCheckRequest, DuplicateMatch, PrioritySuggestion, PrioritySuggestRequest, ReportPreview
from app.ai.classifier import suggest_classification
from app.schemas.issue import ClassificationSuggestion
from app.ai.resolution import get_resolution_assistance
from app.schemas.issue import ResolutionAssistance

router = APIRouter(prefix="/issues", tags=["issues"])

@router.post("/suggest-priority", response_model=PrioritySuggestion)
def suggest_issue_priority(payload: PrioritySuggestRequest, current_user: User = Depends(get_current_user)):
    return PrioritySuggestion(suggested_priority=suggest_priority(payload.title, payload.description))

@router.post("/check-duplicates", response_model=List[DuplicateMatch])
def check_duplicates(payload: DuplicateCheckRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    candidates = db.query(Issue).filter(Issue.project_id == payload.project_id, Issue.status != IssueStatus.RESOLVED).all()
    return find_possible_duplicates(payload.title, payload.description, candidates)

@router.post("", response_model=IssueOut, status_code=status.HTTP_201_CREATED)
def create_issue(payload: IssueCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.sprint_id is not None:
        sprint = db.query(Sprint).filter(Sprint.id == payload.sprint_id, Sprint.project_id == payload.project_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found for this project")

    issue = Issue(
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        priority=payload.priority,
        project_id=payload.project_id,
        sprint_id=payload.sprint_id,
        assignee_id=payload.assignee_id,
        reporter_id=current_user.id,
        category=payload.category,
        component=payload.component,
        defect_type=payload.defect_type,
    )

    if payload.generate_report:
        try:
            report = generate_report(payload.title, payload.description)
        except AIReportError as exc:
            raise HTTPException(status_code=502, detail=str(exc))
        if not issue.category:
            issue.category = report["category"]
        issue.ai_summary = report["ai_summary"]
        issue.ai_steps_to_reproduce = report["ai_steps_to_reproduce"]
        issue.ai_expected_result = report["ai_expected_result"]
        issue.ai_actual_result = report["ai_actual_result"]
        issue.ai_environment = report["ai_environment"]
        issue.ai_root_cause = report["ai_root_cause"]

    # Fallback to keyword classification for any missing fields
    if not issue.category or not issue.component or not issue.defect_type:
        suggestions = suggest_classification(payload.title, payload.description)
        if not issue.category:
            issue.category = suggestions["category"]
        if not issue.component:
            issue.component = suggestions["module"]
        if not issue.defect_type:
            issue.defect_type = suggestions["defect_type"]
       
    db.add(issue)
    db.flush()
    log_activity(db, issue.id, current_user.id, "created", f"Issue reported with priority {issue.priority.value}")
    db.commit()
    db.refresh(issue)
    return issue

@router.post("/{issue_id}/generate-report", response_model=IssueOut)
def generate_issue_report(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    try:
        report = generate_report(issue.title, issue.description)
    except AIReportError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    issue.category = report["category"]
    issue.ai_summary = report["ai_summary"]
    issue.ai_steps_to_reproduce = report["ai_steps_to_reproduce"]
    issue.ai_expected_result = report["ai_expected_result"]
    issue.ai_actual_result = report["ai_actual_result"]
    issue.ai_environment = report["ai_environment"]
    issue.ai_root_cause = report["ai_root_cause"]
    
    log_activity(db, issue.id, current_user.id, "ai_report_regenerated", None)
    db.commit()
    db.refresh(issue)
    return issue

@router.get("", response_model=List[IssueOut])
def list_issues(
    project_id: Optional[int] = None,
    sprint_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Issue)
    if project_id:
        query = query.filter(Issue.project_id == project_id)
    if sprint_id:
        query = query.filter(Issue.sprint_id == sprint_id)
    if status_filter:
        query = query.filter(Issue.status == status_filter)
    return query.order_by(Issue.created_at.desc()).all()

@router.get("/{issue_id}", response_model=IssueOut)
def get_issue(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue

@router.put("/{issue_id}", response_model=IssueOut)
def update_issue(
    issue_id: int,
    payload: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if payload.assignee_id is not None and current_user.role not in (UserRole.ADMIN, UserRole.DEVELOPER):
        raise HTTPException(status_code=403, detail="Not permitted to reassign issues")

    if payload.status is not None and payload.status != issue.status:
        if not is_valid_transition(issue.status, payload.status):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot move issue from '{issue.status.value}' to '{payload.status.value}'",
            )
        log_activity(db, issue.id, current_user.id, "status_changed", f"{issue.status.value} → {payload.status.value}")

    if payload.priority is not None and payload.priority != issue.priority:
        log_activity(db, issue.id, current_user.id, "priority_changed", f"{issue.priority.value} → {payload.priority.value}")

    if payload.sprint_id is not None and payload.sprint_id != issue.sprint_id:
        sprint = db.query(Sprint).filter(Sprint.id == payload.sprint_id, Sprint.project_id == issue.project_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found for this project")
        log_activity(db, issue.id, current_user.id, "sprint_assigned", f"Assigned to sprint '{sprint.name}'")

    if payload.assignee_id is not None and payload.assignee_id != issue.assignee_id:
        log_activity(db, issue.id, current_user.id, "assignee_changed", None)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(issue, field, value)

    db.commit()
    db.refresh(issue)
    return issue

@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    db.delete(issue)
    db.commit()

@router.post("/preview-report", response_model=ReportPreview)
def preview_report(payload: PrioritySuggestRequest, current_user: User = Depends(get_current_user)):
    """Generate an AI report from a title/description without saving an issue.
    Used by the Create Issue form to expand a short description before submission."""
    try:
        report = generate_report(payload.title, payload.description)
    except AIReportError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return ReportPreview(
        category=report["category"],
        summary=report["ai_summary"],
        steps_to_reproduce=report["ai_steps_to_reproduce"],
        expected_result=report["ai_expected_result"],
        actual_result=report["ai_actual_result"],
        environment=report["ai_environment"],
        root_cause=report["ai_root_cause"],
    )
@router.post("/classify", response_model=ClassificationSuggestion)
def classify_issue(payload: PrioritySuggestRequest, current_user: User = Depends(get_current_user)):
    return ClassificationSuggestion(**suggest_classification(payload.title, payload.description))

@router.get("/{issue_id}/resolution-assistant", response_model=ResolutionAssistance)
def resolution_assistant(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    candidates = db.query(Issue).filter(Issue.project_id == issue.project_id, Issue.id != issue.id).all()
    return get_resolution_assistance(issue, candidates)