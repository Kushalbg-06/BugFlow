"""
Resolution Assistance — the signature AI feature.
Rule-based now (same swap-for-a-real-LLM pattern as triage.py / duplicates.py).
"""
import re
from difflib import SequenceMatcher
from typing import Iterable, Optional

SIMILARITY_THRESHOLD = 0.35

RULES = {
    "payment": {
        "keywords": ["payment", "checkout", "coupon", "charge", "invoice", "billing", "discount"],
        "hypotheses": [
            ("Missing coupon/discount value in payment calculation", 78),
            ("Stale payment API response", 61),
            ("UI state not refreshed after coupon/discount applied", 43),
        ],
        "investigation": [
            ("Check payment API response", "Verify that the API returns the correct discounted payment amount."),
            ("Check null/undefined handling", "Ensure missing or invalid coupon data is handled safely."),
            ("Review frontend error handling", "Check whether the UI correctly updates the payment amount."),
            ("Check server logs", "Look for errors from the payment or coupon services."),
            ("Check recent payment changes", "Review recent changes to the payment calculation logic."),
        ],
        "code_areas": {"frontend": ["Checkout.jsx", "PaymentSummary.jsx"], "backend": ["payment_service.py", "coupon_service.py"], "api": ["POST /api/payment/calculate"]},
        "resolution": "Validate the coupon and payment API response before calculating the final amount. Handle null or invalid responses safely and update the checkout UI with the corrected payment total.",
        "impact_area": ["Frontend", "Backend", "Payment API"],
        "checklist": ["Coupon calculation verified", "Payment API response verified", "Frontend amount updated", "Invalid coupon handled", "Regression tests passed", "Payment flow verified"],
    },
    "auth": {
        "keywords": ["login", "auth", "token", "session", "password", "signin", "sign in"],
        "hypotheses": [
            ("Expired or invalid token not detected before request", 74),
            ("Session state not cleared on logout/expiry", 58),
            ("Race condition between token refresh and API call", 39),
        ],
        "investigation": [
            ("Check authentication API response", "Verify the login/refresh endpoint returns the expected token and expiry."),
            ("Check token/session expiry handling", "Ensure expired tokens are detected and refreshed before use."),
            ("Review frontend error handling", "Check whether auth failures show a clear message instead of failing silently."),
            ("Check server logs", "Look for repeated 401/403 errors around the failure time."),
            ("Check recent auth changes", "Review recent changes to the auth/session module."),
        ],
        "code_areas": {"frontend": ["Login.jsx", "AuthContext.jsx"], "backend": ["auth.py", "security.py"], "api": ["POST /api/auth/login", "POST /api/auth/refresh"]},
        "resolution": "Validate token/session state before proceeding with the request, refresh expired tokens proactively, and surface a clear error instead of failing silently.",
        "impact_area": ["Frontend", "Backend", "Auth API"],
        "checklist": ["Login flow verified", "Token refresh verified", "Session expiry handled", "Invalid credentials handled", "Regression tests passed", "Auth flow verified"],
    },
    "crash": {
        "keywords": ["crash", "500", "exception", "server error", "stack trace"],
        "hypotheses": [
            ("Unhandled null/undefined value in request payload", 71),
            ("Unexpected input type reaching the endpoint", 55),
            ("Downstream service returning an unexpected error format", 34),
        ],
        "investigation": [
            ("Check server logs for the stack trace", "Identify the exact line and input that triggered the exception."),
            ("Check null/undefined handling", "Ensure the failing code path validates inputs before use."),
            ("Reproduce locally", "Recreate the same input/environment to confirm the failure."),
            ("Check recent deploys", "Review deploys around the time the crashes started."),
            ("Check recent changes", "Review recent changes to the affected module."),
        ],
        "code_areas": {"frontend": [], "backend": ["affected service module"], "api": ["affected endpoint"]},
        "resolution": "Add defensive null/type checks around the failing call, return a graceful error response, and log the input that triggered the exception.",
        "impact_area": ["Backend", "Server"],
        "checklist": ["Crash no longer reproducible", "Input validation added", "Error logged with context", "Regression tests passed"],
    },
    "ui": {
        "keywords": ["ui", "button", "display", "layout", "css", "render", "frontend"],
        "hypotheses": [
            ("Component state not updated after data change", 66),
            ("Missing re-render after prop update", 48),
            ("CSS/layout rule causing incorrect display", 32),
        ],
        "investigation": [
            ("Check browser console for errors", "Look for JS errors around the affected component."),
            ("Check component state/props handling", "Verify the component updates correctly when data changes."),
            ("Review layout/CSS rules", "Check for conflicting or missing styles."),
            ("Check recent frontend changes", "Review recent changes to this component."),
            ("Test across browsers/screen sizes", "Confirm the issue isn't environment-specific."),
        ],
        "code_areas": {"frontend": ["affected component"], "backend": [], "api": []},
        "resolution": "Verify component state and props are correctly passed, add a fallback UI state for edge cases, and confirm the fix across browsers/screen sizes.",
        "impact_area": ["Frontend"],
        "checklist": ["UI displays correctly", "State updates verified", "Cross-browser tested", "Regression tests passed"],
    },
    "database": {
        "keywords": ["database", "data", "record", "query", "sql", "sync"],
        "hypotheses": [
            ("Query returning stale or incomplete data", 69),
            ("Race condition on concurrent read/write", 51),
            ("Missing migration applied in this environment", 37),
        ],
        "investigation": [
            ("Check database query logs", "Verify the query returns the expected rows/fields."),
            ("Check null/undefined handling", "Ensure missing fields are handled safely."),
            ("Review recent schema/migration changes", "Confirm the schema matches what the code expects."),
            ("Check for race conditions", "Look for concurrent writes affecting the same record."),
            ("Check recent changes", "Review recent changes to the data access layer."),
        ],
        "code_areas": {"frontend": [], "backend": ["affected model", "affected repository/service"], "api": ["affected endpoint"]},
        "resolution": "Validate query results and handle missing/null fields safely, and confirm migrations are applied consistently across environments.",
        "impact_area": ["Backend", "Database"],
        "checklist": ["Query verified", "Migration verified", "Data integrity confirmed", "Regression tests passed"],
    },
}

