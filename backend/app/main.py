import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models import user, project, issue, sprint, comment, attachment, activity  
from app.models import user, project, issue, sprint, comment, attachment, activity, rag_document
from app.routers import auth, users, projects, issues, comments, attachments, activity as activity_router, sprints, analytics, skills, rag
from app.routers import ai
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

Base.metadata.create_all(bind=engine)
app = FastAPI(title="BugFlow API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(issues.router)
app.include_router(comments.router)
app.include_router(attachments.router)
app.include_router(activity_router.router)
app.include_router(sprints.router)
app.include_router(analytics.router)
app.include_router(skills.router)
app.include_router(rag.router)
app.include_router(ai.router) 


@app.get("/")
def root():
    return {"status": "ok", "service": "BugFlow API"}
