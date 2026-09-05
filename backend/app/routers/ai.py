"""
AI-powered analysis endpoints.

Includes: Sprint Health AI, Issue Classification, Resolution Assistance, etc.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.core.permissions import Permission, require_permission
from app.models.sprint import Sprint
from app.models.issue import Issue, IssueStatus
from app.models.project import Project
from app.models.user import User
from app.schemas.sprint_health import SprintHealthAnalysis, HealthScoreSummary
from app.ai.sprint_health import (
    calculate_health_score,
    identify_risks,
    rank_incomplete_issues,
    generate_ai_recommendation,
    generate_sprint_outlook,
)

# ===== ROUTER DEFINITION =====
router = APIRouter(prefix="/ai", tags=["ai"])


# ===== ENDPOINTS =====

@router.post("/sprint-health/{sprint_id}", response_model=SprintHealthAnalysis)
def analyze_sprint_health(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ISSUES)),
):
    """
    Analyze sprint health and get AI-powered recommendations.
    
    - Calculates health score (0-100)
    - Identifies risks
    - Ranks incomplete issues
    - Generates actionable recommendations
    """
    
    try:
        # Fetch sprint
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            raise HTTPException(
                status_code=404,
                detail="Sprint not found"
            )
        
        # Fetch project for name
        project = db.query(Project).filter(
            Project.id == sprint.project_id
        ).first()
        project_name = project.name if project else "Unknown Project"
        
        # Fetch all issues in sprint
        issues = db.query(Issue).filter(
            Issue.sprint_id == sprint_id
        ).all()
        
        # Calculate metrics
        health_score, health_status, breakdown = calculate_health_score(
            sprint,
            issues
        )
        
        # Identify risks
        risks = identify_risks(sprint, issues, health_score)
        
        # Rank incomplete issues
        ranked_issues = rank_incomplete_issues(issues)
        
        # Generate recommendations
        ai_recommendation = generate_ai_recommendation(
            sprint,
            issues,
            ranked_issues,
            health_score
        )
        sprint_outlook = generate_sprint_outlook(
            sprint,
            issues,
            health_score,
            risks
        )
        
        # Build summary
        resolved_count = len([
            i for i in issues
            if i.status == IssueStatus.RESOLVED
        ])
        in_progress_count = len([
            i for i in issues
            if i.status == IssueStatus.IN_PROGRESS
        ])
        in_review_count = len([
            i for i in issues
            if i.status == IssueStatus.IN_REVIEW
        ])
        open_count = len([
            i for i in issues
            if i.status == IssueStatus.OPEN
        ])
        
        blocked_count = 0
        for issue in issues:
            if issue.status == IssueStatus.IN_PROGRESS:
                if issue.updated_at:
                    days_diff = (
                        datetime.now().date() - issue.updated_at.date()
                    ).days
                    if days_diff > 3:
                        blocked_count += 1
        
        high_priority_incomplete = len([
            i for i in issues
            if i.status != IssueStatus.RESOLVED
            and i.priority and i.priority.value in ["critical", "high"]
        ])
        
        scope_additions = 0
        if sprint.start_date:
            scope_additions = len([
                i for i in issues
                if i.created_at
                and i.created_at.date() > sprint.start_date
            ])
        
        summary = HealthScoreSummary(
            sprint_progress=breakdown.sprint_progress,
            time_progress=breakdown.time_progress,
            total_issues=len(issues),
            completed_issues=resolved_count,
            in_progress_issues=in_progress_count,
            open_issues=open_count,
            blocked_issues=blocked_count,
            high_priority_incomplete=high_priority_incomplete,
            scope_additions=scope_additions,
        )
        
        # Convert ranked issues to dict format for response
        ranked_issues_response = [
            {
                "issue_id": issue.issue_id,
                "title": issue.title,
                "priority": issue.priority,
                "severity": issue.severity,
                "status": issue.status,
                "action_priority": issue.action_priority,
                "reasoning": issue.reasoning,
            }
            for issue in ranked_issues[:5]  # Top 5 issues
        ]
        
        return SprintHealthAnalysis(
            sprint_id=sprint_id,
            sprint_name=sprint.name,
            project_name=project_name,
            health_score=health_score,
            health_status=health_status,
            summary=summary,
            risks=risks,
            ranked_incomplete_issues=ranked_issues_response,
            ai_recommendation=ai_recommendation,
            sprint_outlook=sprint_outlook,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error analyzing sprint health: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze sprint health: {str(e)}"
        )