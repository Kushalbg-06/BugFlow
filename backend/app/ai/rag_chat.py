"""
LLM answer generation for the issue-aware RAG chatbot. Reuses the same
AI_PROVIDER configured for report_generator.py — no separate provider system.
Kept separate from retrieval and embeddings.
"""
import functools
import logging

from app.core.config import settings

logger = logging.getLogger("bugflow.rag.chat")

_MAX_OUTPUT_TOKENS = 700

_SYSTEM_PROMPT = """You are BugFlow AI, an issue-aware assistant embedded in a bug-tracking tool. \
You help a developer understand the issue they are currently viewing, using ONLY:
1. The current issue's details (provided below).
2. Historical BugFlow knowledge retrieved from resolved issues (provided below), each tagged with its BUG-<id> and document type.

STRICT RULES:
- Never invent a historical issue, resolution, root cause, or detail that is not present in the retrieved context below.
- If the retrieved historical context is empty or not relevant, say plainly that no relevant historical information was found, and answer only from the current issue context if possible.
- Clearly distinguish "historical information" (from retrieved BUG-<id> records) from "AI suggestion" (your own reasoning).
- Be concise and developer-focused: prioritize what to investigate next.
- Never claim certainty about a root cause you cannot confirm — hedge appropriately ("likely", "I cannot confirm without further evidence").

FORMATTING:
- Respond in clean Markdown only. Never use HTML tags like <br> — use a blank line or a new list item for a line break instead.
- Use short bold labels (e.g. **Root cause:**) or ## headers to separate sections, not ALL CAPS lines.
- Use "-" bullet lists or "1." numbered lists for steps, not inline runs of text.
- Keep paragraphs short (2-3 sentences max) — this renders inside a narrow chat panel.
"""


def _format_current_issue(issue) -> str:
    lines = [
        f"BUG-{issue.id}: {issue.title}",
        f"Description: {issue.description}",
        f"Severity: {issue.severity.value if hasattr(issue.severity, 'value') else issue.severity}",
        f"Priority: {issue.priority.value if hasattr(issue.priority, 'value') else issue.priority}",
        f"Status: {issue.status.value if hasattr(issue.status, 'value') else issue.status}",
    ]
    if issue.category:
        lines.append(f"Category: {issue.category}")
    if issue.component:
        lines.append(f"Module/Component: {issue.component}")
    if issue.defect_type:
        lines.append(f"Defect type: {issue.defect_type}")
    if issue.ai_steps_to_reproduce:
        lines.append(f"Steps to reproduce: {issue.ai_steps_to_reproduce}")
    if issue.ai_expected_result:
        lines.append(f"Expected result: {issue.ai_expected_result}")
    if issue.ai_actual_result:
        lines.append(f"Actual result: {issue.ai_actual_result}")
    return "\n".join(lines)


def _format_retrieved(retrieved: list[dict]) -> str:
    if not retrieved:
        return "(No relevant historical information found.)"
    return "\n\n".join(
        f"[BUG-{d['issue_id']} | {d['document_type']} | similarity {d['similarity']}]\n{d['content']}"
        for d in retrieved
    )


def _format_history(conversation_history: list[dict]) -> str:
    if not conversation_history:
        return ""
    lines = []
    for turn in conversation_history[-6:]:
        role = "Developer" if turn.get("role") == "user" else "BugFlow AI"
        lines.append(f"{role}: {turn.get('content', '')}")
    return "\n".join(lines)


def _user_prompt(issue, question: str, retrieved: list[dict], conversation_history: list[dict]) -> str:
    parts = [
        "CURRENT ISSUE:\n" + _format_current_issue(issue),
        "RETRIEVED HISTORICAL KNOWLEDGE:\n" + _format_retrieved(retrieved),
    ]
    history_text = _format_history(conversation_history)
    if history_text:
        parts.append("CONVERSATION SO FAR:\n" + history_text)
    parts.append("DEVELOPER'S QUESTION:\n" + question)
    return "\n\n".join(parts)


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


class RagChatError(Exception):
    """Raised when the configured LLM provider can't produce a chat answer."""


def _generate_with_anthropic(system: str, user: str) -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    message = _anthropic_client().messages.create(
        model=settings.ANTHROPIC_MODEL, max_tokens=_MAX_OUTPUT_TOKENS,
        system=system, messages=[{"role": "user", "content": user}],
    )
    return "".join(block.text for block in message.content if block.type == "text")


def _generate_with_openai(system: str, user: str) -> str:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")
    response = _openai_client().chat.completions.create(
        model=settings.OPENAI_MODEL, max_tokens=_MAX_OUTPUT_TOKENS,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    return response.choices[0].message.content


def _generate_with_gemini(system: str, user: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")
    import google.genai as genai
    response = _gemini_client().models.generate_content(
        model=settings.GEMINI_MODEL, contents=user,
        config=genai.types.GenerateContentConfig(
            system_instruction=system, max_output_tokens=_MAX_OUTPUT_TOKENS,
            thinking_config=genai.types.ThinkingConfig(thinking_level=genai.types.ThinkingLevel.LOW),
        ),
    )
    return response.text


def _generate_with_grok(system: str, user: str) -> str:
    if not settings.GROK_API_KEY:
        raise RuntimeError("GROK_API_KEY not configured")
    response = _grok_client().chat.completions.create(
        model=settings.GROK_MODEL, max_tokens=_MAX_OUTPUT_TOKENS,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    return response.choices[0].message.content


_PROVIDERS = {"anthropic": _generate_with_anthropic, "openai": _generate_with_openai, "gemini": _generate_with_gemini, "grok": _generate_with_grok}


def generate_chat_answer(issue, question: str, retrieved: list[dict], conversation_history: list[dict] | None = None) -> str:
    if not settings.AI_PROVIDER:
        raise RagChatError("No AI_PROVIDER configured. Set AI_PROVIDER and the matching API key in .env.")
    provider_fn = _PROVIDERS.get(settings.AI_PROVIDER)
    if provider_fn is None:
        raise RagChatError(f"Unknown AI_PROVIDER '{settings.AI_PROVIDER}'.")

    user_prompt = _user_prompt(issue, question, retrieved, conversation_history or [])
    try:
        answer = provider_fn(_SYSTEM_PROMPT, user_prompt)
    except Exception as exc:
        logger.warning("RAG chat generation failed via %s: %s", settings.AI_PROVIDER, exc)
        raise RagChatError(f"AI chat generation failed via {settings.AI_PROVIDER}: {exc}") from exc

    if not answer or not answer.strip():
        raise RagChatError("Model returned an empty response.")
    return answer.strip()