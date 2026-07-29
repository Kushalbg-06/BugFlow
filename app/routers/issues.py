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

    return None