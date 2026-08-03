"""
issue state transition logic.
Open -> In Progress -> In Review -> Resolved, with Resolved able to reopen
back to Open, and In Review able to bounce back to In Progress if review
finds more work needed.
"""
from app.models.issue import IssueStatus

ALLOWED_TRANSITIONS = {
    IssueStatus.OPEN: {IssueStatus.IN_PROGRESS},
    IssueStatus.IN_PROGRESS: {IssueStatus.IN_REVIEW, IssueStatus.OPEN},
    IssueStatus.IN_REVIEW: {IssueStatus.RESOLVED, IssueStatus.IN_PROGRESS},
    IssueStatus.RESOLVED: {IssueStatus.OPEN},
}

def is_valid_transition(current: IssueStatus, new: IssueStatus) -> bool:
    if current == new:
        return True
    return new in ALLOWED_TRANSITIONS.get(current, set())
