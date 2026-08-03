import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";

export default function IssueForm() {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", project_id: "", sprint_id: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [suggestedPriority, setSuggestedPriority] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/projects").then((res) => setProjects(res.data));
  }, []);

  useEffect(() => {
    if (form.project_id) {
      api.get("/sprints", { params: { project_id: form.project_id } }).then((res) => setSprints(res.data));
    } else {
      setSprints([]);
    }
  }, [form.project_id]);

  // Debounced duplicate-check + priority suggestion once there's enough text
  useEffect(() => {
    if (!form.title || form.description.length < 15 || !form.project_id) {
      setDuplicates([]);
      setSuggestedPriority(null);
      return;
    }
    const handle = setTimeout(() => {
      api.post("/issues/check-duplicates", {
        title: form.title, description: form.description, project_id: Number(form.project_id),
      }).then((res) => setDuplicates(res.data)).catch(() => {});
      api.post("/issues/suggest-priority", { title: form.title, description: form.description })
        .then((res) => setSuggestedPriority(res.data.suggested_priority)).catch(() => {});
    }, 600);
    return () => clearTimeout(handle);
  }, [form.title, form.description, form.project_id]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/issues", {
        ...form,
        project_id: Number(form.project_id),
        sprint_id: form.sprint_id ? Number(form.sprint_id) : null,
        generate_report: true,
      });
      navigate(`/issues/${res.data.id}/report`);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create issue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="page">
        <h2>Create New Issue</h2>
        <p className="page-subtitle">Report a bug and let AI generate a structured analysis.</p>

        <div className="form-card">
          {error && <p className="error">{error}</p>}

          {duplicates.length > 0 && (
            <div style={{ background: "#fff4e5", border: "1px solid #f0c987", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13 }}>
              <strong>Possible duplicate{duplicates.length > 1 ? "s" : ""} found:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {duplicates.map((d) => (
                  <li key={d.issue_id}>{d.title} ({Math.round(d.similarity * 100)}% similar)</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label>Project</label>
            <select value={form.project_id} onChange={update("project_id")} required>
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {sprints.length > 0 && (
              <>
                <label>Sprint (optional)</label>
                <select value={form.sprint_id} onChange={update("sprint_id")}>
                  <option value="">No sprint</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </>
            )}

            <label>Issue Title</label>
            <input
              placeholder="Example: Checkout page crashes"
              value={form.title}
              onChange={update("title")}
              required
            />

            <label>Bug Description</label>
            <textarea
              placeholder="Describe what happened, what you expected, and any steps that caused the issue..."
              value={form.description}
              onChange={update("description")}
              rows={6}
              required
            />

            <label>
              Priority
              {suggestedPriority && suggestedPriority !== form.priority && (
                <span style={{ fontWeight: 400, color: "var(--maroon)", marginLeft: 8 }}>
                  (AI suggests: {suggestedPriority}{" "}
                  <button type="button" onClick={() => setForm({ ...form, priority: suggestedPriority })}
                    style={{ background: "none", border: "none", color: "var(--maroon)", textDecoration: "underline", cursor: "pointer", fontSize: 12 }}>
                    use this
                  </button>)
                </span>
              )}
            </label>
            <select value={form.priority} onChange={update("priority")}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button className="btn" type="submit" disabled={projects.length === 0 || submitting} style={{ marginTop: 18, width: "100%" }}>
              {submitting ? "Generating..." : "✦ Generate AI Report"}
            </button>
            {projects.length === 0 && <p className="hint" style={{ marginTop: 8 }}>Create a project first.</p>}
          </form>
        </div>
      </div>
    </AppShell>
  );
}
