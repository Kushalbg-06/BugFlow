from enum import Enum
from fastapi import Depends, HTTPException, status
from app.core.deps import get_current_user
from app.models.user import User, UserRole


class Permission(str, Enum):
    VIEW_DASHBOARD = "VIEW_DASHBOARD"
    VIEW_PROJECTS = "VIEW_PROJECTS"
    VIEW_ISSUES = "VIEW_ISSUES"
    CREATE_ISSUE = "CREATE_ISSUE"
    EDIT_ISSUE = "EDIT_ISSUE"
    DELETE_ISSUE = "DELETE_ISSUE"
    ASSIGN_ISSUE = "ASSIGN_ISSUE"
    CHANGE_STATUS = "CHANGE_STATUS"
    MANAGE_USERS = "MANAGE_USERS"
    MANAGE_ROLES = "MANAGE_ROLES"
    VIEW_ANALYTICS = "VIEW_ANALYTICS"
    VIEW_AI_RESOLUTION = "VIEW_AI_RESOLUTION"
    VIEW_AI_DEVELOPER_RECOMMENDATION = "VIEW_AI_DEVELOPER_RECOMMENDATION"
    ADD_COMMENT = "ADD_COMMENT"
    UPLOAD_ATTACHMENT = "UPLOAD_ATTACHMENT"
    DELETE_ATTACHMENT = "DELETE_ATTACHMENT"
    MANAGE_SPRINTS = "MANAGE_SPRINTS"


ALL_PERMISSIONS = set(Permission)

ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.ADMIN: ALL_PERMISSIONS,
    UserRole.MANAGER: {
        Permission.VIEW_DASHBOARD, Permission.VIEW_PROJECTS, Permission.VIEW_ISSUES,
        Permission.CREATE_ISSUE, Permission.EDIT_ISSUE, Permission.ASSIGN_ISSUE,
        Permission.CHANGE_STATUS, Permission.VIEW_ANALYTICS, Permission.VIEW_AI_RESOLUTION,
        Permission.VIEW_AI_DEVELOPER_RECOMMENDATION, Permission.ADD_COMMENT,
        Permission.UPLOAD_ATTACHMENT, Permission.MANAGE_SPRINTS,
    },
    UserRole.DEVELOPER: {
        Permission.VIEW_DASHBOARD, Permission.VIEW_PROJECTS, Permission.VIEW_ISSUES,
        Permission.EDIT_ISSUE, Permission.CHANGE_STATUS, Permission.VIEW_ANALYTICS,
        Permission.VIEW_AI_RESOLUTION, Permission.VIEW_AI_DEVELOPER_RECOMMENDATION,
        Permission.ADD_COMMENT, Permission.UPLOAD_ATTACHMENT,
    },
    UserRole.QA: {
        Permission.VIEW_DASHBOARD, Permission.VIEW_PROJECTS, Permission.VIEW_ISSUES,
        Permission.CREATE_ISSUE, Permission.EDIT_ISSUE, Permission.CHANGE_STATUS,
        Permission.VIEW_ANALYTICS, Permission.VIEW_AI_RESOLUTION,
        Permission.VIEW_AI_DEVELOPER_RECOMMENDATION, Permission.ADD_COMMENT,
        Permission.UPLOAD_ATTACHMENT,
    },
    UserRole.REPORTER: {
        Permission.VIEW_DASHBOARD, Permission.VIEW_PROJECTS, Permission.VIEW_ISSUES,
        Permission.CREATE_ISSUE, Permission.ADD_COMMENT, Permission.UPLOAD_ATTACHMENT,
        Permission.VIEW_AI_RESOLUTION, Permission.VIEW_ANALYTICS,
        Permission.VIEW_AI_DEVELOPER_RECOMMENDATION,
    },
}


def has_permission(role: UserRole, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def require_permission(permission: Permission):
    """FastAPI dependency: 403s if the current user's role lacks `permission`."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission to perform this action ({permission.value})",
            )
        return user
    return checker