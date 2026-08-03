"""
Set AI_PROVIDER in .env to "anthropic", "openai", or "gemini" (plus the
matching API key) to generate structured reports (steps to reproduce,
expected result, actual result, category).
"""
import json
import logging
import re
from app.core.config import settings

logger = logging.getLogger("bugflow.ai")

_SYSTEM_PROMPT = """You are a senior QA engineer writing a bug report for a development team. Given a bug title and a raw, often short or vague, reporter description, produce a thorough, specific, professional bug report.

Respond with ONLY a JSON object (no markdown fences, no commentary, no text before or after) with exactly these keys:
  "category": one of "UI", "Backend", "Auth", "Performance", "Data", "General"
  "summary": 1-2 sentences stating what is broken and its impact, written for someone triaging a backlog
  "steps_to_reproduce": a numbered list as a single string (one step per line, "1. ...\\n2. ..."), specific and actionable
  "expected_result": 1-2 sentences describing correct behavior, phrased concretely (not "should behave correctly")
  "actual_result": 1-2 sentences describing what actually happens, grounded only in what the reporter said

Rules:
- Be specific and concrete. Reuse concrete nouns/verbs from the title and description (page names, field names, actions) instead of vague words like "the feature" or "an error".
- Do NOT invent facts (specific error codes, browsers, screen names) that aren't stated or clearly implied.
- If the description is short, still infer a reasonable, specific reproduction flow from context (e.g. a registration bug implies: open the registration page, fill the field in question, submit) rather than a generic placeholder.
- Write like an experienced QA engineer documenting a real ticket, not like a template.

Example — input title: "Cart quantity does not update", description: "When I increase the quantity of an item from 1 to 2 in the cart, the total price stays the same until I refresh the page."
Example output:
{"category": "Data", "summary": "The cart total does not recalculate when item quantity changes, showing stale pricing until a manual refresh — this could lead to customers being charged incorrectly at checkout.", "steps_to_reproduce": "1. Add an item to the cart.\\n2. On the cart page, increase the item's quantity from 1 to 2.\\n3. Observe the displayed cart total without refreshing the page.", "expected_result": "The cart total should recalculate immediately to reflect the new quantity, without requiring a page refresh.", "actual_result": "The cart total remains unchanged after the quantity update and only reflects the correct total after the page is manually refreshed."}
"""


def _user_prompt(title: str, description: str) -> str:
    return f"Title: {title}\n\nDescription: {description}"


def _parse_json_response(raw_text: str) -> dict:
    """Parse the model's JSON response. Tolerates markdown fences and,
    as a last resort, attempts a best-effort repair of truncated JSON
    (missing closing quote/brace) before giving up."""
    cleaned = raw_text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned)
        cleaned = cleaned.replace("```", "").strip()

    start = cleaned.find("{")
    if start == -1:
        raise ValueError(f"No JSON object found.\n\nResponse:\n{cleaned}")

    json_text = cleaned[start:]
    end = json_text.rfind("}")

    if end != -1:
        json_text = json_text[:end + 1]
        try:
            data = json.loads(json_text)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Invalid JSON returned by provider:\n{e}\n\nJSON:\n{json_text}"
            )
    else:
        # No closing brace found at all — response was likely cut off
        # mid-generation. Attempt a best-effort repair rather than
        # failing immediately; if this repair still doesn't parse,
        # we raise and let the caller (generate_report) retry/fail.
        repaired = json_text.rstrip()
        if repaired.count('"') % 2 == 1:
            repaired += '"'
        repaired += "}"
        try:
            data = json.loads(repaired)
            logger.warning("Repaired truncated JSON from provider response")
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Incomplete JSON received from provider (repair failed):\n{e}\n\n"
                f"Response:\n{cleaned}"
            )

    return {
        "category": data.get("category", "General"),
        "ai_summary": data.get("summary", ""),
        "ai_steps_to_reproduce": data.get("steps_to_reproduce", ""),
        "ai_expected_result": data.get("expected_result", ""),
        "ai_actual_result": data.get("actual_result", ""),
    }


# ---------------------------------------------------------------------------
# Provider backends — each returns the same dict shape, or raises on failure
# ---------------------------------------------------------------------------

def _generate_with_anthropic(title: str, description: str) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=800,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _user_prompt(title, description)}],
    )
    raw_text = "".join(block.text for block in message.content if block.type == "text")
    return _parse_json_response(raw_text)


def _generate_with_openai(title: str, description: str) -> dict:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")
    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _user_prompt(title, description)},
        ],
    )
    raw_text = response.choices[0].message.content
    return _parse_json_response(raw_text)


def _generate_with_gemini(title: str, description: str, _retry: bool = True) -> dict:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")

    import google.generativeai as genai
    from google.generativeai.types import GenerationConfig

    genai.configure(api_key=settings.GEMINI_API_KEY)

    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=_SYSTEM_PROMPT,
    )

    try:
        response = model.generate_content(
            _user_prompt(title, description),
            generation_config=GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=2048,
            ),
        )

        print("\n" + "=" * 80)
        print("Gemini Response:")
        print(response.text)
        print("=" * 80)

        if hasattr(response, "candidates"):
            print("Finish Reason:")
            for candidate in response.candidates:
                reason = candidate.finish_reason
                name = getattr(reason, "name", reason)
                print(name)
            print("=" * 80)

        if not response.text:
            raise RuntimeError("Gemini returned an empty response.")

        try:
            return _parse_json_response(response.text)
        except ValueError:
            if _retry:
                logger.warning(
                    "Gemini returned incomplete/invalid JSON, retrying once"
                )
                return _generate_with_gemini(title, description, _retry=False)
            raise

    except Exception as e:
        raise RuntimeError(f"Gemini API error: {e}") from e


# ---------------------------------------------------------------------------
# Public entry point — this is the only function the rest of the app calls
# ---------------------------------------------------------------------------

class AIReportError(Exception):
    """Raised when the configured LLM provider can't produce a report.
    No silent fallback — the caller (the API route) turns this into a
    clear error response instead of returning a rule-based guess."""


# ---------------------------------------------------------------------------
# Provider mapping
# ---------------------------------------------------------------------------

_PROVIDERS = {
    "anthropic": _generate_with_anthropic,
    "openai": _generate_with_openai,
    "gemini": _generate_with_gemini,
}


def generate_report(title: str, description: str) -> dict:
    if not settings.AI_PROVIDER:
        raise AIReportError(
            "No AI_PROVIDER configured. Set AI_PROVIDER=anthropic|openai|gemini "
            "and the matching API key in .env."
        )
    provider_fn = _PROVIDERS.get(settings.AI_PROVIDER)
    if provider_fn is None:
        raise AIReportError(f"Unknown AI_PROVIDER '{settings.AI_PROVIDER}'. Use anthropic, openai, or gemini.")

    try:
        result = provider_fn(title, description)
    except Exception as exc:
        logger.warning("AI provider '%s' failed: %s", settings.AI_PROVIDER, exc)
        raise AIReportError(f"AI report generation failed via {settings.AI_PROVIDER}: {exc}") from exc

    logger.info("AI report generated via %s", settings.AI_PROVIDER)
    return result