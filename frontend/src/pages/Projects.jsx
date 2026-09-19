import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";

const apiMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
};

export default function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
  });

  /* ==============================
     LOAD DATA
  ============================== */

  const load = async () => {
    try {
      const [projectsRes, issuesRes] = await Promise.all([
        api.get("/projects"),
        api.get("/issues"),
      ]);

      setProjects(projectsRes.data);
      setIssues(issuesRes.data);
    } catch (err) {
      console.error("Failed to load data:", err);
      setActionError("Failed to load projects");
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ==============================
     CREATE PROJECT
  ============================== */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setSuccessMessage("");

    if (!form.name.trim()) {
      setActionError("Project name is required");
      return;
    }

    try {
      await api.post("/projects", {
        name: form.name,
        description: form.description,
      });

      setForm({
        name: "",
        description: "",
      });

      setSuccessMessage("✓ Project created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      await load();
    } catch (err) {
      console.error("Create project error:", err);
      setActionError(
        apiMessage(err, "Permission not allowed - You cannot create projects")
      );
    }
  };

  /* ==============================
     EDIT PROJECT
  ============================== */

  const startEdit = (project) => {
    setEditingId(project.id);
    setActionError("");
    setEditForm({
      name: project.name,
      description: project.description || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      description: "",
    });
  };

  const handleUpdate = async (projectId) => {
    setActionError("");

    if (!editForm.name.trim()) {
      setActionError("Project name is required");
      return;
    }

    try {
      await api.put(`/projects/${projectId}`, {
        name: editForm.name,
        description: editForm.description,
      });

      setEditingId(null);
      setSuccessMessage("✓ Project updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      await load();
    } catch (err) {
      console.error("Update project error:", err);
      setActionError(
        apiMessage(err, "Permission not allowed - You cannot update this project")
      );
    }
  };

  /* ==============================
     DELETE PROJECT
  ============================== */

  const handleDelete = async (projectId, projectName) => {
    const confirmed = window.confirm(
      `Delete "${projectName}"?\n\nAll issues and sprints in this project will also be deleted. This cannot be undone.`
    );

    if (!confirmed) return;

    setActionError("");

    try {
      await api.delete(`/projects/${projectId}`);

      if (editingId === projectId) {
        cancelEdit();
      }

      setSuccessMessage("✓ Project deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      await load();
    } catch (err) {
      console.error("Delete project error:", err);
      setActionError(
        apiMessage(err, "Permission not allowed - You cannot delete this project")
      );
    }
  };

  /* ==============================
     HELPERS
  ============================== */

  const getProjectStats = (projectId) => {
    const projectIssues = issues.filter((i) => i.project_id === projectId);
    return {
      total: projectIssues.length,
      open: projectIssues.filter((i) => i.status === "open").length,
      inProgress: projectIssues.filter(
        (i) => i.status === "in_progress" || i.status === "in_review"
      ).length,
      resolved: projectIssues.filter((i) => i.status === "resolved").length,
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* ==============================
     UI
  ============================== */

  return (
    <AppShell>
      <div className="page">
        {/* PAGE HEADER */}
        <div className="projects-header">
          <div>
            <h2 >Projects</h2>
            <p className="page-subtitle">
              Group related issues under a project to keep everything organized.
            </p>
          </div>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="projects-success">
            <div className="projects-success-content">{successMessage}</div>
            <button
              className="projects-success-close"
              onClick={() => setSuccessMessage("")}
            >
              ×
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {actionError && (
          <div className="projects-error">
            <div className="projects-error-icon">!</div>
            <div className="projects-error-content">
              <div className="projects-error-title">Action Not Allowed</div>
              <div className="projects-error-message">{actionError}</div>
            </div>
            <button
              className="projects-error-close"
              onClick={() => setActionError("")}
            >
              ×
            </button>
          </div>
        )}

        {/* CREATE PROJECT CARD */}
        <div className="projects-create-card">
          <div className="projects-create-header">
            <div className="projects-create-icon">📁</div>
            <h3>Create New Project</h3>
          </div>

          <form onSubmit={handleSubmit} className="projects-create-form">
            <div className="projects-form-field">
              <label>Project Name</label>
              <input
                type="text"
                placeholder="e.g., E-Commerce Platform"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="projects-form-field">
              <label>Project Description</label>
              <textarea
                placeholder="Describe the purpose and scope of this project..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <button className="btn" type="submit">
              + Create Project
            </button>
          </form>
        </div>

        {/* MY PROJECTS SECTION */}
        <div className="projects-list-header">
          <h3>My Projects</h3>
          <p>View and manage the projects you have created.</p>
        </div>

        {/* PROJECTS GRID */}
        <div className="projects-grid">
          {projects.map((project) => {
            const stats = getProjectStats(project.id);
            const isEditing = editingId === project.id;

            if (isEditing) {
              return (
                <div className="project-card" key={project.id}>
                  <div className="project-edit-form">
                    <h4>Edit Project</h4>

                    <div className="projects-form-field">
                      <label>Project Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="projects-form-field">
                      <label>Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="edit-actions">
                      <button
                        className="btn btn-sm"
                        type="button"
                        onClick={() => handleUpdate(project.id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="project-card" key={project.id}>
                {/* CARD HEADER */}
                <div className="project-card-header">
                  <div className="project-icon">
                    {project.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="project-card-title-section">
                    <h4 className="project-card-title">{project.name}</h4>
                    <span className="project-status-badge">Active</span>
                  </div>
                </div>

                {/* DESCRIPTION */}
                {project.description && (
                  <p className="project-card-description">
                    {project.description}
                  </p>
                )}

                {/* STATISTICS */}
                <div className="project-stat-row">
                  <div className="project-stat">
                    <div className="project-stat-label">Total Issues</div>
                    <div className="project-stat-value">{stats.total}</div>
                  </div>

                  <div className="project-stat">
                    <div className="project-stat-label">Open</div>
                    <div className="project-stat-value" style={{ color: "#ef4444" }}>
                      {stats.open}
                    </div>
                  </div>

                  <div className="project-stat">
                    <div className="project-stat-label">In Progress</div>
                    <div className="project-stat-value" style={{ color: "#f59e0b" }}>
                      {stats.inProgress}
                    </div>
                  </div>

                  <div className="project-stat">
                    <div className="project-stat-label">Resolved</div>
                    <div className="project-stat-value" style={{ color: "#22c55e" }}>
                      {stats.resolved}
                    </div>
                  </div>
                </div>

                {/* DATE */}
                <div className="project-date">
                  📅 {formatDate(project.created_at)}
                </div>

                {/* ACTIONS */}
                <div className="project-card-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/projects/${project.id}/issues`)}
                  >
                    View Issues
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => startEdit(project)}
                  >
                    Edit
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(project.id, project.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {/* EMPTY STATE */}
          {projects.length === 0 && (
            <div className="projects-empty">
              <div className="projects-empty-icon">📭</div>
              <h4>No projects yet</h4>
              <p>Create your first project to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        /* ===============================
           PAGE HEADER
        =============================== */

        .projects-header {
          margin-bottom: 28px;
        }

        .projects-header h2 {
          margin: 0 0 8px;
          font-size: 28px;         
          font-weight: 700;         
          color: var(--text);
          }
        .page-subtitle {
          margin: 0;
          font-size: 14px;
          color: var(--text-muted);
        }

        /* ===============================
           SUCCESS MESSAGE
        =============================== */

        .projects-success {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          margin-bottom: 18px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 9px;
          color: #166534;
        }

        .projects-success-content {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
        }

        .projects-success-close {
          border: none;
          background: transparent;
          color: #166534;
          font-size: 20px;
          cursor: pointer;
          padding: 2px 6px;
        }

        /* ===============================
           ERROR MESSAGE
        =============================== */

        .projects-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          margin-bottom: 18px;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-left: 4px solid #ef4444;
          border-radius: 9px;
          color: #991b1b;
        }

        .projects-error-icon {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #fee2e2;
          color: #dc2626;
          font-weight: 800;
          font-size: 15px;
        }

        .projects-error-content {
          min-width: 0;
        }

        .projects-error-title {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .projects-error-message {
          font-size: 12px;
          color: #b91c1c;
        }

        .projects-error-close {
          margin-left: auto;
          border: none;
          background: transparent;
          color: #991b1b;
          font-size: 22px;
          cursor: pointer;
          padding: 2px 7px;
        }

        /* ===============================
           CREATE CARD
        =============================== */

        .projects-create-card {
          padding: 28px;
          margin-bottom: 36px;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-sm);
        }

        .projects-create-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
        }

        .projects-create-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #eee9ff;
          color: var(--brand-700);
          font-size: 20px;
        }

        .projects-create-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .projects-create-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .projects-form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .projects-form-field label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
        }

        .projects-form-field input,
        .projects-form-field textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: #ffffff;
          color: var(--text);
          font-size: 13px;
          font-family: inherit;
          outline: none;
        }

        .projects-form-field textarea {
          resize: vertical;
        }

        .projects-form-field input:focus,
        .projects-form-field textarea:focus {
          border-color: var(--brand-500);
          box-shadow: 0 0 0 3px rgba(79, 50, 205, 0.08);
        }

        /* ===============================
           LIST HEADER
        =============================== */

        .projects-list-header {
          margin-bottom: 20px;
        }

        .projects-list-header h3 {
          margin: 0 0 4px;
          font-size: 22px;
          font-weight: 700;
        }

        .projects-list-header p {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted);
        }

        /* ===============================
           PROJECTS GRID
        =============================== */

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          align-items: stretch;
        }

        /* ===============================
           PROJECT CARD
        =============================== */

        .project-card {
          padding: 20px;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: all 0.2s;
        }

        .project-card:hover {
          border-color: var(--brand-500);
          box-shadow: 0 4px 12px rgba(79, 50, 205, 0.1);
        }

        .project-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .project-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: linear-gradient(135deg, #eee9ff, #e5d9ff);
          color: var(--brand-700);
          font-weight: 700;
          font-size: 18px;
        }

        .project-card-title-section {
          flex: 1;
          min-width: 0;
        }

        .project-card-title {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          word-break: break-word;
        }

        .project-status-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #d1fae5;
          border: 1px solid #a7f3d0;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #047857;
        }

        .project-card-description {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ===============================
           STATISTICS
        =============================== */

        .project-stat-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          padding: 12px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .project-stat {
          text-align: center;
        }

        .project-stat-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .project-stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .project-date {
          font-size: 12px;
          color: var(--text-muted);
        }

        /* ===============================
           ACTIONS
        =============================== */

        .project-card-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .project-card-actions button {
          width: 100%;
          font-size: 12px;
        }

        /* ===============================
           EDIT FORM
        =============================== */

        .project-edit-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .project-edit-form h4 {
          margin: 0;
          color: var(--brand-700);
          font-size: 16px;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .edit-actions button {
          flex: 1;
        }

        /* ===============================
           EMPTY STATE
        =============================== */

        .projects-empty {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 20px;
          text-align: center;
        }

        .projects-empty-icon {
          font-size: 48px;
          opacity: 0.5;
        }

        .projects-empty h4 {
          margin: 0;
          font-size: 18px;
          color: var(--text);
        }

        .projects-empty p {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted);
        }

        /* ===============================
           RESPONSIVE
        =============================== */

        @media (max-width: 1000px) {
          .projects-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .projects-create-card {
            padding: 20px;
          }

          .projects-create-header {
            margin-bottom: 16px;
          }
          

          .project-stat-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .project-card-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}