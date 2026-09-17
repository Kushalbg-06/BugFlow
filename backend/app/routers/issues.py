from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import Permission, require_permission, has_permission
from app.core.state_machine import is_valid_transition
from app.ai.report_generator import generate_report, AIReportError
from app.ai.triage import suggest_priority
from app.ai.duplicates import find_possible_duplicates
from app.services.activity import log_activity
from app.services.notification_service import notify_event
from app.models.issue import Issue, IssueStatus
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.user import User, UserRole
from app.schemas.issue import IssueCreate, IssueUpdate, IssueOut, DuplicateCheckRequest, DuplicateMatch, PrioritySuggestion, PrioritySuggestRequest, ReportPreview
from app.ai.classifier import suggest_classification
from app.schemas.issue import ClassificationSuggestion
from app.ai.resolution import get_resolution_assistance
from app.schemas.issue import ResolutionAssistance
from app.ai.developer_recommendation import get_developer_recommendations
from app.schemas.issue import DeveloperRecommendations, DeveloperRecommendation
from app.ai.test_case_generator import generate_test_cases
from app.schemas.test_case import GeneratedTestCase, TestCaseOut, SaveTestCasesRequest
from app.models.test_case import TestCase
from app.ai.rag_indexing import index_issue_if_relevant

router = APIRouter(prefix="/issues", tags=["issues"])

@router.post("/suggest-priority", response_model=PrioritySuggestion)
def suggest_issue_priority(
    payload: PrioritySuggestRequest,
    current_user: User = Depends(require_permission(Permission.CREATE_ISSUE)),
):
    return PrioritySuggestion(suggested_priority=suggest_priority(payload.title, payload.description))

@router.post("/check-duplicates", response_model=List[DuplicateMatch])
def check_duplicates(
    payload: DuplicateCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CREATE_ISSUE)),
):
    candidates = db.query(Issue).filter(Issue.project_id == payload.project_id, Issue.status != IssueStatus.RESOLVED).all()
    return find_possible_duplicates(payload.title, payload.description, candidates)

@router.post("", response_model=IssueOut, status_code=status.HTTP_201_CREATED)
def create_issue(
    payload: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CREATE_ISSUE)),
):
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

    # Fires after commit/refresh so issue.id is a real value, not None —
    # this was the cause of the blank notification.
    notify_event(
        db,
        "issue_created",
        issue=issue,
        actor_id=current_user.id,
        message=issue.title,
        link=f"/issues/{issue.id}",
    )
    if issue.priority.value.lower() == "critical":
        notify_event(
            db,
            "critical_issue_created",
            issue=issue,
            actor_id=current_user.id,
            message=issue.title,
            link=f"/issues/{issue.id}",
        )

    return issue

@router.post("/{issue_id}/generate-report", response_model=IssueOut)
def generate_issue_report(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.EDIT_ISSUE)),
):
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
    index_issue_if_relevant(db, issue)
    return issue

@router.get("", response_model=List[IssueOut])
def list_issues(
    project_id: Optional[int] = None,
    sprint_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ISSUES)),
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
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ISSUES)),
):
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

    updates = payload.model_dump(exclude_unset=True)

    # Reassignment requires ASSIGN_ISSUE (Admin + Manager only).
    if "assignee_id" in updates and updates["assignee_id"] != issue.assignee_id:
        if not has_permission(current_user.role, Permission.ASSIGN_ISSUE):
            raise HTTPException(status_code=403, detail="Not permitted to reassign issues")

    # Capture "before" state for anything that needs to compare old vs.
    # new, or that needs to fire a notification once the change is
    # actually committed (notify_event needs the NEW values, so those
    # calls happen after commit/refresh below, not here).
    old_status = issue.status
    new_status = payload.status
    status_changing = new_status is not None and new_status != old_status

    priority_changing = payload.priority is not None and payload.priority != issue.priority

    sprint_target = None
    sprint_changing = payload.sprint_id is not None and payload.sprint_id != issue.sprint_id

    assignee_changing = payload.assignee_id is not None and payload.assignee_id != issue.assignee_id

    # Status transitions require CHANGE_STATUS.
    if status_changing:
        if not has_permission(current_user.role, Permission.CHANGE_STATUS):
            raise HTTPException(status_code=403, detail="Not permitted to change issue status")
        if not is_valid_transition(issue.status, payload.status):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot move issue from '{issue.status.value}' to '{payload.status.value}'",
            )
        log_activity(db, issue.id, current_user.id, "status_changed", f"{issue.status.value} → {payload.status.value}")

    # Any other field edit (priority, severity, sprint, category, etc.) requires EDIT_ISSUE.
    other_fields = set(updates.keys()) - {"assignee_id", "status"}
    if other_fields and not has_permission(current_user.role, Permission.EDIT_ISSUE):
        raise HTTPException(status_code=403, detail="Not permitted to edit this issue")

    if priority_changing:
        log_activity(db, issue.id, current_user.id, "priority_changed", f"{issue.priority.value} → {payload.priority.value}")

    if sprint_changing:
        sprint_target = db.query(Sprint).filter(Sprint.id == payload.sprint_id, Sprint.project_id == issue.project_id).first()
        if not sprint_target:
            raise HTTPException(status_code=404, detail="Sprint not found for this project")
        log_activity(db, issue.id, current_user.id, "sprint_assigned", f"Assigned to sprint '{sprint_target.name}'")

    if assignee_changing:
        log_activity(db, issue.id, current_user.id, "assignee_changed", None)

    for field, value in updates.items():
        setattr(issue, field, value)

    db.commit()
    db.refresh(issue)
    index_issue_if_relevant(db, issue)

    # Notifications fire down here, after commit/refresh, so `issue`
    # reflects the NEW status/priority/sprint/assignee — not the stale
    # pre-update values.
    if status_changing:
        if old_status == IssueStatus.RESOLVED and issue.status != IssueStatus.RESOLVED:
            notify_event(db, "issue_reopened", issue=issue, actor_id=current_user.id,
                         link=f"/issues/{issue.id}")
        elif issue.status == IssueStatus.IN_REVIEW:
            notify_event(db, "issue_moved_to_review", issue=issue, actor_id=current_user.id,
                         link=f"/issues/{issue.id}")
        elif issue.status == IssueStatus.RESOLVED:
            notify_event(db, "issue_resolved", issue=issue, actor_id=current_user.id,
                         link=f"/issues/{issue.id}")
        else:
            notify_event(db, "issue_status_changed", issue=issue, actor_id=current_user.id,
                         link=f"/issues/{issue.id}")

    if priority_changing:
        notify_event(db, "issue_priority_changed", issue=issue, actor_id=current_user.id,
                     link=f"/issues/{issue.id}")

    if sprint_changing and sprint_target is not None:
        notify_event(db, "sprint_assigned", issue=issue, sprint=sprint_target,
                     actor_id=current_user.id, link=f"/sprints/{sprint_target.id}")

    if assignee_changing:
        notify_event(db, "issue_assigned", issue=issue, actor_id=current_user.id,
                     link=f"/issues/{issue.id}")

    return issue

