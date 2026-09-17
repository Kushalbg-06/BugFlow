"""
app/services/notification_rules.py

This is the machine-readable version of your notification matrix. Two
things drive whether a given user gets a notification for an event:

1. "roles" — which roles are even eligible for this event type at all
   (this is the ✅/— matrix you specified).
2. "target" — of the users who *could* get it, who actually does, given
   the specific issue/comment/sprint involved. Role eligibility alone
   isn't enough — "issue assigned to me" shouldn't blast every developer,
   just the one it was assigned to.

Targets:
  - "role_broadcast"      -> every active user whose role is in "roles"
  - "assignee"             -> only the issue's assignee, if their role is eligible
  - "reporter"              -> only the issue's reporter, if their role is eligible
  - "stakeholders"          -> assignee + reporter + all admins/managers,
                               filtered by "roles"
  - "stakeholders_excl_author" -> same as stakeholders, minus whoever
                               triggered the event (e.g. don't notify a
                               developer about their own comment)
  - "mentioned_user"        -> only the specific @mentioned user
  - "assignee_or_broadcast" -> the assignee if set, otherwise falls back
                               to a role broadcast (used for sprint/AI
                               events that aren't always issue-scoped)
"""

CATEGORY_ASSIGNED = "assigned"
CATEGORY_COMMENTS = "comments"
CATEGORY_STATUS = "status"
CATEGORY_AI = "ai"
CATEGORY_SYSTEM = "system"

ALL_ROLES = {"admin", "manager", "developer", "qa", "reporter"}

NOTIFICATION_RULES = {
    "issue_created": {
        "category": CATEGORY_SYSTEM,
        "roles": {"admin", "manager", "qa"},
        "target": "role_broadcast",
        "title": "New issue created",
    },
    "issue_assigned": {
        "category": CATEGORY_ASSIGNED,
        "roles": {"admin", "manager", "developer", "qa"},
        "target": "assignee",
        "title": "Issue assigned to you",
    },
    "issue_status_changed": {
        "category": CATEGORY_STATUS,
        "roles": ALL_ROLES,
        "target": "stakeholders",
        "title": "Issue status changed",
    },
    "issue_priority_changed": {
        "category": CATEGORY_STATUS,
        "roles": ALL_ROLES,
        "target": "stakeholders",
        "title": "Issue priority changed",
    },
    "issue_reopened": {
        "category": CATEGORY_STATUS,
        "roles": ALL_ROLES,
        "target": "stakeholders",
        "title": "Issue reopened",
    },
    "comment_added": {
        "category": CATEGORY_COMMENTS,
        "roles": ALL_ROLES,
        "target": "stakeholders_excl_author",
        "title": "New comment on your issue",
    },
    "mentioned_in_comment": {
        "category": CATEGORY_COMMENTS,
        "roles": ALL_ROLES,
        "target": "mentioned_user",
        "title": "You were mentioned",
    },
    "issue_moved_to_review": {
        "category": CATEGORY_STATUS,
        "roles": {"manager", "qa"},
        "target": "role_broadcast",
        "title": "Issue ready for testing",
    },
    "issue_resolved": {
        "category": CATEGORY_STATUS,
        "roles": {"admin", "manager", "qa", "reporter"},
        "target": "stakeholders",
        "title": "Issue resolved",
    },
    "critical_issue_created": {
        "category": CATEGORY_SYSTEM,
        "roles": {"admin", "manager", "developer", "qa"},
        "target": "role_broadcast",
        "title": "Critical issue created",
    },
    "sprint_assigned": {
        "category": CATEGORY_SYSTEM,
        "roles": {"admin", "manager", "developer", "qa"},
        "target": "assignee_or_broadcast",
        "title": "Sprint assigned/updated",
    },
    "sprint_deadline_approaching": {
        "category": CATEGORY_SYSTEM,
        "roles": {"admin", "manager", "developer", "qa"},
        "target": "role_broadcast",
        "title": "Sprint deadline approaching",
    },
    "ai_developer_recommendation": {
        "category": CATEGORY_AI,
        "roles": {"manager", "developer"},
        "target": "role_broadcast",
        "title": "AI developer recommendation",
    },
    "ai_resolution_available": {
        "category": CATEGORY_AI,
        "roles": {"manager", "developer", "qa"},
        "target": "assignee_or_broadcast",
        "title": "AI resolution available",
    },
    "ai_test_cases_generated": {
        "category": CATEGORY_AI,
        "roles": {"manager", "qa"},
        "target": "role_broadcast",
        "title": "AI test cases generated",
    },
    "team_member_joined": {
        "category": CATEGORY_SYSTEM,
        "roles": {"admin", "manager"},
        "target": "role_broadcast",
        "title": "New team member",
    },
}