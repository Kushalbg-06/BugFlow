import { useEffect, useState } from "react";
import api from "../api";
import AppShell from "../components/AppShell";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const load = () => api.get("/projects").then((res) => setProjects(res.data));

  useEffect(() => { load(); }, []);

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {projects.map((p) => (
            <div className="panel" key={p.id}>
              <h4 style={{ margin: "0 0 8px", color: "var(--maroon)" }}>{p.name}</h4>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                {p.description || "No description"}
              </p>
            </div>
          ))}
          {projects.length === 0 && <p className="hint">No projects yet — create your first one above.</p>}
        </div>
      </div>
    </AppShell>
  );
}
