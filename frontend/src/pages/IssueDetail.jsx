import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";

const TABS = ["Report", "Comments", "Attachments", "Activity"];

const STATUS_LABELS = { open: "Open", in_progress: "In Progress", in_review: "In Review", resolved: "Resolved" };

// Mirrors backend app/core/state_machine.py — which transitions are legal from each status
const TRANSITIONS = {
  open: ["in_progress"],
  in_progress: ["in_review", "open"],
  in_review: ["resolved", "in_progress"],
  resolved: ["open"],
};

export default function IssueDetail() {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("Report");
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const navigate = useNavigate();

  const loadIssue = () => api.get(`/issues/${id}`).then((res) => setIssue(res.data)).catch(() => setError("Issue not found"));
  const loadComments = () => api.get(`/issues/${id}/comments`).then((res) => setComments(res.data));
  const loadAttachments = () => api.get(`/issues/${id}/attachments`).then((res) => setAttachments(res.data));
  const loadActivity = () => api.get(`/issues/${id}/activity`).then((res) => setActivity(res.data));
  const loadUsers = () => api.get("/users").then((res) => setUsers(res.data));

  useEffect(() => {
    loadIssue();
    loadComments();
    loadAttachments();
    loadActivity();
    loadUsers();
  }, [id]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await api.post(`/issues/${id}/generate-report`);
      setIssue(res.data);
    } finally {
      setRegenerating(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await api.post(`/issues/${id}/comments`, { content: newComment });
    setNewComment("");
    loadComments();
    loadActivity();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await api.post(`/issues/${id}/attachments`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    loadAttachments();
    loadActivity();
    e.target.value = "";
  };

  const handleTransition = async (newStatus) => {
    setActionError("");
    try {
      const res = await api.put(`/issues/${id}`, { status: newStatus });
      setIssue(res.data);
      loadActivity();
    } catch (err) {
      setActionError(err.response?.data?.detail || "Could not change status");
    }
  };

  const handleAssigneeChange = async (e) => {
    const value = e.target.value;
    const res = await api.put(`/issues/${id}`, { assignee_id: value ? Number(value) : null });
    setIssue(res.data);
    loadActivity();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this issue? This cannot be undone.")) return;
    await api.delete(`/issues/${id}`);
    navigate("/issues");
  };

  const downloadUrl = (attachmentId) =>
    `${api.defaults.baseURL}/issues/${id}/attachments/${attachmentId}/download`;

  if (error) {
    return (
      <AppShell><div className="page"><p className="error">{error}</p><Link to="/issues">Back to Issues</Link></div></AppShell>
    );
  }
  if (!issue) {
    return <AppShell><div className="page"><p>Loading...</p></div></AppShell>;
  }

  const reporter = users.find((u) => u.id === issue.reporter_id);
  const nextStatuses = TRANSITIONS[issue.status] || [];

  return (
    <AppShell>
      <div className="page">
        <div className="issue-detail-header">
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/issues")}>
            ← Back to Issues
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑 Delete Issue</button>
        </div>

        <h2>{issue.title}</h2>
        <p className="page-subtitle">{issue.description}</p>

        <div className="report-tags">
          <span className={`priority-badge priority-${issue.priority}`}>{issue.priority}</span>
          <span className="priority-badge" style={{ background: "#eef1f5", color: "#444" }}>
            {STATUS_LABELS[issue.status]}
          </span>
          {issue.category && <span className="priority-badge" style={{ background: "#e6ecfd", color: "#3450c9" }}>{issue.category}</span>}
        </div>

        {actionError && <p className="error">{actionError}</p>}

        <div className="issue-detail-layout">
          <div className="issue-detail-main">
            <div className="toolbar" style={{ marginBottom: 0 }}>
              {TABS.map((t) => (
                <button
                  key={t}
                  className={tab === t ? "btn btn-sm" : "btn btn-outline btn-sm"}
                  onClick={() => setTab(t)}
                  style={{ flex: "none" }}
                >
                  {t}{t === "Comments" && comments.length > 0 ? ` (${comments.length})` : ""}
                  {t === "Attachments" && attachments.length > 0 ? ` (${attachments.length})` : ""}
                </button>
              ))}
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              {tab === "Report" && (
                issue.ai_steps_to_reproduce ? (
                  <>
                    {issue.ai_summary && (
                      <div className="report-section">
                        <h4>Summary</h4>
                        <pre>{issue.ai_summary}</pre>
                      </div>
                    )}
                    <div className="report-section">
                      <h4>Steps to Reproduce</h4>
                      <pre>{issue.ai_steps_to_reproduce}</pre>
                    </div>
                    <div className="report-section">
                      <h4>Expected Result</h4>
                      <pre>{issue.ai_expected_result}</pre>
                    </div>
                    <div className="report-section">
                      <h4>Actual Result</h4>
                      <pre>{issue.ai_actual_result}</pre>
                    </div>
                    <button className="btn btn-outline" onClick={handleRegenerate} disabled={regenerating}>
                      {regenerating ? "Generating..." : "↻ Regenerate AI Report"}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="hint">No AI report generated yet for this issue.</p>
                    <button className="btn" onClick={handleRegenerate} disabled={regenerating}>
                      {regenerating ? "Generating..." : "✦ Generate AI Report"}
                    </button>
                  </>
                )
              )}

              {tab === "Comments" && (
                <>
                  <form onSubmit={handleAddComment} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={{ flex: 1, padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}
                    />
                    <button className="btn" type="submit">Post</button>
                  </form>
                  {comments.length === 0 && <p className="hint">No comments yet.</p>}
                  {comments.map((c) => (
                    <div className="list-row" key={c.id}>
                      <div className="list-row-title">{c.author_username}</div>
                      <p style={{ margin: "4px 0" }}>{c.content}</p>
                      <div className="list-row-meta">{new Date(c.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </>
              )}

              {tab === "Attachments" && (
                <>
                  <label className="btn btn-outline" style={{ display: "inline-block", marginBottom: 16, cursor: "pointer" }}>
                    + Upload File
                    <input type="file" onChange={handleUpload} style={{ display: "none" }} />
                  </label>
                  {attachments.length === 0 && <p className="hint">No attachments yet.</p>}
                  {attachments.map((a) => (
                    <div className="list-row" key={a.id}>
                      <a href={downloadUrl(a.id)} target="_blank" rel="noreferrer" className="list-row-title" style={{ color: "var(--maroon)" }}>
                        {a.filename}
                      </a>
                      <div className="list-row-meta">{(a.size_bytes / 1024).toFixed(1)} KB • {new Date(a.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </>
              )}

              {tab === "Activity" && (
                <>
                  {activity.length === 0 && <p className="hint">No activity yet.</p>}
                  {activity.map((a) => (
                    <div className="list-row" key={a.id}>
                      <div className="list-row-title">{a.username} — {a.action.replace("_", " ")}</div>
                      {a.detail && <p style={{ margin: "4px 0", fontSize: 13, color: "#555" }}>{a.detail}</p>}
                      <div className="list-row-meta">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <aside className="issue-detail-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-section-title">Workflow Status Actions</div>
              {nextStatuses.map((s) => (
                <button key={s} className="workflow-btn" onClick={() => handleTransition(s)}>
                  Transition to {STATUS_LABELS[s]}
                  <span className="check">✓</span>
                </button>
              ))}
              {nextStatuses.length === 0 && <p className="hint" style={{ fontSize: 12, margin: 0 }}>No further transitions available.</p>}
            </div>

            <div className="sidebar-section">
              <div className="sidebar-field">
                <label>Assigned To</label>
                <select value={issue.assignee_id || ""} onChange={handleAssigneeChange}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>
              <div className="sidebar-field">
                <label>Reporter</label>
                <div className="value">{reporter?.username || "—"}</div>
              </div>
              <div className="sidebar-field">
                <label>Reported On</label>
                <div className="value-muted">{new Date(issue.created_at).toLocaleString()}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}