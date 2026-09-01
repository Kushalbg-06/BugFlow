import { useEffect, useState } from "react";
import api from "../api";
import AppShell from "../components/AppShell";

const inputStyle = { padding: 10, border: "1px solid var(--border)", borderRadius: 8 };

export default function Sprints() {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [form, setForm] = useState({ name: "", project_id: "", start_date: "", end_date: "" });
  const [error, setError] = useState("");

  // editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", project_id: "", start_date: "", end_date: "" });
  const [editError, setEditError] = useState("");

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

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditError("");
    setEditForm({
      name: s.name,
      project_id: s.project_id,
      start_date: s.start_date || "",
      end_date: s.end_date || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError("");
  };

  const handleUpdate = async (sprintId) => {
    setEditError("");
    try {
      await api.put(`/sprints/${sprintId}`, {
        ...editForm,
        project_id: Number(editForm.project_id),
      });
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.detail || "Could not update sprint");
    }
  };

  const handleDelete = async (sprintId) => {
    if (!window.confirm("Delete this sprint? This cannot be undone.")) return;
    try {
      await api.delete(`/sprints/${sprintId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete sprint");
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
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">Select a project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input
              placeholder="Sprint name (e.g. Sprint 1)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <button className="btn" type="submit" disabled={projects.length === 0}>Create Sprint</button>
          </form>
        </div>

        <h3>All Sprints</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {sprints.map((s) => {
            const items = issuesInSprint(s.id);
            const resolved = items.filter((i) => i.status === "resolved").length;
            const isEditing = editingId === s.id;

            return (
              <div className="panel" key={s.id} style={{ overflow: "hidden" }}>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {editError && <p className="error" style={{ margin: 0 }}>{editError}</p>}
                    <select
                      value={editForm.project_id}
                      onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value })}
                      style={inputStyle}
                    >
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={inputStyle}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                      <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-sm" type="button" onClick={() => handleUpdate(s.id)}>
                        Save
                      </button>
                      <button className="btn btn-outline btn-sm" type="button" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <h4 style={{ margin: "0 0 4px", color: "var(--maroon)", minWidth: 0, overflowWrap: "break-word" }}>
                        {s.name}
                      </h4>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => startEdit(s)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDelete(s.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)" }}>
                      {projectName(s.project_id)}
                      {s.start_date && ` • ${s.start_date} → ${s.end_date || "?"}`}
                    </p>
                    <p style={{ margin: 0, fontSize: 13 }}>
                      {items.length} issue{items.length !== 1 ? "s" : ""} • {resolved} resolved
                    </p>
                  </>
                )}
              </div>
            );
          })}
          {sprints.length === 0 && <p className="hint">No sprints yet — create one above.</p>}
        </div>
      </div>
    </AppShell>
  );
}

