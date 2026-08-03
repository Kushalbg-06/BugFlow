from pydantic import BaseModel
from datetime import datetime

class CommentCreate(BaseModel):
    content: str

class CommentOut(BaseModel):
    id: int
    issue_id: int
    author_id: int
    author_username: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
