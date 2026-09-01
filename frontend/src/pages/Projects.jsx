import { useEffect, useState } from "react";
import api from "../api";
import AppShell from "../components/AppShell";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [cardError, setCardError] = useState("");

  const load = () => api.get("/projects").then((res) => setProjects(res.data));

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/projects", form);
      setForm({ name: "", description: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create project");
    }
  };

  const startEdit = (project) => {
    setCardError("");
    setEditingId(project.id);
    setEditForm({ name: project.name, description: project.description || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", description: "" });
    setCardError("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setCardError("");
    try {
      await api.patch(`/projects/${editingId}`, editForm);
      cancelEdit();
      load();
    } catch (err) {
      setCardError(err.response?.data?.detail || "Could not update project");
    }
  };

  const handleDelete = async (project) => {
    const ok = confirm(
      `Delete "${project.name}"?\n\nAll issues and sprints in this project will also be deleted. This cannot be undone.`
    );
    if (!ok) return;

    setCardError("");
    try {
      await api.delete(`/projects/${project.id}`);
      if (editingId === project.id) cancelEdit();
      load();
    } catch (err) {
      setCardError(err.response?.data?.detail || "Could not delete project");
    }
  };

  return (
    <AppShell>
      <div className="page">
        <h2>Projects</h2>
        <p className="page-subtitle">Group related issues under a project.</p>

        <div className="panel" style={{ maxWidth: 500, marginBottom: 28 }}>
          <h3 style={{ marginTop: 0 }}>Create New Project</h3>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              placeholder="Project Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}
            />
            <textarea
              placeholder="Project Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit" }}
            />
            <button className="btn" type="submit">Create Project</button>
          </form>
        </div>

        <h3>My Projects</h3>
        {cardError && <p className="error">{cardError}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {projects.map((p) => (
            <div className="panel" key={p.id}>
              {editingId === p.id ? (
                <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit" }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-sm" type="submit">Save</button>
                    <button className="btn btn-outline btn-sm" type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <h4 style={{ margin: "0 0 8px", color: "var(--maroon)" }}>{p.name}</h4>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDelete(p)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                    {p.description || "No description"}
                  </p>
                </>
              )}
            </div>
          ))}
          {projects.length === 0 && <p className="hint">No projects yet — create your first one above.</p>}
        </div>
      </div>
    </AppShell>
  );
}