import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AiActionModal from "./AiActionModal";
import ResolutionAssistant from "./ResolutionAssistant";
import TestCaseGenerator from "./TestCaseGenerator";

export default function IssueCard({ issue, projectName, onStatusChange, onPriorityChange, onSeverityChange, onDelete }) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const date = new Date(issue.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  // BYPASS RBAC - Show all actions to all users
  const canChangeStatus = true;
  const canEdit = true;
  const canDelete = true;

  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showTestCasesModal, setShowTestCasesModal] = useState(false);

  return (
    <div className="issue-card">
      <span className="issue-card-date">{date}</span>
      <h4>{issue.title}</h4>
      <p>{issue.description}</p>

      <div className="issue-card-project">Project: {projectName || "—"}</div>

      <div className="issue-card-field">
        <span className="field-label">Status</span>
        {canChangeStatus ? (
          <select value={issue.status} onChange={(e) => onStatusChange(issue.id, e.target.value)}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
          </select>
        ) : (
          <span className="field-value">{issue.status.replace("_", " ")}</span>
        )}
      </div>

      {canEdit && (
        <>
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
              <option value="low">Low</option>
            </select>
          </div>
        </>
      )}

      <div className="issue-card-ai-actions">
        <button className="btn btn-outline btn-sm" onClick={() => setShowResolutionModal(true)}>
          🤖 AI Resolution
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => setShowTestCasesModal(true)}>
          🧪 AI Test Cases
        </button>
      </div>

      <div className="issue-card-actions">
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/issues/${issue.id}/report`)}>View Details</button>
        {canDelete && (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(issue.id)}>Delete</button>
        )}
      </div>

      <AiActionModal
        title="AI Resolution Assistant"
        icon="🤖"
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
      >
        <ResolutionAssistant issueId={issue.id} />
      </AiActionModal>

      <AiActionModal
        title="AI Test Case Generator"
        icon="🧪"
        isOpen={showTestCasesModal}
        onClose={() => setShowTestCasesModal(false)}
      >
        <TestCaseGenerator issueId={issue.id} />
      </AiActionModal>

      <style jsx>{`
        .issue-card-ai-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        .issue-card-ai-actions button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
        }
        .issue-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .issue-card-actions button {
          flex: 1;
        }
      `}</style>
    </div>
  );
}