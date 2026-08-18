"""
Suggests a priority level from the bug text using keyword heuristics.
Same "swap this for a real LLM later" pattern as report_generator.py.
"""
PRIORITY_KEYWORDS = {
    "critical": ["crash", "down", "outage", "data loss", "security", "breach", "cannot log in", "payment fails", "unusable"],
    "high": ["broken", "fails", "error", "not working", "blocks", "major", "incorrect data"],
    "low": ["minor", "typo", "cosmetic", "suggestion", "improve", "slightly", "small"],
}

def suggest_priority(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    for level in ("critical", "high", "low"):
        if any(kw in text for kw in PRIORITY_KEYWORDS[level]):
            return level
    return "medium"
