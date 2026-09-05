from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.permissions import Permission, require_permission
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def summary(window_days: int = Query(30, ge=1, le=365),
            db: Session = Depends(get_db),
            _user=Depends(require_permission(Permission.VIEW_ANALYTICS))):
    return analytics_service.get_summary(db, window_days)


@router.get("/by-severity")
def by_severity(db: Session = Depends(get_db), _user=Depends(require_permission(Permission.VIEW_ANALYTICS))):
    return analytics_service.get_by_severity(db)


@router.get("/by-category")
def by_category(db: Session = Depends(get_db), _user=Depends(require_permission(Permission.VIEW_ANALYTICS))):
    return analytics_service.get_by_category(db)


@router.get("/by-status")
def by_status(db: Session = Depends(get_db), _user=Depends(require_permission(Permission.VIEW_ANALYTICS))):
    return analytics_service.get_by_status(db)


@router.get("/trends")
def trends(days: int = Query(7, ge=1, le=90),
           db: Session = Depends(get_db),
           _user=Depends(require_permission(Permission.VIEW_ANALYTICS))):
    return analytics_service.get_trends(db, days)


@router.get("/developer-workload")
def developer_workload(limit: int = Query(5, ge=1, le=50),
                        db: Session = Depends(get_db),
                        _user=Depends(require_permission(Permission.VIEW_ANALYTICS))):
    return analytics_service.get_developer_workload(db, limit)


@router.get("/recent-defects")
def recent_defects(limit: int = Query(5, ge=1, le=50),
                    severity: Optional[str] = Query(None),
                    status: Optional[str] = Query(None),
                    db: Session = Depends(get_db),
                    _user=Depends(require_permission(Permission.VIEW_ANALYTICS))):
    return analytics_service.get_recent_defects(db, limit, severity=severity, status=status)