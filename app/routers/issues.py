from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.issue import Issue
from app.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueResponse,
)

router = APIRouter()


@router.post("/", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
def create_issue(issue: IssueCreate, db: Session = Depends(get_db)):
    new_issue = Issue(
        title=issue.title,
        description=issue.description,
        severity=issue.severity,
        project_id=issue.project_id,
        assigned_to=issue.assigned_to,
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    return new_issue


@router.get("/", response_model=list[IssueResponse])
def get_issues(db: Session = Depends(get_db)):
    return db.query(Issue).all()


@router.get("/{issue_id}", response_model=IssueResponse)
def get_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    return issue


@router.put("/{issue_id}", response_model=IssueResponse)
def update_issue(
    issue_id: int,
    issue_data: IssueUpdate,
    db: Session = Depends(get_db),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    update_data = issue_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(issue, key, value)

    db.commit()
    db.refresh(issue)

    return issue


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    db.delete(issue)
    db.commit()

    return Nonefrom fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.state_machine import is_valid_transition
from app.ai.report_generator import generate_report
from app.ai.triage import suggest_priority
from app.ai.duplicates import find_possible_duplicates
from app.services.activity import log_activity
from app.models.issue import Issue, IssueStatus
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.user import User, UserRole
from app.schemas.issue import IssueCreate, IssueUpdate, IssueOut, DuplicateCheckRequest, DuplicateMatch, PrioritySuggestion, PrioritySuggestRequest

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
        priority=payload.priority,
        project_id=payload.project_id,
        sprint_id=payload.sprint_id,
        assignee_id=payload.assignee_id,
        reporter_id=current_user.id,
    )

    if payload.generate_report:
        report = generate_report(payload.title, payload.description)
        issue.category = report["category"]
        issue.ai_steps_to_reproduce = report["ai_steps_to_reproduce"]
        issue.ai_expected_result = report["ai_expected_result"]
        issue.ai_actual_result = report["ai_actual_result"]

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
    report = generate_report(issue.title, issue.description)
    issue.category = report["category"]
    issue.ai_steps_to_reproduce = report["ai_steps_to_reproduce"]
    issue.ai_expected_result = report["ai_expected_result"]
    issue.ai_actual_result = report["ai_actual_result"]
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
