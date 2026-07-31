from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class SprintCreate(BaseModel):
    name: str
    project_id: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class SprintOut(BaseModel):
    id: int
    name: str
    project_id: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True
