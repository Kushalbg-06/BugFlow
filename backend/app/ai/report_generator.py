""" 
"AI-Assisted Bug Reporting" 
Set AI_PROVIDER in .env to "anthropic", "openai", "gemini", or "grok" (plus the
matching API key) to generate structured reports (steps to reproduce,
expected result, actual result, category, summary, environment, root cause).

"""
import functools
import json
import logging
import re
import time
from app.core.config import settings

logger = logging.getLogger("bugflow.ai")

_SYSTEM_PROMPT = """You are a senior QA engineer writing a bug report for a development team. Given a bug title and a raw, often short or vague, reporter description, produce a thorough, specific, professional bug report.

Respond with ONLY a JSON object (no markdown fences, no commentary, no text before or after) with exactly these keys:
  "category": one of "UI", "Backend", "Auth", "Performance", "Data", "General"
  "summary": 1-2 sentences stating what is broken and its impact, written for someone triaging a backlog
  "steps_to_reproduce": a numbered list as a single string (one step per line, "1. ...\\n2. ..."), specific and actionable
  "expected_result": 1-2 sentences describing correct behavior, phrased concretely (not "should behave correctly")
  "actual_result": 1-2 sentences describing what actually happens, grounded only in what the reporter said
  "environment": likely affected environment/platform (e.g. browser, OS, device type, or app area) inferred ONLY from what's stated or clearly implied — if nothing is implied, use "Not specified"
  "root_cause": 1-2 sentences of an experienced engineer's best-guess hypothesis for the likely technical cause (e.g. "likely a missing null check", "probably a stale cache not being invalidated on update") — clearly framed as a hypothesis, not a confirmed diagnosis

Rules:
- Be specific and concrete. Reuse concrete nouns/verbs from the title and description (page names, field names, actions) instead of vague words like "the feature" or "an error".
- Do NOT invent facts (specific error codes, browsers, screen names) that aren't stated or clearly implied.
- If the description is short, still infer a reasonable, specific reproduction flow from context (e.g. a registration bug implies: open the registration page, fill the field in question, submit) rather than a generic placeholder.
- For "root_cause", reason like an engineer skimming the symptom, not like you have access to the codebase — hedge appropriately ("likely", "possibly", "one common cause of this pattern is").
- Write like an experienced QA engineer documenting a real ticket, not like a template.

Example — input title: "Cart quantity does not update", description: "When I increase the quantity of an item from 1 to 2 in the cart, the total price stays the same until I refresh the page."
Example output:
{"category": "Data", "summary": "The cart total does not recalculate when item quantity changes, showing stale pricing until a manual refresh — this could lead to customers being charged incorrectly at checkout.", "steps_to_reproduce": "1. Add an item to the cart.\\n2. On the cart page, increase the item's quantity from 1 to 2.\\n3. Observe the displayed cart total without refreshing the page.", "expected_result": "The cart total should recalculate immediately to reflect the new quantity, without requiring a page refresh.", "actual_result": "The cart total remains unchanged after the quantity update and only reflects the correct total after the page is manually refreshed.", "environment": "Cart page, web app (browser not specified)", "root_cause": "Likely the quantity update handler is not triggering a re-render or re-fetch of the cart total — a common pattern is the total being calculated once on page load and not recomputed on state change."}
"""

_MAX_OUTPUT_TOKENS = 500


def _user_prompt(title: str, description: str) -> str:
    return f"Title: {title}\n\nDescription: {description}"


