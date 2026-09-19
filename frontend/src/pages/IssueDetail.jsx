import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { PERMISSIONS } from "../auth/permissions";
import AiDeveloperPanel from "../components/AiDeveloperPanel";
import BugFlowAiChat from "../components/BugFlowAiChat";


const STATUS_LABELS = { open: "Open", in_progress: "In Progress", in_review: "In Review", resolved: "Resolved" };

const STATUS_COLORS = {
  open: { bg: "#fef3c7", color: "#b45309" },
  in_progress: { bg: "#dbeafe", color: "#0369a1" },
  in_review: { bg: "#fce7f3", color: "#be185d" },
  resolved: { bg: "#dcfce7", color: "#16a34a" },
};

const PRIORITY_COLORS = {
  critical: { bg: "#fee2e2", color: "#b91c1c", label: "🔴 HIGH" },
  high: { bg: "#fecaca", color: "#991b1b", label: "🟠 HIGH" },
  medium: { bg: "#fde047", color: "#854d0e", label: "🟡 MEDIUM" },
  low: { bg: "#dcfce7", color: "#15803d", label: "🟢 LOW" },
};

const NEXT_STATUS = {
  open: "in_progress",
  in_progress: "in_review",
  in_review: "resolved",
  resolved: "open",
};

export default function IssueDetail() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
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
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [showDevRecommendationsModal, setShowDevRecommendationsModal] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const navigate = useNavigate();

  const canViewResolution = hasPermission(PERMISSIONS.VIEW_AI_RESOLUTION);
  const canViewDevRecommendation = hasPermission(PERMISSIONS.VIEW_AI_DEVELOPER_RECOMMENDATION);
  const canAssign = hasPermission(PERMISSIONS.ASSIGN_ISSUE);
  const canChangeStatus = hasPermission(PERMISSIONS.CHANGE_STATUS);
  const canDeleteIssue = hasPermission(PERMISSIONS.DELETE_ISSUE);
  const canAddComment = hasPermission(PERMISSIONS.ADD_COMMENT);
  const canUploadAttachment = hasPermission(PERMISSIONS.UPLOAD_ATTACHMENT);

  const visibleTabs = ["Report", ...(canViewResolution ? ["Resolution"] : []), "Comments", "Attachments", "Activity"];

  const loadIssue = () => api.get(`/issues/${id}`).then((res) => setIssue(res.data)).catch(() => setError("Issue not found"));
  const loadComments = () => api.get(`/issues/${id}/comments`).then((res) => setComments(res.data));
  const loadAttachments = () => api.get(`/issues/${id}/attachments`).then((res) => setAttachments(res.data));
  const loadActivity = () => api.get(`/issues/${id}/activity`).then((res) => setActivity(res.data));
  const loadUsers = () => api.get("/users").then((res) => setUsers(res.data));
  const loadResolution = () => {
    if (!canViewResolution) return;
    setResolutionLoading(true);
    setResolutionError("");
    api
      .get(`/issues/${id}/resolution-assistant`)
      .then((res) => setResolution(res.data))
      .catch(() => setResolutionError("Could not load resolution assistant"))
      .finally(() => setResolutionLoading(false));
  };

  const loadRecommendations = () => {
    if (!canViewDevRecommendation) {
      setRecommendationsLoading(false);
      return Promise.resolve();
    }
    setRecommendationsLoading(true);
    return api
      .get(`/issues/${id}/developer-recommendations`)
      .then((res) => setRecommendations(res.data))
      .catch((err) => console.error("Failed to load recommendations:", err))
      .finally(() => setRecommendationsLoading(false));
  };

  useEffect(() => {
    loadIssue();
    loadComments();
    loadAttachments();
    loadActivity();
    loadUsers();
    loadResolution();
    loadRecommendations();
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

  const handleAssigneeChange = async (userId) => {
    setActionError("");
    try {
      const res = await api.put(`/issues/${id}`, { assignee_id: userId ? Number(userId) : null });
      setIssue(res.data);
      loadActivity();
    } catch (err) {
      setActionError(err.response?.data?.detail || "Could not update assignee");
    }
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

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await loadRecommendations();
    } finally {
      setReanalyzing(false);
    }
  };

  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem(`verification-${id}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!visibleTabs.includes(tab)) {
      setTab("Report");
    }
  }, [visibleTabs, tab]);

  if (error) {
    return (
      <AppShell><div className="page"><p className="error">{error}</p><Link to="/issues">Back to Issues</Link></div></AppShell>
    );
  }
  if (!issue) {
    return <AppShell><div className="page"><p>Loading...</p></div></AppShell>;
  }

const reporter = users.find((u) => u.id === issue.reporter_id);
const nextStatus = NEXT_STATUS[issue.status];
const priorityColor = PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS.medium;
const developerUsers = users.filter((u) => u.role === "developer");  

  return (
    <AppShell>
      <div className="page issue-detail-page">
        <AiDeveloperPanel
          recommendations={recommendations}
          isOpen={showDevRecommendationsModal}
          onClose={() => setShowDevRecommendationsModal(false)}
          onAssign={handleAssigneeChange}
          onReanalyze={handleReanalyze}
          canAssign={canAssign}
          reanalyzing={reanalyzing}
        />
        {canViewResolution && <BugFlowAiChat issueId={id} />}

        <div className="issue-detail-header">
        <Link to="/issues" className="back-btn">
  <span className="back-btn-arrow">←</span> Back to Issues
</Link>
          {canDeleteIssue && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete Issue</button>
          )}
        </div>

        {actionError && <div className="alert alert-error">{actionError}</div>}

        <div className="issue-detail-layout">
          {/* MAIN CONTENT */}
          <div className="issue-detail-main">
            {/* ISSUE CARD */}
            <div className="issue-card">
              <div className="issue-card-header">
                <div className="issue-badge" style={{ backgroundColor: priorityColor.bg }}>
                  <span style={{ color: priorityColor.color }}>🐛</span>
                </div>
                <div className="issue-card-title-section">
                  <span className="issue-id">BUG-{issue.id}</span>
                  <h1 className="issue-title">{issue.title}</h1>
                </div>
              </div>
              <p className="issue-description">{issue.description}</p>

              <div className="issue-tags-container">
                <span className="tag tag-priority" style={{ backgroundColor: priorityColor.bg, color: priorityColor.color }}>
                  {priorityColor.label}
                </span>
                <span className="tag tag-status" style={{ backgroundColor: STATUS_COLORS[issue.status].bg, color: STATUS_COLORS[issue.status].color }}>
                  {STATUS_LABELS[issue.status].toUpperCase()}
                </span>
                {issue.category && <span className="tag tag-category">{issue.category}</span>}
                {issue.component && <span className="tag tag-component">{issue.component}</span>}
                {issue.defect_type && <span className="tag tag-defect">{issue.defect_type}</span>}
              </div>
            </div>

            {/* TABS */}
            <div className="tabs-container">
              {visibleTabs.map((t) => (
                <button
                  key={t}
                  className={`tab ${tab === t ? 'active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === "Comments" && comments.length > 0 && <span className="tab-badge">{comments.length}</span>}
                  {t === "Attachments" && attachments.length > 0 && <span className="tab-badge">{attachments.length}</span>}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="tab-content">
              {tab === "Report" && (
                <>
                  {issue.ai_steps_to_reproduce ? (
                    <div className="report-section-container">
                      {issue.ai_summary && (
                        <div className="report-block">
                          <h3>📋 SUMMARY</h3>
                          <pre>{issue.ai_summary}</pre>
                        </div>
                      )}
                      <div className="report-block">
                        <h3>🔧 STEPS TO REPRODUCE</h3>
                        <pre>{issue.ai_steps_to_reproduce}</pre>
                      </div>
                      <div className="report-block">
                        <h3>✅ EXPECTED RESULT</h3>
                        <pre>{issue.ai_expected_result}</pre>
                      </div>
                      <div className="report-block">
                        <h3>❌ ACTUAL RESULT</h3>
                        <pre>{issue.ai_actual_result}</pre>
                      </div>
                      {issue.ai_environment && (
                        <div className="report-block">
                          <h3>🌍 ENVIRONMENT</h3>
                          <pre>{issue.ai_environment}</pre>
                        </div>
                      )}
                      {issue.ai_root_cause && (
                        <div className="report-block">
                          <h3>🎯 ROOT CAUSE ANALYSIS</h3>
                          <pre>{issue.ai_root_cause}</pre>
                        </div>
                      )}
                      <button className="btn btn-outline-secondary" onClick={handleRegenerate} disabled={regenerating}>
                        {regenerating ? "⏳ Generating..." : "🔄 Regenerate AI Report"}
                      </button>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>No AI report generated yet for this issue.</p>
                      <button className="btn btn-primary" onClick={handleRegenerate} disabled={regenerating}>
                        {regenerating ? "⏳ Generating..." : "✨ Generate AI Report"}
                      </button>
                    </div>
                  )}
                </>
              )}

              {tab === "Comments" && (
                <div className="comments-section">
                  {canAddComment && (
                    <form onSubmit={handleAddComment} className="comment-form">
                      <input
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="comment-input"
                      />
                      <button className="btn btn-primary" type="submit">Post</button>
                    </form>
                  )}
                  {comments.length === 0 && <p className="empty-hint">No comments yet.</p>}
                  <div className="comments-list">
                    {comments.map((c) => (
                      <div className="comment-item" key={c.id}>
                        <div className="comment-header">
                          <strong>{c.author_username}</strong>
                          <span className="comment-time">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="comment-content">{c.content}</p>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteComment(c.id)}
                          disabled={deletingCommentId === c.id}
                        >
                          {deletingCommentId === c.id ? "..." : "Delete"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "Attachments" && (
                <div className="attachments-section">
                  {canUploadAttachment && (
                    <label className="btn btn-outline-secondary" style={{ cursor: "pointer" }}>
                      📎 Upload File
                      <input type="file" onChange={handleUpload} style={{ display: "none" }} />
                    </label>
                  )}
                  {attachments.length === 0 && <p className="empty-hint">No attachments yet.</p>}
                  <div className="attachments-list">
                    {attachments.map((a) => (
                      <div className="attachment-item" key={a.id}>
                        <button
                          onClick={() => handleDownloadAttachment(a.id, a.filename)}
                          className="attachment-name"
                        >
                          📎 {a.filename}
                        </button>
                        <span className="attachment-meta">{(a.size_bytes / 1024).toFixed(1)} KB</span>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteAttachment(a.id, a.filename)}
                          disabled={deletingAttachmentId === a.id}
                        >
                          {deletingAttachmentId === a.id ? "..." : "Delete"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "Activity" && (
                <div className="activity-section">
                  {activity.length === 0 && <p className="empty-hint">No activity yet.</p>}
                  <div className="activity-list">
                    {activity.map((a) => (
                      <div className="activity-item" key={a.id}>
                        <div className="activity-header">
                          <strong>{a.username}</strong>
                          <span className="activity-time">{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                        <div className="activity-action">{a.action.replace(/_/g, " ")}</div>
                        {a.detail && <p className="activity-detail">{a.detail}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "Resolution" && canViewResolution && (
                <>
                  {resolutionLoading ? (
                    <p className="loading-hint">Loading resolution assistance...</p>
                  ) : resolutionError ? (
                    <p className="error">{resolutionError}</p>
                  ) : resolution ? (
                    <div className="resolution-panel">
                      {/* Header */}
                      <div className="resolution-header">
                        <div>
                          <h3>🤖 AI Resolution Assistant</h3>
                          <p>AI-generated insights to help you investigate and resolve this issue faster.</p>
                        </div>
                        <button className="btn btn-sm btn-outline-secondary" onClick={loadResolution} disabled={resolutionLoading}>
                          🔄 Regenerate
                        </button>
                      </div>

                      {/* Stats Grid */}
                      <div className="stats-grid">
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
                        <div className="section-title">🎯 Root Cause Hypotheses</div>
                        {resolution.root_cause_hypotheses.map((h, i) => (
                          <div key={i} className="hypothesis">
                            <span className="hypothesis-num">{i + 1}</span>
                            <div>
                              <p>{h.hypothesis}</p>
                              <span className="confidence-badge">{h.confidence}%</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Investigation Areas */}
                      <div className="resolution-section">
                        <div className="section-title">🔍 Investigation Areas</div>
                        {resolution.investigation_areas.map((a, i) => (
                          <div key={i} className="investigation">
                            <span className="inv-num">{i + 1}</span>
                            <div>
                              <h4>{a.area}</h4>
                              <p>{a.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Code Areas */}
                      <div className="resolution-section">
                        <div className="section-title">🧑‍💻 Suggested Code Areas</div>
                        <div className="code-areas">
                          {resolution.suggested_code_areas.frontend.length > 0 && (
                            <div className="code-area">
                              <h4>Frontend</h4>
                              {resolution.suggested_code_areas.frontend.map((f, i) => (
                                <p key={i}>• {f}</p>
                              ))}
                            </div>
                          )}
                          {resolution.suggested_code_areas.backend.length > 0 && (
                            <div className="code-area">
                              <h4>Backend</h4>
                              {resolution.suggested_code_areas.backend.map((f, i) => (
                                <p key={i}>• {f}</p>
                              ))}
                            </div>
                          )}
                          {resolution.suggested_code_areas.api.length > 0 && (
                            <div className="code-area">
                              <h4>API</h4>
                              {resolution.suggested_code_areas.api.map((f, i) => (
                                <p key={i}>• {f}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Debugging Steps */}
                      <div className="resolution-section">
                        <div className="section-title">🐞 Debugging Steps</div>
                        {resolution.debugging_steps.map((s, i) => (
                          <div key={i} className="debug-step">
                            <span className="debug-num">{i + 1}</span>
                            <div>
                              <h4>{s.step}</h4>
                              <p>{s.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Possible Resolution */}
                      <div className="resolution-section highlight">
                        <div className="section-title">💡 Possible Resolution</div>
                        <div className="solution">{resolution.possible_resolution}</div>
                      </div>

                      {/* Verification Checklist */}
                      <div className="resolution-section">
                        <div className="section-title">🧪 Verification Checklist</div>
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
                                  localStorage.setItem(`verification-${id}`, JSON.stringify(updated));
                                }}
                              />
                              <span>{c}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="empty-hint">No resolution assistance generated yet.</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="issue-sidebar">
            {/* WORKFLOW STATUS ACTIONS */}
            {canChangeStatus && (
            <div className="sidebar-card workflow-card">
              <h3 className="card-title">Workflow Status Actions</h3>
              {nextStatus ? (
                <div className="workflow-buttons">
                  <button
                    className="workflow-btn"
                    onClick={() => handleTransition(nextStatus)}
                  >
                    Transition to {STATUS_LABELS[nextStatus]}
                    <span className="check-icon">✓</span>
                  </button>
                </div>
              ) : (
                <p className="hint">No further transitions available.</p>
              )}
            </div>
          )}

            {/* ASSIGNED TO */}
          <div className="sidebar-card assigned-card">
            <h3 className="card-title">ASSIGNED TO</h3>
            {canAssign ? (
              <select
                value={issue.assignee_id || ""}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="metadata-select assign-select"
              >
                <option value="">Unassigned</option>
                {developerUsers.map((u) => (      // ← changed
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            ) : (
              <div className="metadata-value">
                {users.find((u) => u.id === issue.assignee_id)?.username || "Unassigned"}
              </div>
            )}

              {/* AI Recommend Developer Button */}
              {canViewDevRecommendation && recommendations && (
                <button
                  className="btn btn-recommend-dev"
                  onClick={() => setShowDevRecommendationsModal(true)}
                >
                  <span className="recommend-icon">🤖</span>
                  <span>AI Recommend Developer</span>
                  <span className="recommend-arrow">+</span>
                </button>
              )}
            </div>

            {/* ISSUE METADATA */}
            <div className="sidebar-card metadata-card">
              <div className="metadata">
                <div className="metadata-field">
                  <label>REPORTER</label>
                  <div className="metadata-value">{reporter?.username || "—"}</div>
                </div>

                <div className="metadata-field">
                  <label>CATEGORY</label>
                  <div className="metadata-value">{issue.category || "—"}</div>
                </div>

                <div className="metadata-field">
                  <label>MODULE / COMPONENT</label>
                  <div className="metadata-value">{issue.component || "—"}</div>
                </div>

                <div className="metadata-field">
                  <label>DEFECT TYPE</label>
                  <div className="metadata-value">{issue.defect_type || "—"}</div>
                </div>

                <div className="metadata-field">
                  <label>REPORTED ON</label>
                  <div className="metadata-value-muted">{new Date(issue.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        /* PAGE LAYOUT */
        .issue-detail-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .issue-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #5b3df5;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #f5f1ff;
  border-color: #d8cffe;
}

.back-btn-arrow {
  font-size: 14px;
}
        /* ISSUE CARD */
        .issue-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .issue-card-header {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .issue-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 52px;
          height: 52px;
          border-radius: 12px;
          font-size: 24px;
          flex-shrink: 0;
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        }

        .issue-card-title-section {
          flex: 1;
        }

        .issue-id {
          display: inline-block;
          background: #ede9fe;
          color: #5b3df5;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .issue-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #111;
          line-height: 1.3;
        }

        .issue-description {
          margin: 12px 0 16px 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }

        /* TAGS */
        .issue-tags-container {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tag {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tag-priority {
          background: #fef3c7;
          color: #b45309;
        }

        .tag-status {
          background: #dbeafe;
          color: #0369a1;
        }

        .tag-category {
          background: #c7d2fe;
          color: #3730a3;
        }

        .tag-component {
          background: #dcfce7;
          color: #166534;
        }

        .tag-defect {
          background: #fed7aa;
          color: #92400e;
        }

        /* LAYOUT */
        .issue-detail-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
        }

        @media (max-width: 1200px) {
          .issue-detail-layout {
            grid-template-columns: 1fr;
          }
        }

        /* MAIN CONTENT */
        .issue-detail-main {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* TABS */
        .tabs-container {
          display: flex;
          gap: 0;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 0;
          background: white;
          border-radius: 12px 12px 0 0;
        }

        .tab {
          background: none;
          border: none;
          padding: 14px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          position: relative;
          transition: all 0.2s ease;
        }

        .tab:hover {
          color: #333;
          background: #fafafa;
        }

        .tab.active {
          color: #5b3df5;
          border-bottom-color: #5b3df5;
        }

        .tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #5b3df5;
          background: #ede9fe;
          padding: 2px 6px;
          border-radius: 10px;
        }

        /* TAB CONTENT */
        .tab-content {
          padding: 24px;
          background: white;
          border-radius: 0 0 12px 12px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }

        /* REPORT */
        .report-section-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .report-block {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .report-block h3 {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          color: #5b3df5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .report-block pre {
          margin: 0;
          padding: 12px;
          background: #f9f8fc;
          border: 1px solid #ede9fe;
          border-radius: 6px;
          font-size: 13px;
          line-height: 1.6;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #333;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }

        .empty-state p {
          font-size: 14px;
          margin-bottom: 16px;
        }

        .empty-hint {
          text-align: center;
          color: #999;
          font-size: 14px;
          padding: 40px 20px;
        }

        /* COMMENTS */
        .comments-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .comment-form {
          display: flex;
          gap: 8px;
        }

        .comment-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comment-item {
          padding: 12px;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          gap: 12px;
        }

        .comment-time {
          font-size: 12px;
          color: #999;
          white-space: nowrap;
        }

        .comment-content {
          margin: 0 0 8px 0;
          color: #333;
          line-height: 1.5;
        }

        /* ATTACHMENTS */
        .attachments-section,
        .activity-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .attachments-list,
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .attachment-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .attachment-name {
          flex: 1;
          background: none;
          border: none;
          color: #5b3df5;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
        }

        .attachment-name:hover {
          text-decoration: underline;
        }

        .attachment-meta {
          font-size: 12px;
          color: #999;
        }

        /* ACTIVITY */
        .activity-item {
          padding: 12px;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .activity-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .activity-time {
          font-size: 12px;
          color: #999;
        }

        .activity-action {
          font-weight: 600;
          color: #333;
          font-size: 13px;
        }

        .activity-detail {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #666;
        }

        /* RESOLUTION */
        .resolution-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .resolution-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: linear-gradient(135deg, #f5f1ff 0%, #ede9fe 100%);
          border: 1px solid #e2dbfc;
          border-radius: 8px;
        }

        .resolution-header h3 {
          margin: 0 0 4px 0;
          color: #5b3df5;
          font-size: 14px;
        }

        .resolution-header p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f9f8fc;
          border: 1px solid #ede9fe;
          border-radius: 8px;
        }

        .stat-icon {
          font-size: 20px;
        }

        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #5b3df5;
        }

        .stat-value-sm {
          font-size: 12px;
          font-weight: 600;
          color: #333;
        }

        .resolution-section {
          padding: 16px;
          background: #fafbfc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .resolution-section.highlight {
          background: #f0f9f3;
          border-color: #d0ecc9;
        }

        .section-title {
          font-weight: 700;
          color: #333;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .hypothesis {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }

        .hypothesis:last-child {
          border-bottom: none;
        }

        .hypothesis-num {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          background: #ede9fe;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
          color: #5b3df5;
          flex-shrink: 0;
        }

        .hypothesis p {
          margin: 0;
          font-size: 13px;
          color: #333;
        }

        .confidence-badge {
          display: inline-block;
          background: #ede9fe;
          color: #5b3df5;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 3px;
          margin-top: 4px;
        }

        .investigation {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
        }

        .inv-num {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          background: #dbeafe;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
          color: #1e40af;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .investigation h4 {
          margin: 0 0 4px 0;
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .investigation p {
          margin: 0;
          font-size: 12px;
          color: #666;
        }

        .code-areas {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .code-area {
          padding: 12px;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
        }

        .code-area h4 {
          margin: 0 0 8px 0;
          font-size: 11px;
          font-weight: 700;
          color: #5b3df5;
          text-transform: uppercase;
        }

        .code-area p {
          margin: 0 0 4px 0;
          font-size: 12px;
          color: #333;
        }

        .debug-step {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
        }

        .debug-num {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          background: #fce4ec;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
          color: #c2185b;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .debug-step h4 {
          margin: 0 0 4px 0;
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .debug-step p {
          margin: 0;
          font-size: 12px;
          color: #666;
        }

        .solution {
          padding: 12px;
          background: white;
          border-radius: 6px;
          font-size: 13px;
          line-height: 1.5;
          color: #333;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

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
        }

        .checklist-item input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #5b3df5;
        }

        .checklist-item input:checked + span {
          color: #999;
          text-decoration: line-through;
        }

        /* SIDEBAR */
        .issue-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sidebar-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
        }

        .workflow-card {
          order: -1;
        }

        .assigned-card {
          order: 0;
        }

        .metadata-card {
          order: 2;
        }

        .card-title {
          margin: 0 0 12px 0;
          font-size: 10px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* WORKFLOW */
        .workflow-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .workflow-btn {
          padding: 12px 14px;
          background: #5b3df5;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
        }

        .workflow-btn:hover {
          background: #4c2dd4;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(91, 61, 245, 0.2);
        }

        .check-icon {
          font-size: 16px;
        }

        /* ASSIGNED TO */
        .metadata-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          background: white;
          cursor: pointer;
          font-family: inherit;
          margin-bottom: 12px;
        }

        .metadata-value {
          font-size: 13px;
          color: #333;
          font-weight: 500;
          margin-bottom: 12px;
        }

        /* AI RECOMMEND DEVELOPER BUTTON */
      .btn-recommend-dev {
        width: 100%;
        padding: 12px 14px;
        background: #5b3df5;
        color: white;
        border: 2px solid #5b3df5;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        transition: all 0.2s ease;
        font-family: inherit;
}

        .btn-recommend-dev:hover {
        background: #4c2dd4;
        border-color: #4c2dd4;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(91, 61, 245, 0.25);
}

        .recommend-icon {
          font-size: 14px;
        }

        .recommend-arrow {
          font-size: 16px;
          font-weight: 700;
        }

        /* METADATA */
        .metadata {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .metadata-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .metadata-field label {
          font-size: 10px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metadata-value-muted {
          font-size: 13px;
          color: #999;
        }

        .hint {
          text-align: center;
          color: #999;
          font-size: 13px;
          padding: 20px;
          margin: 0;
        }

        .alert {
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .alert-error {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        /* BUTTON STYLES */
        .btn {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .btn-primary {
          background: #5b3df5;
          color: white;
        }

        .btn-primary:hover {
          background: #4c2dd4;
        }

        .btn-outline-secondary {
          background: white;
          color: #333;
          border: 1px solid #e5e7eb;
        }

        .btn-outline-secondary:hover {
          background: #fafafa;
          border-color: #d1d5db;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .loading-hint {
          text-align: center;
          color: #999;
          font-size: 14px;
          padding: 40px 20px;
        }

        .error {
          color: #d9001b;
        }
      `}</style>
    </AppShell>
  );
}