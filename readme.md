🐞 BugFlow – AI-Powered Bug Tracking & Management System

BugFlow is an AI-powered, full-stack bug tracking and issue management platform designed to help software development teams efficiently report, manage, prioritize, assign, and resolve software bugs.

The platform provides a centralized workspace for developers, QA testers, and project managers to collaborate, track issue lifecycles, manage sprints, and monitor project progress.

By integrating AI capabilities, BugFlow helps improve bug reports, identify duplicate issues, and recommend issue severity and categorization.

---

🚀 Key Features

1. Authentication & Authorization

- User registration and login.
- JWT-based authentication.
- Role-Based Access Control (RBAC).
- Different access permissions for:
  - Admin
  - Developer
  - QA Tester
  - Reporter

2. Project Management

- Create and manage projects.
- Add team members to projects.
- Organize issues project-wise.
- Manage project activities.

3. Bug & Issue Management

- Report new bugs and software issues.
- Assign issues to developers.
- Set issue priority and severity.
- Update issue details.
- Track issue status throughout its lifecycle.

4. Issue Lifecycle Management

BugFlow supports the following issue workflow:

"Open → In Progress → In Review → Resolved"

- Open: Newly reported issue.
- In Progress: Developer is working on the issue.
- In Review: Issue is submitted for verification.
- Resolved: Issue has been fixed and resolved.

5. Sprint Management

- Create and manage sprints.
- Organize issues into sprints.
- Track sprint progress.
- Manage development tasks.

6. Comments & Activity Tracking

- Add comments to issues.
- Maintain issue discussion history.
- Track changes and status updates.
- Improve collaboration between team members.

7. AI-Powered Capabilities

BugFlow integrates AI to make bug management smarter.

- AI Report Enhancement: Improves unclear or incomplete bug descriptions.
- Duplicate Bug Detection: Identifies potentially duplicate issues.
- Severity Prediction: Suggests the severity of reported bugs.
- Issue Categorization: Recommends appropriate issue categories.

8. Analytics & Reporting

- Track issue statistics.
- Monitor bug resolution progress.
- Analyze issue severity and priorities.
- View project and sprint performance.

---

🛠️ Technology Stack

Layer| Technologies
Frontend| React.js
Backend| Python, FastAPI
ORM| SQLAlchemy
Database| PostgreSQL
Validation| Pydantic
Authentication| JWT
AI Integration| LLM, NLP, Vector Embeddings
AI Provider| Google Gemini
API Documentation| Swagger UI, ReDoc
Version Control| Git, GitHub

---

🏗️ System Architecture

             USER
               |
               v
       React Frontend
               |
          REST APIs
               |
               v
       FastAPI Backend
               |
       +-------+-------+
       |       |       |
       v       v       v
   Auth     Business   AI
  Module     Logic    Module
       |       |       |
       +-------+-------+
               |
               v
          SQLAlchemy
               |
               v
          PostgreSQL

---

📂 Project Structure

BugFlow/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── .env
│
├── README.md
└── .gitignore

---

⚙️ Installation & Setup

Prerequisites

Install the following before running the project:

- Python 3.10+
- Node.js and npm
- PostgreSQL
- Git

1. Clone the Repository

git clone <YOUR_REPOSITORY_URL>
cd BugFlow

2. Backend Setup

Navigate to the backend directory:

cd backend

Create a virtual environment:

python -m venv venv

Activate the environment.

Windows:

venv\Scripts\activate

Linux / macOS:

source venv/bin/activate

Install dependencies:

pip install -r requirements.txt

3. Environment Configuration

Create a ".env" file inside the backend directory.

DATABASE_URL=postgresql://username:password@localhost:5432/bugflow

SECRET_KEY=your_secret_key

ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=60

GEMINI_API_KEY=your_gemini_api_key

Update the database credentials and API keys according to your environment.

4. Run the Backend

uvicorn app.main:app --reload

Backend server:

http://127.0.0.1:8000

5. API Documentation

FastAPI automatically generates API documentation.

- Swagger UI: "http://127.0.0.1:8000/docs"
- ReDoc: "http://127.0.0.1:8000/redoc"

6. Frontend Setup

Open another terminal:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

Open the frontend URL displayed in your terminal.

---

🔌 API Overview

The backend exposes RESTful APIs for managing authentication, projects, issues, comments, sprints, and analytics.

Method| Endpoint| Description
POST| "/auth/register"| Register a new user
POST| "/auth/login"| Authenticate user
POST| "/issues"| Create a new issue
GET| "/issues"| Retrieve issues
PATCH| "/issues/{id}"| Update an issue
PATCH| "/issues/{id}/status"| Update issue status
POST| "/issues/{id}/comments"| Add issue comments
POST| "/sprints"| Create a sprint

Refer to Swagger UI for the implemented API endpoints and request schemas.

---

🤖 AI Integration

AI integration enhances the bug management process by reducing manual effort and improving issue quality.

AI Processing Workflow:

       Bug Report
            |
            v
      FastAPI Backend
            |
            v
        AI Module
            |
      +-----+------+
      |     |      |
      v     v      v
    Report Duplicate Severity
    Improve Detection Prediction
      |     |      |
      +-----+------+
            |
            v
      AI Recommendations
            |
            v
      Issue Management

AI-generated recommendations assist users in managing issues more effectively. Final decisions remain with the development team.

---

🔐 Security

- JWT-based authentication.
- Role-Based Access Control.
- Protected API endpoints.
- Environment-based secret management.
- Input validation using Pydantic.

---

🎯 Project Objectives

- Centralize software bug tracking and management.
- Improve collaboration between developers and QA testers.
- Simplify issue assignment and tracking.
- Reduce duplicate bug reports.
- Improve bug report quality using AI.
- Provide better visibility into project progress.

---

🔮 Future Enhancements

- Real-time notifications using WebSockets.
- Advanced project analytics and dashboards.
- GitHub integration for issue and pull request tracking.
- Docker-based deployment.
- CI/CD pipeline integration.
- Advanced semantic duplicate detection using vector databases.
- AI-powered debugging assistance.

---

👨‍💻 Author

Kushal B G

Computer Science and Engineering

National Institute of Engineering, Mysuru

---

📄 License

This project is developed for educational and software engineering purposes. A formal open-source license can be added when the repository is ready for public distribution.

---

BugFlow – Report Smarter. Track Better. Fix Faster. 🐞