def _parse_json_response(raw_text: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?|```$", "", raw_text.strip(), flags=re.MULTILINE).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"No JSON object found in model response: {raw_text[:200]!r}")
    data = json.loads(cleaned[start:end + 1])
    result = {
        "category": data.get("category") or "General",
        "ai_summary": data.get("summary") or "",
        "ai_steps_to_reproduce": data.get("steps_to_reproduce") or "",
        "ai_expected_result": data.get("expected_result") or "",
        "ai_actual_result": data.get("actual_result") or "",
        "ai_environment": data.get("environment") or "Not specified",
        "ai_root_cause": data.get("root_cause") or "",
    }
    if not result["ai_steps_to_reproduce"] or not result["ai_expected_result"]:
        raise ValueError(f"Model returned incomplete report fields: {result}")
    return result

@functools.lru_cache(maxsize=1)
def _anthropic_client():
    import anthropic
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=settings.AI_TIMEOUT_SECONDS)


@functools.lru_cache(maxsize=1)
def _openai_client():

    from openai import OpenAI
    return OpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.AI_TIMEOUT_SECONDS)


@functools.lru_cache(maxsize=1)
def _gemini_client():
    import google.genai as genai
    return genai.Client(api_key=settings.GEMINI_API_KEY)


@functools.lru_cache(maxsize=1)
def _grok_client():
    
    from openai import OpenAI 
    return OpenAI(api_key=settings.GROK_API_KEY, base_url=settings.GROK_BASE_URL, timeout=settings.AI_TIMEOUT_SECONDS)

def _generate_with_anthropic(title: str, description: str) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    message = _anthropic_client().messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=_MAX_OUTPUT_TOKENS,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _user_prompt(title, description)}],
    )
    raw_text = "".join(block.text for block in message.content if block.type == "text")
    return _parse_json_response(raw_text)


def _generate_with_openai(title: str, description: str) -> dict:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")

    response = _openai_client().chat.completions.create(
        model=settings.OPENAI_MODEL,
        max_tokens=_MAX_OUTPUT_TOKENS,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _user_prompt(title, description)},
        ],
    )
    raw_text = response.choices[0].message.content
    return _parse_json_response(raw_text)


def _generate_with_gemini(title: str, description: str) -> dict:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")

    import google.genai as genai

    
    response = _gemini_client().models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=_user_prompt(title, description),
        config=genai.types.GenerateContentConfig(
            system_instruction=_SYSTEM_PROMPT,
            response_mime_type="application/json",
            max_output_tokens=1500,
            thinking_config=genai.types.ThinkingConfig(thinking_level=genai.types.ThinkingLevel.LOW),
        ),
    )
    return _parse_json_response(response.text)


def _generate_with_grok(title: str, description: str) -> dict:
    if not settings.GROK_API_KEY:
        raise RuntimeError("GROK_API_KEY not configured")

    response = _grok_client().chat.completions.create(
        model=settings.GROK_MODEL,
        max_tokens=_MAX_OUTPUT_TOKENS,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _user_prompt(title, description)},
        ],
    )
    raw_text = response.choices[0].message.content
    return _parse_json_response(raw_text)


_PROVIDERS = {
    "anthropic": _generate_with_anthropic,
    "openai": _generate_with_openai,
    "gemini": _generate_with_gemini,
    "grok": _generate_with_grok,
}


# ---------------------------------------------------------------------------
# Public entry point — this is the only function the rest of the app calls
# ---------------------------------------------------------------------------

class AIReportError(Exception):
    """Raised when the configured LLM provider can't produce a report after
    all retries. No silent fallback — the caller (the API route) turns this
    into a clear error response instead of returning a rule-based guess."""


def generate_report(title: str, description: str) -> dict:
    if not settings.AI_PROVIDER:
        raise AIReportError(
            "No AI_PROVIDER configured. Set AI_PROVIDER=anthropic|openai|gemini|grok "
            "and the matching API key in .env."
        )
    provider_fn = _PROVIDERS.get(settings.AI_PROVIDER)
    if provider_fn is None:
        raise AIReportError(f"Unknown AI_PROVIDER '{settings.AI_PROVIDER}'. Use anthropic, openai, gemini, or grok.")

    attempts = max(1, settings.AI_MAX_RETRIES + 1)
    last_error = None

    for attempt in range(1, attempts + 1):
        started = time.monotonic()
        try:
            result = provider_fn(title, description)
        except Exception as exc:
            elapsed = time.monotonic() - started
            last_error = exc
            logger.warning(
                "AI provider '%s' attempt %d/%d failed after %.1fs: %s",
                settings.AI_PROVIDER, attempt, attempts, elapsed, exc,
            )
            continue
        else:
            elapsed = time.monotonic() - started
            logger.info("AI report generated via %s in %.1fs (attempt %d/%d)", settings.AI_PROVIDER, elapsed, attempt, attempts)
            return result

    raise AIReportError(
        f"AI report generation failed via {settings.AI_PROVIDER} after {attempts} attempt(s): {last_error}"
    ) from last_error