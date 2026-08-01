from pydantic import BaseModel
from datetime import datetime

class AttachmentOut(BaseModel):
    id: int
    issue_id: int
    uploaded_by: int
    filename: str
    content_type: str | None = None
    size_bytes: int
    created_at: datetime

    class Config:
        from_attributes = True
