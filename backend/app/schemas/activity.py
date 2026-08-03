from pydantic import BaseModel
from datetime import datetime

class ActivityOut(BaseModel):
    id: int
    issue_id: int
    user_id: int
    username: str
    action: str
    detail: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
