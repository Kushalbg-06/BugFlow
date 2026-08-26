import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./bugflow.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

    # Which LLM provider to use for AI report generation: "anthropic", "openai",
    # "gemini", or "grok". Required — there is no offline fallback (see app/ai/report_generator.py).
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "").lower()
    AI_TIMEOUT_SECONDS: float = float(os.getenv("AI_TIMEOUT_SECONDS", 25))
    AI_MAX_RETRIES: int = int(os.getenv("AI_MAX_RETRIES", 1))  # retries on top of the first attempt

    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Grok (xAI) uses an OpenAI-compatible API, so we reuse the `openai` SDK
    # with a different base_url — no separate package needed.
    GROK_API_KEY: str = os.getenv("GROK_API_KEY", "")
    GROK_MODEL: str = os.getenv("GROK_MODEL", "grok-2-latest")
    GROK_BASE_URL: str = os.getenv("GROK_BASE_URL", "https://api.x.ai/v1")

settings = Settings()
