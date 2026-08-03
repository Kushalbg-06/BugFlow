import { useEffect, useState } from "react";
import api from "../api";
import AppShell from "../components/AppShell";

export default function Sprints() {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [form, setForm] = useState({ name: "", project_id: "", start_date: "", end_date: "" });
  const [error, setError] = useState("");

  const load = () => {
    api.get("/projects").then((res) => {
      setProjects(res.data);
      if (res.data.length > 0 && !form.project_id) {
        setForm((f) => ({ ...f, project_id: res.data[0].id }));
      }
    });
    api.get("/sprints").then((res) => setSprints(res.data));
    api.get("/issues").then((res) => setIssues(res.data));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/sprints", { ...form, project_id: Number(form.project_id) });
      setForm({ ...form, name: "", start_date: "", end_date: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create sprint");
    }
  };

  const projectName = (id) => projects.find((p) => p.id === id)?.name;
  const issuesInSprint = (id) => issues.filter((i) => i.sprint_id === id);

  return (
    <AppShell>
      <div className="page">
        <h2>Sprints</h2>
        <p className="page-subtitle">Plan work into time-boxed sprints per project.</p>

        <div className="panel" style={{ maxWidth: 560, marginBottom: 28 }}>
          <h3 style={{ marginTop: 0 }}>Create New Sprint</h3>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required>
              <option value="">Select a project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input
              placeholder="Sprint name (e.g. Sprint 1)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={{ flex: 1, padding: 10, border: "1px solid var(--border)", borderRadius: 8 }} />
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={{ flex: 1, padding: 10, border: "1px solid var(--border)", borderRadius: 8 }} />
            </div>
            <button className="btn" type="submit" disabled={projects.length === 0}>Create Sprint</button>
          </form>
        </div>

        <h3>All Sprints</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {sprints.map((s) => {
            const items = issuesInSprint(s.id);
            const resolved = items.filter((i) => i.status === "resolved").length;
            return (
              <div className="panel" key={s.id}>
                <h4 style={{ margin: "0 0 4px", color: "var(--maroon)" }}>{s.name}</h4>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)" }}>
                  {projectName(s.project_id)}
                  {s.start_date && ` • ${s.start_date} → ${s.end_date || "?"}`}
                </p>
                <p style={{ margin: 0, fontSize: 13 }}>
                  {items.length} issue{items.length !== 1 ? "s" : ""} • {resolved} resolved
                </p>
              </div>
            );
          })}
          {sprints.length === 0 && <p className="hint">No sprints yet — create one above.</p>}
        </div>
      </div>
    </AppShell>
  );
}
