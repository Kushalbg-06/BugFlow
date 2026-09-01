import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";
const CATEGORIES = ["General", "Payment", "Authentication", "UI/UX", "Performance", "Database", "API", "Security"];
const COMPONENTS = ["Unclassified", "Payment Gateway", "Auth Service", "Dashboard", "Issue Tracker", "Sprint Planner", "Notifications", "File Uploads"];
const DEFECT_TYPES = ["Functional Defect", "Security Defect", "Performance Defect", "UI Defect", "Data Defect", "Compatibility Defect"];
export default function IssueForm() {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", severity: "medium", priority: "medium",
    project_id: "", sprint_id: "", category: "", component: "", defect_type: "",
  });
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [previewReport, setPreviewReport] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const generatedFromDescription = useRef("");
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

  // Debounced duplicate check once there's enough text
  useEffect(() => {
    if (!form.title || form.description.length < 15 || !form.project_id) {
      setDuplicates([]);
      return;
    }
    const handle = setTimeout(() => {
      api.post("/issues/check-duplicates", {
        title: form.title, description: form.description, project_id: Number(form.project_id),
      }).then((res) => setDuplicates(res.data)).catch(() => {});
    }, 600);
    return () => clearTimeout(handle);
  }, [form.title, form.description, form.project_id]);

  // Debounced AI classification suggestion as they type title and description
  useEffect(() => {
    if (!form.title.trim() || form.description.trim().length < 10) {
      setSuggestions(null);
      return;
    }
    const handle = setTimeout(() => {
      api.post("/issues/classify", { title: form.title, description: form.description })
        .then((res) => setSuggestions(res.data))
        .catch(() => {});
    }, 800);
    return () => clearTimeout(handle);
  }, [form.title, form.description]);

  // Editing the description after AI cleaned it invalidates the "cleaned" checkmark
  useEffect(() => {
    if (previewReport && form.description !== generatedFromDescription.current) {
      setPreviewReport(null);
    }
  }, [form.description]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleAcceptSuggestions = () => {
    if (!suggestions) return;
    setForm((f) => ({
      ...f,
      category: suggestions.category || f.category,
      component: suggestions.module || f.component,
      defect_type: suggestions.defect_type || f.defect_type,
      severity: suggestions.severity || f.severity,
      priority: suggestions.priority || f.priority,
    }));
    setSuggestions(null); // Clear suggestions once accepted
  };

  const handleAiClean = async () => {
    if (!form.title.trim() || form.description.trim().length < 10) return;
    setError("");
    setGenerating(true);
    try {
      const [reportRes, classifyRes] = await Promise.all([
        api.post("/issues/preview-report", { title: form.title, description: form.description }),
        api.post("/issues/classify", { title: form.title, description: form.description })
      ]);
      
      setForm((f) => ({
        ...f,
        description: reportRes.data.summary,
        category: classifyRes.data.category || "",
        component: classifyRes.data.module || "",
        defect_type: classifyRes.data.defect_type || "",
        severity: classifyRes.data.severity || f.severity,
        priority: classifyRes.data.priority || f.priority,
      }));
      
      generatedFromDescription.current = reportRes.data.summary;
      setPreviewReport(reportRes.data);
      setSuggestions(null); // Clear suggestions as they are now accepted & cleaned
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate report");
    } finally {
      setGenerating(false);
    }
  };
  const handleCancel = () => navigate("/issues");
  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/issues", {
        title: form.title,
        description: form.description,
        severity: form.severity,
        priority: form.priority,
        project_id: Number(form.project_id),
        sprint_id: form.sprint_id ? Number(form.sprint_id) : null,
        category: form.category || null,
        component: form.component || null,
        defect_type: form.defect_type || null,
        generate_report: true, // always ensures the saved report matches the final description
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
        <div className="issue-modal-card">
          <div className="issue-modal-header">
            <h2>New Issue</h2>
            <button
              type="button"
              className="ai-clean-btn"
              onClick={handleAiClean}
              disabled={!form.title.trim() || form.description.trim().length < 10 || generating}
            >
              {generating ? "Working..." : "✨ AI Clean & Triage"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {duplicates.length > 0 && (
            <div className="callout callout-warning">
              <div className="callout-warning-title">⚠ A similar issue already exists!</div>
              {duplicates.map((d) => (
                <div className="callout-warning-issue" key={d.issue_id}>
                  <div className="callout-warning-issue-row">
                    <span>#{d.issue_id} {d.title}</span>
                    <span className="similarity-badge">{Math.round(d.similarity * 100)}% similar</span>
                  </div>
                  <Link to={`/issues/${d.issue_id}/report`} className="btn btn-outline btn-sm" style={{ marginTop: 8, display: "inline-block" }}>
                    View Issue #{d.issue_id}
                  </Link>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSave}>
          <label>Project</label>
          <select value={form.project_id} onChange={update("project_id")} required>
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
            <label>Title</label>
            <input
              placeholder="Example: Checkout page crashes"
              value={form.title}
              onChange={update("title")}
              required
            />
            <label>Description</label>
            <div style={{ position: "relative" }}>
              <textarea
                placeholder="Describe what happened..."
                value={form.description}
                onChange={update("description")}
                rows={4}
                required
                style={{ paddingRight: previewReport ? 36 : undefined }}
              />
              {previewReport && <span className="ai-check" title="Cleaned by AI">✓</span>}
            </div>

            {suggestions && (
            <div className="ai-triage-card">
            <div className="ai-triage-header">
            <span className="ai-triage-icon">✨</span>
            <span>AI Triage Suggestion</span>
          </div>

              <div className="ai-triage-content">

                <div className="ai-triage-grid">

                  <div className="ai-triage-item">
                    <div className="ai-triage-label">Category</div>
                    <div className="ai-triage-value">
                      {suggestions.category || "Not classified"}
                    </div>
                  </div>

                  <div className="ai-triage-item">
                    <div className="ai-triage-label">Module / Component</div>
                    <div className="ai-triage-value">
                      {suggestions.module || "Not classified"}
                    </div>
                  </div>

                  <div className="ai-triage-item">
                    <div className="ai-triage-label">Defect Type</div>
                    <div className="ai-triage-value">
                      {suggestions.defect_type || "Not classified"}
                    </div>
                  </div>
                  

                  <div className="ai-triage-item">
                    <div className="ai-triage-label">Suggested Severity</div>
                    <div className="ai-triage-value ai-triage-capitalize">
                      {suggestions.severity || "Not specified"}
                    </div>
                  </div>

                  <div className="ai-triage-item">
                    <div className="ai-triage-label">Suggested Priority</div>
                    <div className="ai-triage-value ai-triage-capitalize">
                      {suggestions.priority || "Not specified"}
                    </div>
                  </div>

                </div>

                <div className="ai-triage-actions">
                  <button
                    type="button"
                    className="btn ai-triage-accept"
                    onClick={handleAcceptSuggestions}
                  >
                    Accept Suggestions
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline ai-triage-dismiss"
                    onClick={() => setSuggestions(null)}
                  >
                    Dismiss
                  </button>
                </div>

              </div>
            </div>
          )}
                      
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
            <label>Category</label>
            <select value={form.category} onChange={update("category")}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label>Module / Component</label>
            <select value={form.component} onChange={update("component")}>
              <option value="">Select module/component</option>
              {COMPONENTS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label>Defect Type</label>
            <select value={form.defect_type} onChange={update("defect_type")}>
              <option value="">Select defect type</option>
              {DEFECT_TYPES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <label>Priority</label>
            <select value={form.priority} onChange={update("priority")}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <label>Severity</label>
            <select value={form.severity} onChange={update("severity")}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <div className="issue-modal-actions">
              <button type="button" className="btn btn-outline" onClick={handleCancel} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={submitting || projects.length === 0}>
                {submitting ? "Saving..." : "Save & Generate Report"}
              </button>
            </div>
            {projects.length === 0 && <p className="hint" style={{ marginTop: 8 }}>Create a project first.</p>}
          </form>
        </div>
      </div>
    </AppShell>
  );
}