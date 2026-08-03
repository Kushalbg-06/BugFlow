# BugFlow / BugTrack AI — Frontend (Milestone 1 + 2)

React + Vite. Talks to the FastAPI backend at http://localhost:8000.

## Setup
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173

## Pages
- /login, /register — split-screen auth
- /dashboard — stat cards, recent issues, your projects
- /projects — create + browse projects
- /issues — Kanban board (Open / In Progress / In Review / Resolved), search + priority +
  sprint filters
- /sprints — create sprints per project, see issue counts per sprint
- /create-issue — report a bug; shows a live "possible duplicate" warning and an AI
  priority suggestion as you type, then generates the structured AI report on submit
- /issues/:id/report — tabbed issue detail: AI Report / Comments / Attachments / Activity
