import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";

const TABS = ["Report","Resolution", "Comments", "Attachments", "Activity"];

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
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [resolution, setResolution] = useState(null);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const navigate = useNavigate();

  const loadIssue = () => api.get(`/issues/${id}`).then((res) => setIssue(res.data)).catch(() => setError("Issue not found"));
  const loadComments = () => api.get(`/issues/${id}/comments`).then((res) => setComments(res.data));
  const loadAttachments = () => api.get(`/issues/${id}/attachments`).then((res) => setAttachments(res.data));
  const loadActivity = () => api.get(`/issues/${id}/activity`).then((res) => setActivity(res.data));
  const loadUsers = () => api.get("/users").then((res) => setUsers(res.data));
  const loadResolution = () => {
    setResolutionLoading(true);
    setResolutionError("");
    api
      .get(`/issues/${id}/resolution-assistant`)
      .then((res) => setResolution(res.data))
      .catch(() => setResolutionError("Could not load resolution assistant"))
      .finally(() => setResolutionLoading(false));
  };

  useEffect(() => {
    loadIssue();
    loadComments();
    loadAttachments();
    loadActivity();
    loadUsers();
    loadResolution();
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

  const handleDeleteAttachment = async (attachmentId, filename) => {
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return;

    setDeletingAttachmentId(attachmentId);
    try {
      await api.delete(`/issues/${id}/attachments/${attachmentId}`);
      setAttachments(attachments.filter((a) => a.id !== attachmentId));
      loadActivity();
    } catch (err) {
      alert(err.response?.data?.detail || "Error deleting attachment");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;

    setDeletingCommentId(commentId);
    try {
      await api.delete(`/issues/${id}/comments/${commentId}`);
      setComments(comments.filter((c) => c.id !== commentId));
      loadActivity();
    } catch (err) {
      alert(err.response?.data?.detail || "Error deleting comment");
    } finally {
      setDeletingCommentId(null);
    }
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

  const handleDownloadAttachment = async (attachmentId, filename) => {
    try {
      const response = await api.get(`/issues/${id}/attachments/${attachmentId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.detail || "Error downloading file");
    }
  };
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem(`verification-${id}`);
    return saved ? JSON.parse(saved) : [];
  });

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
          {issue.component && <span className="priority-badge" style={{ background: "#e8f5e9", color: "#2e7d32" }}>{issue.component}</span>}
          {issue.defect_type && <span className="priority-badge" style={{ background: "#fff3e0", color: "#e65100" }}>{issue.defect_type}</span>}
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
                    {issue.ai_environment && (
                      <div className="report-section">
                        <h4>Environment</h4>
                        <pre>{issue.ai_environment}</pre>
                      </div>
                    )}
                    {issue.ai_root_cause && (
                      <div className="report-section">
                        <h4>Root Cause Analysis</h4>
                        <pre>{issue.ai_root_cause}</pre>
                      </div>
                    )}
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
                    <div className="comment-row" key={c.id}>
                      <div className="comment-content">
                        <div className="comment-header">
                          <div className="comment-author">{c.author_username}</div>
                          <div className="comment-time">{new Date(c.created_at).toLocaleString()}</div>
                        </div>
                        <p className="comment-text">{c.content}</p>
                      </div>
                      <button
                        className="btn btn-danger btn-sm comment-delete-btn"
                        onClick={() => handleDeleteComment(c.id)}
                        disabled={deletingCommentId === c.id}
                        title="Delete comment"
                      >
                        {deletingCommentId === c.id ? "..." : "Delete"}
                      </button>
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
                    <div className="attachment-row" key={a.id}>
                      <div className="attachment-content">
                        <button
                          onClick={() => handleDownloadAttachment(a.id, a.filename)}
                          className="attachment-link"
                          title="Download file"
                        >
                          📎 {a.filename}
                        </button>
                        <div className="attachment-meta">
                          {(a.size_bytes / 1024).toFixed(1)} KB • {new Date(a.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        className="btn btn-danger btn-sm attachment-delete-btn"
                        onClick={() => handleDeleteAttachment(a.id, a.filename)}
                        disabled={deletingAttachmentId === a.id}
                        title="Delete attachment"
                      >
                        {deletingAttachmentId === a.id ? "..." : "Delete"}
                      </button>
                    </div>
                  ))}
                </>
              )}

              {tab === "Activity" && (
                <>
                  {activity.length === 0 && <p className="hint">No activity yet.</p>}
                  {activity.map((a) => (
                    <div className="activity-row" key={a.id}>
                      <div className="activity-content">
                        <div className="activity-header">
                          <div className="activity-user">{a.username}</div>
                          <div className="activity-time">{new Date(a.created_at).toLocaleString()}</div>
                        </div>
                        <div className="activity-action">{a.action.replace(/_/g, " ")}</div>
                        {a.detail && <p className="activity-detail">{a.detail}</p>}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {tab === "Resolution" && (
                resolutionLoading ? (
                  <p className="hint">Loading resolution assistance...</p>
                ) : resolutionError ? (
                  <p className="error">{resolutionError}</p>
                ) : resolution ? (
                  <div className="resolution-panel">
                    {/* Header */}
                    <div className="resolution-header">
                      <div className="resolution-header-content">
                        <h3>🤖 AI Resolution Assistant</h3>
                        <p>AI-generated insights to help you investigate and resolve this issue faster.</p>
                      </div>
                      <button className="btn btn-sm btn-outline" onClick={loadResolution} disabled={resolutionLoading}>
                        🔄 Regenerate
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="resolution-stats-grid">
                      <div className="stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-info">
                          <div className="stat-label">Confidence</div>
                          <div className="stat-value">{resolution.confidence_score}%</div>
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-icon">🧩</div>
                        <div className="stat-info">
                          <div className="stat-label">Impact Areas</div>
                          <div className="stat-value-sm">{resolution.impact_area.join(", ")}</div>
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-icon">⏱</div>
                        <div className="stat-info">
                          <div className="stat-label">Est. Effort</div>
                          <div className="stat-value-sm">{resolution.estimated_effort}</div>
                        </div>
                      </div>
                    </div>

                    {/* Root Cause Hypotheses */}
                    <div className="resolution-section">
                      <div className="section-header">
                        <span className="section-icon">🎯</span>
                        <h4>Root Cause Hypotheses</h4>
                      </div>
                      <div className="hypothesis-list">
                        {resolution.root_cause_hypotheses.map((h, i) => (
                          <div key={i} className="hypothesis-item">
                            <div className="hypothesis-number">{i + 1}</div>
                            <div className="hypothesis-content">
                              <span className="hypothesis-text">{h.hypothesis}</span>
                              <span className="confidence-badge">{h.confidence}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Investigation Areas */}
                    <div className="resolution-section">
                      <div className="section-header">
                        <span className="section-icon">🔍</span>
                        <h4>Investigation Areas</h4>
                      </div>
                      <div className="investigation-list">
                        {resolution.investigation_areas.map((a, i) => (
                          <div key={i} className="investigation-item">
                            <div className="investigation-number">{i + 1}</div>
                            <div className="investigation-content">
                              <div className="investigation-title">{a.area}</div>
                              <div className="investigation-detail">{a.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Code Areas */}
                    <div className="resolution-section">
                      <div className="section-header">
                        <span className="section-icon">🧑‍💻</span>
                        <h4>Suggested Code Areas</h4>
                      </div>
                      <div className="code-areas-container">
                        {resolution.suggested_code_areas.frontend.length > 0 && (
                          <div className="code-area-box">
                            <div className="code-area-header">Frontend</div>
                            <div className="code-area-list">
                              {resolution.suggested_code_areas.frontend.map((f, i) => (
                                <div key={i} className="code-area-item">• {f}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {resolution.suggested_code_areas.backend.length > 0 && (
                          <div className="code-area-box">
                            <div className="code-area-header">Backend</div>
                            <div className="code-area-list">
                              {resolution.suggested_code_areas.backend.map((f, i) => (
                                <div key={i} className="code-area-item">• {f}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {resolution.suggested_code_areas.api.length > 0 && (
                          <div className="code-area-box">
                            <div className="code-area-header">API</div>
                            <div className="code-area-list">
                              {resolution.suggested_code_areas.api.map((f, i) => (
                                <div key={i} className="code-area-item">• {f}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Debugging Steps */}
                    <div className="resolution-section">
                      <div className="section-header">
                        <span className="section-icon">🐞</span>
                        <h4>Debugging Steps</h4>
                      </div>
                      <div className="debugging-list">
                        {resolution.debugging_steps.map((s, i) => (
                          <div key={i} className="debugging-item">
                            <div className="debugging-number">{i + 1}</div>
                            <div className="debugging-content">
                              <div className="debugging-title">{s.step}</div>
                              <div className="debugging-detail">{s.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mismatch Alert */}
                    {resolution.detected_mismatch && (
                      <div className="resolution-section alert-section">
                        <div className="section-header">
                          <span className="section-icon">⚠️</span>
                          <h4>Detected Mismatch</h4>
                        </div>
                        <div className="mismatch-card">
                          <div className="mismatch-row">
                            <span className="mismatch-label">Expected:</span>
                            <strong className="mismatch-value">{resolution.detected_mismatch.expected}</strong>
                          </div>
                          <div className="mismatch-row">
                            <span className="mismatch-label">Actual:</span>
                            <strong className="mismatch-value">{resolution.detected_mismatch.actual}</strong>
                          </div>
                          <div className="mismatch-note">
                            <strong>Likely issue:</strong> {resolution.detected_mismatch.likely_issue}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Similar Defects */}
                    <div className="resolution-section">
                      <div className="section-header">
                        <span className="section-icon">🔗</span>
                        <h4>Similar Defects</h4>
                      </div>
                      {resolution.similar_defects.length === 0 ? (
                        <p className="hint">No similar defects found.</p>
                      ) : (
                        <div className="similar-defects-list">
                          {resolution.similar_defects.map((d) => (
                            <div key={d.issue_id} className="defect-item">
                              <span className="defect-id">BUG-{d.issue_id}</span>
                              <span className="defect-title">{d.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Previous Resolution */}
                    {resolution.previous_resolution && (
                      <div className="resolution-section">
                        <div className="section-header">
                          <span className="section-icon">📝</span>
                          <h4>Previous Resolution</h4>
                        </div>
                        <pre className="code-block">{resolution.previous_resolution}</pre>
                      </div>
                    )}

                    {/* Possible Resolution */}
                    <div className="resolution-section resolution-highlight">
                      <div className="section-header">
                        <span className="section-icon">💡</span>
                        <h4>Possible Resolution</h4>
                      </div>

                      <div className="solution-content">
                        {resolution.possible_resolution}
                      </div>
                    </div>

                    {/* Verification Checklist */}
                    <div className="resolution-section">
                      <div className="section-header">
                        <span className="section-icon">🧪</span>
                        <h4>Verification Checklist</h4>
                      </div>
                      <div className="checklist">
                        {resolution.verification_checklist.map((c, i) => (
                          <label key={i} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checkedItems.includes(i)}
                        onChange={(e) => {
                        const updated = e.target.checked
                        ? [...checkedItems, i]
                        : checkedItems.filter((index) => index !== i);

                        setCheckedItems(updated);
                        localStorage.setItem(
                        `verification-${id}`,
                        JSON.stringify(updated)
                         );
                         }}
                        />

                        <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="hint">No resolution assistance generated yet.</p>
                )
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
                <label>Category</label>
                <div className="value">{issue.category || "—"}</div>
              </div>
              <div className="sidebar-field">
                <label>Module / Component</label>
                <div className="value">{issue.component || "—"}</div>
              </div>
              <div className="sidebar-field">
                <label>Defect Type</label>
                <div className="value">{issue.defect_type || "—"}</div>
              </div>
              <div className="sidebar-field">
                <label>Reported On</label>
                <div className="value-muted">{new Date(issue.created_at).toLocaleString()}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        /* ===== ATTACHMENT STYLES ===== */
        .attachment-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-bottom: 8px;
          background-color: #fafafa;
          transition: all 0.2s ease;
        }

        .attachment-row:hover {
          background-color: #f5f5f5;
          border-color: #ddd;
        }

        .attachment-content {
          flex: 1;
          min-width: 0;
        }

        .attachment-link {
          display: inline-block;
          background: none;
          border: none;
          color: var(--maroon);
          text-decoration: none;
          font-weight: 500;
          word-break: break-word;
          transition: color 0.2s ease;
          cursor: pointer;
          padding: 0;
          font: inherit;
          text-align: left;
        }

        .attachment-link:hover {
          color: #c41e3a;
          text-decoration: underline;
        }

        .attachment-link:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .attachment-meta {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .attachment-delete-btn {
          flex-shrink: 0;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          min-width: auto;
        }

        .attachment-delete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ===== COMMENT STYLES ===== */
        .comment-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-bottom: 8px;
          background-color: #fafafa;
          transition: all 0.2s ease;
        }

        .comment-row:hover {
          background-color: #f5f5f5;
          border-color: #ddd;
        }

        .comment-content {
          flex: 1;
          min-width: 0;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          gap: 12px;
        }

        .comment-author {
          font-weight: 600;
          color: var(--text-primary);
        }

        .comment-time {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
        }

        .comment-text {
          margin: 0;
          color: var(--text-primary);
          line-height: 1.5;
        }

        .comment-delete-btn {
          flex-shrink: 0;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          min-width: auto;
        }

        .comment-delete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ===== ACTIVITY STYLES ===== */
        .activity-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-bottom: 8px;
          background-color: #fafafa;
          transition: all 0.2s ease;
        }

        .activity-row:hover {
          background-color: #f5f5f5;
          border-color: #ddd;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          gap: 12px;
        }

        .activity-user {
          font-weight: 600;
          color: var(--text-primary);
        }

        .activity-time {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
        }

        .activity-action {
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .activity-detail {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: #666;
          font-style: italic;
        }

        /* ===== BUTTON STYLES ===== */
        .btn-danger {
          background-color: #ffe6e6;
          color: #d9001b;
          border: 1px solid #ffcccc;
          font-weight: 700;
        }

        .btn-danger:hover:not(:disabled) {
          background-color: #ffcccc;
          border-color: #ff9999;
          color: #b30015;
        }

        .btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ===== RESOLUTION PANEL STYLES ===== */
        .resolution-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .resolution-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: linear-gradient(135deg, #f5f1ff 0%, #ede9fe 100%);
          border: 1px solid #e2dbfc;
          border-radius: 12px;
        }

        .resolution-header-content h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          color: #5b3df5;
        }

        .resolution-header-content p {
          margin: 0;
          font-size: 13px;
          color: #666;
          line-height: 1.4;
        }

        /* Stats Grid */
        .resolution-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f9f8fc;
          border: 1px solid #ede9fe;
          border-radius: 10px;
        }

        .stat-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .stat-info {
          flex: 1;
          min-width: 0;
        }

        .stat-label {
          font-size: 11px;
          font-weight: 600;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #5b3df5;
        }

        .stat-value-sm {
          font-size: 12px;
          font-weight: 600;
          color: #333;
          line-height: 1.3;
        }

        /* Resolution Sections */
        .resolution-section {
          padding: 16px;
          background: #fafbfc;
          border: 1px solid var(--border);
          border-radius: 10px;
        }

        .resolution-section.alert-section {
          background: #fffbf0;
          border-color: #fae8d5;
        }

        .resolution-section.resolution-highlight {
          background: #f0f9f3;
          border: 1px solid #d0ecc9;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 2px solid rgba(91, 61, 245, 0.1);
        }

        .section-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .section-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #333;
        }

        /* Hypothesis List */
        .hypothesis-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hypothesis-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .hypothesis-number {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          background: #ede9fe;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 700;
          color: #5b3df5;
          flex-shrink: 0;
        }

        .hypothesis-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex: 1;
          padding: 8px 0;
        }

        .hypothesis-text {
          font-size: 13px;
          color: #333;
        }

        .confidence-badge {
          background: #ede9fe;
          color: #5b3df5;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Investigation List */
        .investigation-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .investigation-item {
          display: flex;
          gap: 12px;
        }

        .investigation-number {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          background: #e3f2fd;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 700;
          color: #1976d2;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .investigation-content {
          flex: 1;
          min-width: 0;
        }

        .investigation-title {
          font-weight: 600;
          color: #333;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .investigation-detail {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }

        /* Code Areas */
        .code-areas-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .code-area-box {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          padding: 12px;
          transition: all 0.2s ease;
        }

        .code-area-box:hover {
          border-color: #d0d0d0;
          background: #fafbfc;
        }

        .code-area-header {
          font-size: 11px;
          font-weight: 700;
          color: #5b3df5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 2px solid #ede9fe;
        }

        .code-area-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .code-area-item {
          font-size: 12px;
          color: #333;
          line-height: 1.3;
        }

        /* Debugging Steps */
        .debugging-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .debugging-item {
          display: flex;
          gap: 12px;
        }

        .debugging-number {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          background: #fce4ec;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 700;
          color: #c2185b;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .debugging-content {
          flex: 1;
          min-width: 0;
        }

        .debugging-title {
          font-weight: 600;
          color: #333;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .debugging-detail {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }

        /* Mismatch Card */
        .mismatch-card {
          background: white;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
        }

        .mismatch-row {
          display: flex;
          gap: 12px;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .mismatch-row:last-child {
          margin-bottom: 0;
        }

        .mismatch-label {
          font-weight: 600;
          color: #666;
          min-width: 80px;
        }

        .mismatch-value {
          color: #333;
          font-family: monospace;
          font-size: 12px;
        }

        .mismatch-note {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #f0e8d8;
          font-size: 12px;
          color: #7a5c00;
          line-height: 1.4;
        }

        /* Similar Defects */
        .similar-defects-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .defect-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .defect-item:hover {
          background: #fafbfc;
          border-color: #d0d0d0;
        }

        .defect-id {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 60px;
          padding: 4px 8px;
          background: #ede9fe;
          color: #5b3df5;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .defect-title {
          font-size: 13px;
          color: #333;
          flex: 1;
          min-width: 0;
        }

        /* Code Block */
        .code-block {
          margin: 0;
          padding: 12px;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          overflow-x: auto;
          font-family: 'Monaco', 'Courier New', monospace;
          max-height: 300px;
          overflow-y: auto;
        }

        /* Checklist */
        .checklist {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #333;
          cursor: pointer;
          user-select: none;
        }

        .checklist-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #5b3df5;
          flex-shrink: 0;
        }

        .checklist-item input[type="checkbox"]:checked + span {
          color: #999;
          text-decoration: line-through;
        }

        .checklist-item span {
          transition: all 0.2s ease;
        }
        .solution-content {
  margin-top: 20px;
  padding: 0;

  font-size: 14px;
  line-height: 1.5;
  font-weight: 400;
  color: #444;

  white-space: normal;
  overflow-wrap: break-word;
}
      `}</style>
    </AppShell>
  );
}