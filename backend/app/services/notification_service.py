from typing import Iterable, Optional

from sqlalchemy.orm import Session

from ..models.notification import Notification
from ..models.user import User
from .notification_rules import NOTIFICATION_RULES


def _active_users_with_roles(db: Session, roles: set) -> list[User]:
    query = db.query(User).filter(User.role.in_(roles))
    if hasattr(User, "is_active"):
        query = query.filter(User.is_active.is_(True))
    return query.all()


def _resolve_recipients(
    db: Session,
    rule: dict,
    *,
    issue=None,
    actor_id: Optional[int] = None,
    mentioned_user_id: Optional[int] = None,
) -> set:
    roles = rule["roles"]
    target = rule["target"]
    recipients: set = set()

    if target == "role_broadcast":
        recipients = {u.id for u in _active_users_with_roles(db, roles)}

    elif target == "assignee":
        assignee_id = getattr(issue, "assignee_id", None) if issue else None
        if assignee_id:
            assignee = db.query(User).filter(User.id == assignee_id).first()
            if assignee and assignee.role in roles:
                recipients = {assignee_id}

    elif target == "reporter":
        reporter_id = getattr(issue, "reporter_id", None) if issue else None
        if reporter_id:
            reporter = db.query(User).filter(User.id == reporter_id).first()
            if reporter and reporter.role in roles:
                recipients = {reporter_id}

    elif target in ("stakeholders", "stakeholders_excl_author"):
        assignee_id = getattr(issue, "assignee_id", None) if issue else None
        reporter_id = getattr(issue, "reporter_id", None) if issue else None
        stakeholder_ids = {i for i in (assignee_id, reporter_id) if i}

        if stakeholder_ids:
            qualifying_users = (
                db.query(User).filter(User.id.in_(stakeholder_ids)).all()
            )
            recipients |= {u.id for u in qualifying_users if u.role in roles}

        if roles & {"admin", "manager"}:
            recipients |= {
                u.id for u in _active_users_with_roles(db, roles & {"admin", "manager"})
            }

        if target == "stakeholders_excl_author" and actor_id is not None:
            recipients.discard(actor_id)

    elif target == "mentioned_user":
        if mentioned_user_id:
            mentioned = db.query(User).filter(User.id == mentioned_user_id).first()
            if mentioned and mentioned.role in roles:
                recipients = {mentioned_user_id}

    elif target == "assignee_or_broadcast":
        assignee_id = getattr(issue, "assignee_id", None) if issue else None
        if assignee_id:
            assignee = db.query(User).filter(User.id == assignee_id).first()
            if assignee and assignee.role in roles:
                recipients = {assignee_id}
        else:
            recipients = {u.id for u in _active_users_with_roles(db, roles)}

    if actor_id is not None:
        recipients.discard(actor_id)

    return recipients


def notify_event(
    db: Session,
    event_type: str,
    *,
    issue=None,
    sprint=None,
    actor_id: Optional[int] = None,
    mentioned_user_id: Optional[int] = None,
    title_override: Optional[str] = None,
    message: Optional[str] = None,
    link: Optional[str] = None,
    commit: bool = True,
) -> list[Notification]:
    
    rule = NOTIFICATION_RULES.get(event_type)
    if rule is None:
        raise ValueError(f"Unknown notification event_type: {event_type!r}")

    recipient_ids = _resolve_recipients(
        db,
        rule,
        issue=issue,
        actor_id=actor_id,
        mentioned_user_id=mentioned_user_id,
    )
    if not recipient_ids:
        return []

    title = title_override or rule["title"]
    created: list[Notification] = []

    for user_id in recipient_ids:
        row = Notification(
            user_id=user_id,
            event_type=event_type,
            category=rule["category"],
            title=title,
            message=message,
            issue_id=getattr(issue, "id", None) if issue else None,
            sprint_id=getattr(sprint, "id", None) if sprint else None,
            link=link,
        )
        db.add(row)
        created.append(row)

    if commit:
        db.commit()
        for row in created:
            db.refresh(row)

    return created


def get_notifications(
    db: Session,
    user_id: int,
    *,
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Notification], int, int]:
    base_query = db.query(Notification).filter(Notification.user_id == user_id)

    unread_count = base_query.filter(Notification.is_read.is_(False)).count()

    filtered = base_query
    if category and category != "all":
        filtered = filtered.filter(Notification.category == category)

    total = filtered.count()
    items = (
        filtered.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return items, unread_count, total


def mark_read(db: Session, user_id: int, notification_ids: Iterable[int]) -> int:
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.id.in_(list(notification_ids)))
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated


def mark_all_read(db: Session, user_id: int) -> int:
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated