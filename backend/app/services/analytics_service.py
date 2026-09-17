"""
Aggregation queries powering the Analytics section on Dashboard.jsx.

Matched exactly against:
  app/models/issue.py -> Issue (severity, priority, status, category, created_at, updated_at)
  app/models/user.py  -> User (username, email, role)  -- no full_name/first_name

Notes on things your schema doesn't (yet) support:
  - IssueStatus has no "closed" value (only open / in_progress / in_review / resolved),
    so there is no "closed defects" concept here.
  - Issue has no resolved_at column. Resolution time is approximated as
    (updated_at - created_at) for issues whose status is currently "resolved".
    This assumes updated_at reflects the resolution moment, which is only true if
    nothing else touches the issue after it's resolved. Add a real resolved_at
    column (set once, when status transitions to resolved) if you want this exact.
"""
from datetime import datetime, timedelta
from typing import List
from collections import defaultdict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.issue import Issue, IssueStatus, IssueSeverity
from app.models.user import User

STATUS_OPEN = IssueStatus.OPEN.value
STATUS_IN_PROGRESS = IssueStatus.IN_PROGRESS.value
STATUS_IN_REVIEW = IssueStatus.IN_REVIEW.value
STATUS_RESOLVED = IssueStatus.RESOLVED.value

SEVERITY_ORDER = [IssueSeverity.CRITICAL.value, IssueSeverity.HIGH.value,
                   IssueSeverity.MEDIUM.value, IssueSeverity.LOW.value]


def _developer_name(user: User) -> str:
    # your User model only has username/email — no full_name or first/last name
    return getattr(user, "username", None) or getattr(user, "email", None) or "Unknown"


def _pct_delta(current: int, previous: int) -> dict:
    if previous == 0:
        return {"value": 0.0, "direction": "up"}
    change = (current - previous) / previous * 100
    return {"value": round(abs(change), 1), "direction": "up" if change >= 0 else "down"}


def get_summary(db: Session, window_days: int = 30) -> dict:
    now = datetime.utcnow()
    window_start = now - timedelta(days=window_days)
    prev_start = window_start - timedelta(days=window_days)

    def count_created_in(start, end, status=None):
        q = db.query(func.count(Issue.id)).filter(Issue.created_at >= start, Issue.created_at < end)
        if status:
            q = q.filter(Issue.status == status)
        return q.scalar() or 0

    total_now = db.query(func.count(Issue.id)).scalar() or 0
    open_now = db.query(func.count(Issue.id)).filter(Issue.status == STATUS_OPEN).scalar() or 0
    in_progress_now = db.query(func.count(Issue.id)).filter(Issue.status == STATUS_IN_PROGRESS).scalar() or 0
    resolved_now = db.query(func.count(Issue.id)).filter(Issue.status == STATUS_RESOLVED).scalar() or 0
    in_review_now = db.query(func.count(Issue.id)).filter(Issue.status == STATUS_IN_REVIEW).scalar() or 0

    total_recent = count_created_in(window_start, now)
    total_prev = count_created_in(prev_start, window_start)
    open_recent = count_created_in(window_start, now, STATUS_OPEN)
    open_prev = count_created_in(prev_start, window_start, STATUS_OPEN)
    in_progress_recent = count_created_in(window_start, now, STATUS_IN_PROGRESS)
    in_progress_prev = count_created_in(prev_start, window_start, STATUS_IN_PROGRESS)
    resolved_recent = count_created_in(window_start, now, STATUS_RESOLVED)
    resolved_prev = count_created_in(prev_start, window_start, STATUS_RESOLVED)
    in_review_recent = count_created_in(window_start, now, STATUS_IN_REVIEW)
    in_review_prev = count_created_in(prev_start, window_start, STATUS_IN_REVIEW)

    avg_res_now = _avg_resolution_days(db, window_start, now)
    avg_res_prev = _avg_resolution_days(db, prev_start, window_start)
    avg_delta = _pct_delta(avg_res_now or 0, avg_res_prev or 0)
    avg_delta["direction"] = "down" if (avg_res_now or 0) <= (avg_res_prev or 0) else "up"

    return {
        "total_defects": total_now,
        "open_defects": open_now,
        "in_progress_defects": in_progress_now,
        "in_review_defects": in_review_now,
        "resolved_defects": resolved_now,
        "avg_resolution_days": round(avg_res_now or 0, 1),
        "total_delta": _pct_delta(total_recent, total_prev),
        "open_delta": _pct_delta(open_recent, open_prev),
        "in_progress_delta": _pct_delta(in_progress_recent, in_progress_prev),
        "in_review_delta": _pct_delta(in_review_recent, in_review_prev),
        "resolved_delta": _pct_delta(resolved_recent, resolved_prev),
        "avg_resolution_delta": avg_delta,
    }


def _avg_resolution_days(db: Session, start: datetime, end: datetime):
    # approximation: resolved issues, using updated_at as a stand-in for resolved_at
    rows = (
        db.query(Issue.created_at, Issue.updated_at)
        .filter(Issue.status == STATUS_RESOLVED)
        .filter(Issue.updated_at.isnot(None))
        .filter(Issue.updated_at >= start, Issue.updated_at < end)
        .all()
    )
    if not rows:
        return 0.0
    total_seconds = sum((r.updated_at - r.created_at).total_seconds() for r in rows)
    return (total_seconds / len(rows)) / 86400


def get_by_severity(db: Session) -> List[dict]:
    rows = db.query(Issue.severity, func.count(Issue.id)).group_by(Issue.severity).all()
    counts = {sev.value if hasattr(sev, "value") else sev: cnt for sev, cnt in rows}
    total = sum(counts.values()) or 1
    ordered = [s for s in SEVERITY_ORDER if s in counts] + [s for s in counts if s not in SEVERITY_ORDER]
    return [
        {"label": s.capitalize(), "count": counts[s], "percentage": round(counts[s] / total * 100, 1)}
        for s in ordered
    ]


