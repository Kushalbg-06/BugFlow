"""
AI Test Case Generator.
Rule-based (same swap-for-a-real-LLM pattern as resolution.py / triage.py).
"""

RULES = {
    "payment": {
        "keywords": ["payment", "checkout", "coupon", "charge", "invoice", "billing", "discount"],
        "test_cases": [
            ("Verify valid payment submission", "Payment should complete successfully", "high"),
            ("Verify payment with expired card", "Proper error message should appear", "high"),
            ("Verify payment API timeout", "User should see a retry option", "medium"),
            ("Verify failed payment doesn't create an order", "No order should be created", "high"),
            ("Verify coupon/discount is applied correctly", "Final amount should reflect the discount", "medium"),
        ],
    },
    "auth": {
        "keywords": ["login", "auth", "token", "session", "password", "signin", "sign in"],
        "test_cases": [
            ("Verify login with valid credentials", "User is authenticated and redirected to dashboard", "high"),
            ("Verify login with invalid credentials", "Proper error message appears, no session created", "high"),
            ("Verify session expiry handling", "User is logged out and redirected to login", "medium"),
            ("Verify token refresh flow", "Session continues without forcing re-login", "medium"),
            ("Verify logout clears session", "Protected pages are inaccessible after logout", "high"),
        ],
    },
    "crash": {
        "keywords": ["crash", "500", "exception", "server error", "stack trace"],
        "test_cases": [
            ("Verify endpoint with valid payload", "Request succeeds without error", "high"),
            ("Verify endpoint with missing/null fields", "API returns a graceful validation error, not a 500", "high"),
            ("Verify endpoint with malformed input", "API rejects the request with a clear error message", "medium"),
            ("Verify server stability under repeated requests", "No crash or unhandled exception occurs", "medium"),
        ],
    },
    "ui": {
        "keywords": ["ui", "button", "display", "layout", "css", "render", "frontend"],
        "test_cases": [
            ("Verify component renders with valid data", "UI displays the correct data without errors", "medium"),
            ("Verify component behavior with empty/missing data", "UI shows an appropriate empty state", "medium"),
            ("Verify layout across screen sizes", "Layout remains usable on mobile and desktop", "low"),
            ("Verify UI updates after state change", "Component re-renders with updated values", "high"),
        ],
    },
    "database": {
        "keywords": ["database", "data", "record", "query", "sql", "sync"],
        "test_cases": [
            ("Verify record is created correctly", "Record is saved with all expected fields", "high"),
            ("Verify query returns expected data", "Query result matches expected rows/fields", "high"),
            ("Verify handling of missing/null fields", "System handles nulls without failing", "medium"),
            ("Verify concurrent read/write consistency", "No data corruption or race condition occurs", "medium"),
        ],
    },
}

DEFAULT_TEST_CASES = [
    ("Verify the reported scenario no longer reproduces", "The defect described should not occur", "high"),
    ("Verify behavior with valid input", "The feature works as expected", "medium"),
    ("Verify behavior with invalid/missing input", "System handles it gracefully with a clear message", "medium"),
    ("Verify no regression in related functionality", "Related features continue working as before", "low"),
]


def _match_rule(text: str) -> list:
    text_l = text.lower()
    for rule in RULES.values():
        if any(kw in text_l for kw in rule["keywords"]):
            return rule["test_cases"]
    return DEFAULT_TEST_CASES


def generate_test_cases(issue) -> list[dict]:
    text = f"{issue.title} {issue.description} {issue.category or ''} {issue.component or ''}"
    cases = _match_rule(text)
    return [
        {"title": title, "expected_result": expected, "priority": priority}
        for title, expected, priority in cases
    ]