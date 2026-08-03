import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";

export default function Dashboard() {
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get("/issues"), api.get("/projects")])
      .then(([issuesRes, projectsRes]) => {
        setIssues(issuesRes.data);
        setProjects(projectsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    total: issues.length,
    open: issues.filter((i) => i.status === "open").length,
    in_progress: issues.filter((i) => i.status === "in_progress").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
  };

  return (
    <AppShell>
      <div className="page">
        <div className="page-header-row">
          <div>
            <h2>Dashboard</h2>
            <p className="page-subtitle">Welcome back! Here's what's happening with your workspace.</p>
          </div>
          <button className="btn" onClick={() => navigate("/create-issue")}>+ Create Issue</button>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div><div className="stat-label">Total Projects</div><div className="stat-value">{projects.length}</div></div>
            <span className="stat-icon">▥</span>
          </div>
          <div className="stat-card">
            <div><div className="stat-label">Total Issues</div><div className="stat-value">{counts.total}</div></div>
            <span className="stat-icon">◉</span>
          </div>
          <div className="stat-card open">
            <div><div className="stat-label">Open Issues</div><div className="stat-value">{counts.open}</div></div>
            <span className="stat-icon">!</span>
          </div>
          <div className="stat-card progress">
            <div><div className="stat-label">In Progress</div><div className="stat-value">{counts.in_progress}</div></div>
            <span className="stat-icon">↻</span>
          </div>
          <div className="stat-card resolved">
            <div><div className="stat-label">Resolved</div><div className="stat-value">{counts.resolved}</div></div>
            <span className="stat-icon">✓</span>
          </div>
        </div>

        {!loading && (
          <div className="panel-grid">
            <div className="panel">
              <div className="panel-header">
                <h3>Recent Issues</h3>
                <Link to="/issues" className="btn btn-outline btn-sm">View All</Link>
              </div>
              {issues.slice(0, 5).map((issue) => (
                <div className="list-row" key={issue.id}>
                  <div className="list-row-title">{issue.title}</div>
                  <div className="list-row-meta">
                    {issue.status === "open" ? "Open" : issue.status === "in_progress" ? "In Progress" : "Resolved"}
                    {" • "}{issue.priority[0].toUpperCase() + issue.priority.slice(1)}
                  </div>
                </div>
              ))}
              {issues.length === 0 && <p className="hint">No issues yet.</p>}
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>Your Projects</h3>
                <Link to="/projects" className="btn btn-outline btn-sm">View All</Link>
              </div>
              {projects.map((project) => (
                <div className="project-mini" key={project.id}>
                  <h4>{project.name}</h4>
                  <p>{project.description || "No description"}</p>
                </div>
              ))}
              {projects.length === 0 && <p className="hint">No projects yet.</p>}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
