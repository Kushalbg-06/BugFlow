"""
Response schemas for the /analytics endpoints.
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class SummaryDelta(BaseModel):
    value: float          # e.g. 12.5  -> shown as "12.5%"
    direction: str         # "up" | "down"


class AnalyticsSummary(BaseModel):
    total_defects: int
    open_defects: int
    resolved_defects: int
    closed_defects: int
    avg_resolution_days: float

    total_delta: SummaryDelta
    open_delta: SummaryDelta
    resolved_delta: SummaryDelta
    closed_delta: SummaryDelta
    avg_resolution_delta: SummaryDelta


class BreakdownItem(BaseModel):
    label: str              # "Critical", "UI / UX", "Open", etc.
    count: int
    percentage: float       # 0-100, rounded to 1 decimal


class TrendPoint(BaseModel):
    date: str                # "Aug 12" (already formatted) or ISO date
    total: int
    open: int
    resolved: int
    closed: int


class DeveloperWorkload(BaseModel):
    developer_id: int
    developer_name: str
    open_count: int
    in_progress_count: int
    resolved_count: int
    workload_percentage: float   # 0-100, relative to the busiest developer


class RecentDefect(BaseModel):
    key: str                 # "BUG-642"
    title: str
    project_name: str
    severity: str
    status: str
    assignee_name: Optional[str]
    created_at: datetime
    resolution_days: Optional[float]   # None if not resolved yet