from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import UserRole

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.REPORTER

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str
