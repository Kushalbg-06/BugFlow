from pydantic import BaseModel
from datetime import datetime
from typing import List


class GeneratedTestCase(BaseModel):
    title: str
    expected_result: str
    priority: str  # "high" | "medium" | "low"


class TestCaseOut(BaseModel):
    id: int
    issue_id: int
    title: str
    expected_result: str
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True


class SaveTestCasesRequest(BaseModel):
    test_cases: List[GeneratedTestCase]