DEFAULT_RULE = {
    "hypotheses": [
        ("Unexpected or missing data reaching the affected code path", 60),
        ("Frontend not reflecting the latest backend state", 45),
        ("Edge case not handled in the current logic", 30),
    ],
    "investigation": [
        ("Check API response for the affected endpoint", "Verify the response contains the expected data."),
        ("Check null/undefined handling", "Ensure missing or invalid data is handled safely."),
        ("Review frontend error handling", "Check whether the UI handles this case correctly."),
        ("Check server logs", "Look for errors around the time the issue occurred."),
        ("Check recent changes", "Review recent changes to the related module."),
    ],
    "code_areas": {"frontend": [], "backend": [], "api": []},
    "resolution": "Validate inputs and API responses at the point of failure, and add explicit error handling instead of letting it fail silently.",
    "impact_area": ["Frontend", "Backend"],
    "checklist": ["Issue no longer reproducible", "Input/response validated", "Regression tests passed"],
}

AMOUNT_RE = re.compile(r"(?:₹|\$|Rs\.?)\s?[\d,]+(?:\.\d+)?")

EFFORT_BY_PRIORITY = {
    "critical": "High — 4–8 hours",
    "high": "Medium — 2–4 hours",
    "medium": "Medium — 1–3 hours",
    "low": "Low — under 1 hour",
}


def _match_rule(text: str) -> dict:
    text_l = text.lower()
    for rule in RULES.values():
        if any(kw in text_l for kw in rule["keywords"]):
            return rule
    return DEFAULT_RULE


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _similar_defects(title: str, description: str, candidates: Iterable) -> list[dict]:
    text = f"{title} {description}"
    matches = []
    for issue in candidates:
        score = _similarity(text, f"{issue.title} {issue.description}")
        if score >= SIMILARITY_THRESHOLD:
            matches.append({"issue_id": issue.id, "title": issue.title, "similarity": round(score, 2), "_issue": issue})
    matches.sort(key=lambda m: m["similarity"], reverse=True)
    return matches[:3]


def _previous_resolution(similar: list[dict]) -> Optional[str]:
    for m in similar:
        issue = m["_issue"]
        if issue.status.value == "resolved" and issue.ai_root_cause:
            return f"A similar defect (BUG-{issue.id}) was resolved by addressing: {issue.ai_root_cause.strip().splitlines()[0]}"
        if issue.status.value == "resolved":
            return f"A similar defect (BUG-{issue.id}) was previously resolved after investigation of the same area."
    return None


def _debugging_steps() -> list[dict]:
    return [
        {"step": "Reproduce the issue", "detail": "Trigger the reported scenario and confirm the incorrect behavior."},
        {"step": "Inspect the API request", "detail": "Check that the relevant request payload is sent correctly."},
        {"step": "Inspect the API response", "detail": "Compare expected vs actual values in the response."},
        {"step": "Trace the logic", "detail": "Identify where the incorrect value or state is introduced."},
        {"step": "Verify frontend state", "detail": "Ensure the UI displays the updated value from the API."},
        {"step": "Test edge cases", "detail": "Test invalid, missing, and boundary inputs."},
    ]


def _detected_mismatch(text: str, is_payment: bool, resolution_text: str) -> Optional[dict]:
    if not is_payment:
        return None
    amounts = AMOUNT_RE.findall(text)
    if len(amounts) < 2:
        return None
    return {
        "expected": amounts[0].strip(),
        "actual": amounts[1].strip(),
        "likely_issue": resolution_text.split(".")[0] + ".",
    }


def get_resolution_assistance(issue, candidates: Iterable) -> dict:
    text = f"{issue.title} {issue.description} {issue.category or ''} {issue.component or ''}"
    rule = _match_rule(text)
    similar = _similar_defects(issue.title, issue.description, candidates)

    top_confidence = rule["hypotheses"][0][1]
    confidence_score = min(95, top_confidence + 7)

    priority_key = issue.priority.value if hasattr(issue.priority, "value") else str(issue.priority)
    estimated_effort = EFFORT_BY_PRIORITY.get(priority_key, "Medium — 2–4 hours")

    is_payment = rule is RULES.get("payment")

    return {
        "root_cause_hypotheses": [{"hypothesis": h, "confidence": c} for h, c in rule["hypotheses"]],
        "investigation_areas": [{"area": a, "detail": d} for a, d in rule["investigation"]],
        "suggested_code_areas": rule["code_areas"],
        "debugging_steps": _debugging_steps(),
        "detected_mismatch": _detected_mismatch(text, is_payment, rule["resolution"]),
        "similar_defects": [{"issue_id": m["issue_id"], "title": m["title"], "similarity": m["similarity"]} for m in similar],
        "previous_resolution": _previous_resolution(similar),
        "possible_resolution": rule["resolution"],
        "confidence_score": confidence_score,
        "impact_area": rule["impact_area"],
        "estimated_effort": estimated_effort,
        "verification_checklist": rule["checklist"],
    }