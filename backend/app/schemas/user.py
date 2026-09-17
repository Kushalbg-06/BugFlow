from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models.user import UserRole

# Base schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.REPORTER
    

class UserLogin(BaseModel):
    username: str
    password: str

# User output schema (basic - for list endpoints)
class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole
    full_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Profile schema (detailed - for profile page)
class UserProfile(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    bio: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_active: Optional[datetime] = None

    class Config:
        from_attributes = True

# Update profile schema
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None

    class Config:
        from_attributes = True

# User stats schema (for profile activity section)
class UserStats(BaseModel):
    user_id: int
    issues_created: int
    issues_resolved: int
    issues_assigned: int
    total_comments: int
    member_since: datetime

    class Config:
        from_attributes = True

# Combined profile response (for profile page)
class UserProfileWithStats(BaseModel):
    profile: UserProfile
    stats: UserStats

    class Config:
        from_attributes = True

# ==================== ADMIN / RBAC SCHEMAS (NEW) ====================

class UserRoleUpdate(BaseModel):
    role: UserRole

class UserStatusUpdate(BaseModel):
    is_active: bool