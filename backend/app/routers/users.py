from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.issue import Issue, IssueStatus
from app.models.comment import Comment
from app.schemas.user import (
    UserOut, UserCreate, UserProfile, UserProfileUpdate,
    UserStats, UserProfileWithStats
)

router = APIRouter(prefix="/users", tags=["users"])

# ==================== GET ENDPOINTS ====================

@router.get("/me", response_model=UserProfile)
def read_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile."""
    return current_user

@router.get("/me/stats", response_model=UserStats)
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's statistics (issues, comments, etc.)."""
    # Issues created by user
    issues_created = db.query(Issue).filter(
        Issue.reporter_id == current_user.id
    ).count()
    
    # Issues resolved by user (as reporter)
    issues_resolved = db.query(Issue).filter(
        Issue.reporter_id == current_user.id,
        Issue.status == IssueStatus.RESOLVED
    ).count()
    
    # Issues assigned to user
    issues_assigned = db.query(Issue).filter(
        Issue.assignee_id == current_user.id
    ).count()
    
    # Comments by user
    total_comments = db.query(Comment).filter(
        Comment.author_id == current_user.id
    ).count()
    
    return UserStats(
        user_id=current_user.id,
        issues_created=issues_created,
        issues_resolved=issues_resolved,
        issues_assigned=issues_assigned,
        total_comments=total_comments,
        member_since=current_user.created_at
    )

@router.get("/me/full", response_model=UserProfileWithStats)
def get_profile_with_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile with statistics."""
    # Get stats
    stats_response = get_user_stats(current_user, db)
    
    # Return combined response
    return UserProfileWithStats(
        profile=UserProfile.from_orm(current_user),
        stats=stats_response
    )

@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all users (developers/team members)."""
    return db.query(User).all()

@router.get("/{user_id}", response_model=UserProfile)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific user's profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ==================== UPDATE ENDPOINTS ====================

@router.patch("/me", response_model=UserProfile)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile."""
    # Update fields that are provided
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    
    if payload.email is not None:
        # Check if email is already taken
        existing = db.query(User).filter(
            User.email == payload.email,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Email already in use"
            )
        current_user.email = payload.email
    
    if payload.bio is not None:
        current_user.bio = payload.bio
    
    # Update timestamp
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.patch("/{user_id}/last-active", status_code=204)
def update_last_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's last active timestamp (called on page load/interaction)."""
    # Users can only update their own last_active
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    current_user.last_active = datetime.utcnow()
    db.commit()
    return None