import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";
import IssueCard from "../components/IssueCard";
import { useAuth } from "../context/AuthContext";

const COLUMNS = [
  { key: "open", label: "Open", dot: "var(--open)" },
  { key: "in_progress", label: "In Progress", dot: "var(--progress)" },
  { key: "in_review", label: "In Review", dot: "#7a5fd0" },
  { key: "resolved", label: "Resolved", dot: "var(--resolved)" },
];

const COLLAPSED_COUNT = 1; // how many issues to show before "Show all"

const STATUS_LABELS = { open: "Open", in_progress: "In Progress", in_review: "In Review", resolved: "Resolved" };

const STATUS_COLORS = {
  open: { bg: "#fef3c7", color: "#b45309" },
  in_progress: { bg: "#dbeafe", color: "#0369a1" },
  in_review: { bg: "#fce7f3", color: "#be185d" },
  resolved: { bg: "#dcfce7", color: "#16a34a" },
};

const PRIORITY_COLORS = {
  critical: { bg: "#fee2e2", color: "#b91c1c" },
  high: { bg: "#fecaca", color: "#991b1b" },
  medium: { bg: "#fde047", color: "#854d0e" },
  low: { bg: "#dcfce7", color: "#15803d" },
};

// MY ASSIGNED ISSUES MODAL
function MyAssignedIssuesModal({ isOpen, onClose, myIssues, projectName, onSelectIssue }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />

      <div className="modal-container">
        <div className="modal-content assigned-modal">
          <div className="modal-header">
            <div className="modal-header-content">
              <h2>🧑‍💻 My Assigned Issues</h2>
              <p>Issues currently assigned to you. Click one to open its details.</p>
            </div>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>

          <div className="modal-section">
            {myIssues.length === 0 ? (
              <p className="empty-hint">You have no issues assigned right now.</p>
            ) : (
              <div className="assigned-issues-list">
                {myIssues.map((issue) => {
                  const priorityColor = PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS.medium;
                  const statusColor = STATUS_COLORS[issue.status] || STATUS_COLORS.open;
                  return (
                    <button
                      key={issue.id}
                      className="assigned-issue-card"
                      onClick={() => onSelectIssue(issue.id)}
                    >
                      <div className="assigned-issue-top">
                        <span className="assigned-issue-id">BUG-{issue.id}</span>
                        <span className="assigned-issue-status" style={{ backgroundColor: statusColor.bg, color: statusColor.color }}>
                          {STATUS_LABELS[issue.status]}
                        </span>
                      </div>
                      <h4 className="assigned-issue-title">{issue.title}</h4>
                      <div className="assigned-issue-meta">
                        <span className="assigned-issue-priority" style={{ backgroundColor: priorityColor.bg, color: priorityColor.color }}>
                          {issue.priority?.toUpperCase()}
                        </span>
                        {projectName(issue.project_id) && (
                          <span className="assigned-issue-project">{projectName(issue.project_id)}</span>
                        )}
                      </div>
                      <span className="assigned-issue-chevron">›</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-container {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1000;
          animation: slideUp 0.3s ease;
          padding: 16px;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @media (min-width: 768px) {
          .modal-container {
            align-items: center;
            padding: 0;
          }

          .modal-content {
            max-height: 90vh !important;
          }
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 560px;
          max-height: 85vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .assigned-modal {
          padding-bottom: 24px;
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .modal-header-content h2 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 700;
          color: #111;
        }

        .modal-header-content p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: #ccc;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .modal-close-btn:hover {
          color: #999;
        }

        .modal-section {
          padding: 20px;
        }

        .empty-hint {
          text-align: center;
          color: #999;
          font-size: 14px;
          padding: 40px 20px;
        }

        .assigned-issues-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .assigned-issue-card {
          position: relative;
          width: 100%;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 14px 36px 14px 14px;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .assigned-issue-card:hover {
          border-color: #d8cffe;
          background: #fafbfc;
          box-shadow: 0 4px 12px rgba(91, 61, 245, 0.08);
        }

        .assigned-issue-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .assigned-issue-id {
          font-size: 11px;
          font-weight: 700;
          color: #5b3df5;
          background: #ede9fe;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .assigned-issue-status {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .assigned-issue-title {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #111;
        }

        .assigned-issue-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .assigned-issue-priority {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .assigned-issue-project {
          font-size: 12px;
          color: #999;
        }

        .assigned-issue-chevron {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          color: #ccc;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          position: sticky;
          bottom: 0;
          background: white;
        }

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

        .btn-outline-secondary {
          background: white;
          color: #333;
          border: 1px solid #e5e7eb;
        }

        .btn-outline-secondary:hover {
          background: #fafafa;
          border-color: #d1d5db;
        }

        .modal-content::-webkit-scrollbar {
          width: 8px;
        }

        .modal-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .modal-content::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }

        .modal-content::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </>
  );
}

export default function Issues() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [sprintFilter, setSprintFilter] = useState("");
  const [transitionError, setTransitionError] = useState("");
  const [showMyIssuesModal, setShowMyIssuesModal] = useState(false);

  // tracks which columns are expanded to show all issues
  const [expandedColumns, setExpandedColumns] = useState({});

  const load = () => {
    api.get("/issues").then((res) => setIssues(res.data));
    api.get("/projects").then((res) => setProjects(res.data));
    api.get("/sprints").then((res) => setSprints(res.data));
  };

  useEffect(load, []);

  const projectName = (id) => projects.find((p) => p.id === id)?.name;

  const isDeveloper = user?.role === "developer";
  const myAssignedIssues = issues.filter(
    (issue) => issue.assignee_id === user?.id && issue.status !== "resolved"
  );

  const filtered = issues.filter((issue) => {
    const matchesSearch =
      !search ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = !priorityFilter || issue.priority === priorityFilter;
    const matchesSeverity = !severityFilter || issue.severity === severityFilter;
    const matchesSprint = !sprintFilter || String(issue.sprint_id) === sprintFilter;
    return matchesSearch && matchesPriority && matchesSeverity && matchesSprint;
  });

  const handleStatusChange = async (id, status) => {
    setTransitionError("");
    try {
      await api.put(`/issues/${id}`, { status });
      load();
    } catch (err) {
      const message = err.response?.data?.detail || "Permission not allowed - You cannot change this issue status";
      setTransitionError(message);
      throw err; // Re-throw so IssueCard can catch it
    }
  };

  const handlePriorityChange = async (id, priority) => {
    setTransitionError("");
    try {
      await api.put(`/issues/${id}`, { priority });
      load();
    } catch (err) {
      const message = err.response?.data?.detail || "Permission not allowed - You cannot change this issue priority";
      setTransitionError(message);
      throw err;
    }
  };

  const handleSeverityChange = async (id, severity) => {
    setTransitionError("");
    try {
      await api.put(`/issues/${id}`, { severity });
      load();
    } catch (err) {
      const message = err.response?.data?.detail || "Permission not allowed - You cannot change this issue severity";
      setTransitionError(message);
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this issue?")) return;
    setTransitionError("");
    try {
      await api.delete(`/issues/${id}`);
      load();
    } catch (err) {
      const message = err.response?.data?.detail || "Permission not allowed - You cannot delete this issue";
      setTransitionError(message);
      throw err;
    }
  };

  const toggleExpanded = (colKey) => {
    setExpandedColumns((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const handleSelectAssignedIssue = (issueId) => {
    setShowMyIssuesModal(false);
    navigate(`/issues/${issueId}/report`);   // was: /issues/${issueId}
  };
  return (
    <AppShell>
      <div className="page">
        {/* My Assigned Issues Modal (developers only) */}
        <MyAssignedIssuesModal
          isOpen={showMyIssuesModal}
          onClose={() => setShowMyIssuesModal(false)}
          myIssues={myAssignedIssues}
          projectName={projectName}
          onSelectIssue={handleSelectAssignedIssue}
        />

        <h2>Issues</h2>
        <p className="page-subtitle">All bugs across your projects.</p>

        {transitionError && (
          <div style={{
            padding: "12px 16px",
            marginBottom: "16px",
            backgroundColor: "#fee2e2",
            borderLeft: "4px solid #ef4444",
            borderRadius: "4px",
            color: "#991b1b",
            fontSize: "14px",
            fontWeight: "500"
          }}>
            ⚠️ {transitionError}
          </div>
        )}

        {/* MY ASSIGNED ISSUES CARD (developers only) — opens the modal */}
        {isDeveloper && (
          <button
            type="button"
            className="my-assigned-card"
            onClick={() => setShowMyIssuesModal(true)}
          >
            <div className="my-assigned-left">
              <div className="my-assigned-icon">🧑‍💻</div>
              <div className="my-assigned-text">
                <h3>My Assigned Issues</h3>
                <p>Below are the issues currently assigned to you.</p>
              </div>
            </div>
            <div className="my-assigned-right">
              <div className="my-assigned-clip">📋</div>
              <div className="my-assigned-count-block">
                <span className="my-assigned-count">{myAssignedIssues.length}</span>
                <span className="my-assigned-label">Assigned to you</span>
              </div>
            </div>
          </button>
        )}

        <div className="toolbar" style={{ alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <input
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Severity</label>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Sprint</label>
            <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)}>
              <option value="">All Sprints</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="kanban">
          {COLUMNS.map((col) => {
            const colIssues = filtered.filter((i) => i.status === col.key);
            const isExpanded = !!expandedColumns[col.key];
            const visibleIssues = isExpanded ? colIssues : colIssues.slice(0, COLLAPSED_COUNT);
            const hiddenCount = colIssues.length - visibleIssues.length;

            return (
              <div className="kanban-column" key={col.key}>
                <div className="kanban-column-header">
                  <span className="dot" style={{ background: col.dot }} />
                  {col.label}
                  <span className="count">{colIssues.length}</span>
                </div>
                {colIssues.length === 0 && <div className="kanban-empty">No issues here</div>}
                {visibleIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    projectName={projectName(issue.project_id)}
                    onStatusChange={handleStatusChange}
                    onPriorityChange={handlePriorityChange}
                    onSeverityChange={handleSeverityChange}
                    onDelete={handleDelete}
                  />
                ))}
                {colIssues.length > COLLAPSED_COUNT && (
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => toggleExpanded(col.key)}
                    style={{ width: "100%", marginTop: 8 }}
                  >
                    {isExpanded ? "Show less" : `Show all (${hiddenCount} more)`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .my-assigned-card {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 16px;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .my-assigned-card:hover {
          border-color: #d8cffe;
          box-shadow: 0 4px 12px rgba(91, 61, 245, 0.08);
        }

        .my-assigned-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .my-assigned-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: #ede9fe;
          border-radius: 10px;
          font-size: 20px;
          flex-shrink: 0;
        }

        .my-assigned-text h3 {
          margin: 0 0 2px 0;
          font-size: 15px;
          font-weight: 700;
          color: #111;
        }

        .my-assigned-text p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .my-assigned-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .my-assigned-clip {
          font-size: 24px;
        }

        .my-assigned-count-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .my-assigned-count {
          font-size: 22px;
          font-weight: 700;
          color: #111;
          line-height: 1.1;
        }

        .my-assigned-label {
          font-size: 12px;
          color: #999;
        }
      `}</style>
    </AppShell>
  );
}