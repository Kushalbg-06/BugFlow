import { useNavigate } from "react-router-dom";

export default function IssueCard({ issue, projectName, onStatusChange, onPriorityChange, onSeverityChange, onDelete }) {
  const navigate = useNavigate();
  const date = new Date(issue.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="issue-card">
      <span className="issue-card-date">{date}</span>
      <h4>{issue.title}</h4>
      <p>{issue.description}</p>

      <div className="issue-card-project">Project: {projectName || "—"}</div>

      <div className="issue-card-field">
        <span className="field-label">Status</span>
        <select value={issue.status} onChange={(e) => onStatusChange(issue.id, e.target.value)}>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="issue-card-field">
        <span className="field-label">Priority</span>
        <select value={issue.priority} onChange={(e) => onPriorityChange(issue.id, e.target.value)}>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="issue-card-field">
        <span className="field-label">Severity</span>
        <select value={issue.severity || ""} onChange={(e) => onSeverityChange(issue.id, e.target.value)}>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">low</option>
        </select>
      </div>

      <div className="issue-card-actions">
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/issues/${issue.id}/report`)}>View Details</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(issue.id)}>Delete</button>
      </div>
    </div>
  );
}

