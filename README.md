# BugFlow Backend

FastAPI + SQLite backend for the BugFlow issue tracking platform.

## Setup

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Server runs at [http://127.0.0.1:8000](http://127.0.0.1:8000)
Interactive API docs (Swagger UI): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Structure

- `app/core` — config, JWT auth, DB session
- `app/models` — SQLAlchemy ORM models (User, Project, Issue, Sprint, Comment, Activity)
- `app/schemas` — Pydantic request/response models
- `app/routers` — API endpoints
- `app/services` — business logic (state machine, RBAC checks, dashboard queries)
- `app/ai` — the three optional AI challenge features (bug report enhancement,
duplicate detection, severity prediction). All work with **no API key**
via rule-based fallbacks; add `GEMINI_API_KEY` or `OPENAI_API_KEY` to `.env`
to switch on real LLM calls.



## Roles

`admin`, `developer`, `qa`, `reporter` — enforced via the `require_roles()`
dependency in `app/core/security.py`.

## Issue workflow

`open → in_progress → in_review → resolved → closed`, with reopening from
`closed → open` allowed. Invalid transitions are rejected with a 400.
Enforced in `app/models/issue.py::VALID_TRANSITIONS` and
`app/services/issue_service.py::transition_issue_status`.