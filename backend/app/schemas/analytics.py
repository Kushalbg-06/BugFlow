from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class SummaryDelta(BaseModel):
    value: float          
    direction: str         

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
    label: str             
    count: int
    percentage: float      

class TrendPoint(BaseModel):
    date: str                
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
    workload_percentage: float   


class RecentDefect(BaseModel):
    key: str                
    title: str
    project_name: str
    severity: str
    status: str
    assignee_name: Optional[str]
    created_at: datetime
    resolution_days: Optional[float]   