@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DELETE_ISSUE)),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    db.delete(issue)
    db.commit()

@router.post("/preview-report", response_model=ReportPreview)
def preview_report(
    payload: PrioritySuggestRequest,
    current_user: User = Depends(require_permission(Permission.CREATE_ISSUE)),
):
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
def classify_issue(
    payload: PrioritySuggestRequest,
    current_user: User = Depends(require_permission(Permission.CREATE_ISSUE)),
):
    return ClassificationSuggestion(**suggest_classification(payload.title, payload.description))

@router.get("/{issue_id}/resolution-assistant", response_model=ResolutionAssistance)
def resolution_assistant(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AI_RESOLUTION)),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    candidates = db.query(Issue).filter(Issue.project_id == issue.project_id, Issue.id != issue.id).all()
    return get_resolution_assistance(issue, candidates)

@router.get("/{issue_id}/developer-recommendations", response_model=DeveloperRecommendations)
def developer_recommendations(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AI_DEVELOPER_RECOMMENDATION)),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Only recommend users with the Developer role — exclude Admin, Manager, QA, Reporter
    all_users = (
        db.query(User)
        .options(joinedload(User.skills))
        .filter(User.role == UserRole.DEVELOPER)
        .all()
    )

    for user in all_users:
        user._active_issues_count = (
            db.query(Issue)
            .filter(Issue.assignee_id == user.id, Issue.status != IssueStatus.RESOLVED)
            .count()
        )

    similar_q = (
        db.query(Issue.assignee_id, func.count(Issue.id))
        .filter(Issue.status == IssueStatus.RESOLVED, Issue.assignee_id.isnot(None))
    )
    if issue.category:
        similar_q = similar_q.filter(Issue.category == issue.category)
    elif issue.component:
        similar_q = similar_q.filter(Issue.component == issue.component)
    similar_counts = {uid: count for uid, count in similar_q.group_by(Issue.assignee_id).all()}

    matches = get_developer_recommendations(issue, all_users, similar_resolved_counts=similar_counts)

    if not matches:
        return DeveloperRecommendations(best_match=None, other_recommendations=[])

    best, *rest = matches
    return DeveloperRecommendations(
        best_match=DeveloperRecommendation(**best.__dict__),
        other_recommendations=[DeveloperRecommendation(**m.__dict__) for m in rest],
    )

@router.get("/{issue_id}/generate-test-cases", response_model=List[GeneratedTestCase])
def generate_issue_test_cases(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AI_RESOLUTION)),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return generate_test_cases(issue)


@router.get("/{issue_id}/test-cases", response_model=List[TestCaseOut])
def list_issue_test_cases(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ISSUES)),
):
    return db.query(TestCase).filter(TestCase.issue_id == issue_id).order_by(TestCase.id).all()


@router.post("/{issue_id}/test-cases", response_model=List[TestCaseOut], status_code=status.HTTP_201_CREATED)
def save_issue_test_cases(
    issue_id: int,
    payload: SaveTestCasesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.EDIT_ISSUE)),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    created = []
    for tc in payload.test_cases:
        row = TestCase(issue_id=issue_id, title=tc.title, expected_result=tc.expected_result, priority=tc.priority)
        db.add(row)
        created.append(row)

    log_activity(db, issue.id, current_user.id, "test_cases_added", f"{len(created)} AI-generated test case(s) added")
    db.commit()
    for row in created:
        db.refresh(row)
    index_issue_if_relevant(db, issue)
    return created