def get_by_category(db: Session, top_n: int = 4) -> List[dict]:
    rows = (
        db.query(Issue.category, func.count(Issue.id))
        .group_by(Issue.category)
        .order_by(func.count(Issue.id).desc())
        .all()
    )
    total = sum(cnt for _, cnt in rows) or 1

    # keep only the top_n categories by count; fold everything else into "Other"
    # so the chart stays compact even if you have many category values
    top_rows = rows[:top_n]
    rest_count = sum(cnt for _, cnt in rows[top_n:])

    result = [
        {"label": cat or "Uncategorized", "count": cnt, "percentage": round(cnt / total * 100, 1)}
        for cat, cnt in top_rows
    ]
    if rest_count > 0:
        result.append({"label": "Other", "count": rest_count, "percentage": round(rest_count / total * 100, 1)})
    return result


def get_by_status(db: Session) -> List[dict]:
    rows = db.query(Issue.status, func.count(Issue.id)).group_by(Issue.status).all()
    counts = {s.value if hasattr(s, "value") else s: cnt for s, cnt in rows}
    total = sum(counts.values()) or 1
    order = [STATUS_OPEN, STATUS_IN_PROGRESS, STATUS_IN_REVIEW, STATUS_RESOLVED]
    return [
        {"label": s.replace("_", " ").title(), "count": counts.get(s, 0),
         "percentage": round(counts.get(s, 0) / total * 100, 1)}
        for s in order if s in counts
    ]


def get_trends(db: Session, days: int = 7) -> List[dict]:
    """Daily running totals for the trend line chart, last N days."""
    end = datetime.utcnow().date()
    start = end - timedelta(days=days - 1)

    issues = db.query(Issue.created_at, Issue.status).filter(Issue.created_at >= start).all()

    by_day = {start + timedelta(days=i): {"total": 0, "open": 0, "in_progress": 0, "resolved": 0}
              for i in range(days)}

    running_total = db.query(func.count(Issue.id)).filter(Issue.created_at < start).scalar() or 0
    for i in range(days):
        day = start + timedelta(days=i)
        created_that_day = [iss for iss in issues if iss.created_at.date() == day]
        running_total += len(created_that_day)
        by_day[day]["total"] = running_total
        by_day[day]["open"] = len([iss for iss in created_that_day
                                    if (iss.status.value if hasattr(iss.status, "value") else iss.status) == STATUS_OPEN])
        by_day[day]["in_progress"] = len([iss for iss in created_that_day
                                           if (iss.status.value if hasattr(iss.status, "value") else iss.status) == STATUS_IN_PROGRESS])
        by_day[day]["resolved"] = len([iss for iss in created_that_day
                                        if (iss.status.value if hasattr(iss.status, "value") else iss.status) == STATUS_RESOLVED])

    return [{"date": day.strftime("%b %d"), **vals} for day, vals in sorted(by_day.items())]


def get_developer_workload(db: Session, limit: int = 5) -> List[dict]:
    rows = (
        db.query(Issue.assignee_id, Issue.status, func.count(Issue.id))
        .filter(Issue.assignee_id.isnot(None))
        .group_by(Issue.assignee_id, Issue.status)
        .all()
    )
    per_dev = defaultdict(lambda: {"open": 0, "in_progress": 0, "resolved": 0})
    for assignee_id, status, cnt in rows:
        status_val = status.value if hasattr(status, "value") else status
        if status_val == STATUS_OPEN:
            per_dev[assignee_id]["open"] += cnt
        elif status_val == STATUS_IN_PROGRESS:
            per_dev[assignee_id]["in_progress"] += cnt
        elif status_val == STATUS_RESOLVED:
            per_dev[assignee_id]["resolved"] += cnt

    dev_ids = list(per_dev.keys())
    users = {u.id: u for u in db.query(User).filter(User.id.in_(dev_ids)).all()} if dev_ids else {}

    totals = {did: sum(v.values()) for did, v in per_dev.items()}
    max_total = max(totals.values()) if totals else 1

    result = [
        {
            "developer_id": did,
            "developer_name": _developer_name(users[did]) if did in users else "Unknown",
            "open_count": v["open"],
            "in_progress_count": v["in_progress"],
            "resolved_count": v["resolved"],
            "workload_percentage": round(totals[did] / max_total * 100, 1),
        }
        for did, v in per_dev.items()
    ]
    result.sort(key=lambda d: d["workload_percentage"], reverse=True)
    return result[:limit]


def get_recent_defects(db: Session, limit: int = 5, severity: str = None, status: str = None) -> List[dict]:
    q = db.query(Issue)
    if severity:
        q = q.filter(Issue.severity == severity)
    if status:
        q = q.filter(Issue.status == status)
    issues = q.order_by(Issue.created_at.desc()).limit(limit).all()
    out = []
    for iss in issues:
        status_val = iss.status.value if hasattr(iss.status, "value") else iss.status
        resolution_days = None
        if status_val == STATUS_RESOLVED and iss.updated_at:
            resolution_days = round((iss.updated_at - iss.created_at).total_seconds() / 86400, 1)
        out.append({
            "key": f"BUG-{iss.id}",
            "title": iss.title,
            "project_name": iss.project.name if iss.project else "—",
            "severity": iss.severity.value if hasattr(iss.severity, "value") else iss.severity,
            "status": status_val,
            "assignee_name": _developer_name(iss.assignee) if iss.assignee else None,
            "created_at": iss.created_at,
            "resolution_days": resolution_days,
        })
    return out