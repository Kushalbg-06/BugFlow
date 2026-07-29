from enum import Enum

from pydantic import BaseModel, ConfigDict


class IssueStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class IssueSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IssueCreate(BaseModel):
    title: str
    description: str
    severity: IssueSeverity = IssueSeverity.MEDIUM
    project_id: int
    assigned_to: int | None = None


class IssueUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: IssueStatus | None = None
    severity: IssueSeverity | None = None
    assigned_to: int | None = None


class IssueResponse(BaseModel):
    id: int
    title: str
    description: str
    status: IssueStatus
    severity: IssueSeverity
    project_id: int
    reporter_id: int
    assigned_to: int | None

    model_config = ConfigDict(from_attributes=True)