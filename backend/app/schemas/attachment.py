from pydantic import BaseModel
from datetime import datetime
from app.models import attachment

class AttachmentOut(BaseModel):
    id: int
    issue_id: int
    filename: str
    content_type: str
    size_bytes: int
    uploaded_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

    class Config:
        from_attributes = True