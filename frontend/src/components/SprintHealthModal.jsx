import { useState, useEffect } from "react";
import api from "../api";
import AiActionModal from "./AiActionModal";

export default function SprintHealthModal({ sprint, isOpen, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalysis = async () => {
    if (!sprint?.id) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.post(`/ai/sprint-health/${sprint.id}`);
      setAnalysis(res.data);
    } catch (err) {
      console.error("Failed to fetch sprint health analysis:", err);
      setError(
        err.response?.data?.detail ||
          "Unable to generate AI recommendations. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysis) {
      fetchAnalysis();
    }
  }, [isOpen, sprint?.id]);

  if (!isOpen) return null;

  return (
    <AiActionModal
      title="Sprint Health AI"
      icon="✨"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="sprint-health-content">
        {/* SPRINT INFO */}
        {analysis && (
          <div className="health-sprint-info">
            <div className="health-sprint-title">{analysis.sprint_name}</div>
            <div className="health-sprint-project">
              {analysis.project_name}
            </div>
            {sprint.start_date && (
              <div className="health-sprint-dates">
                📅 {new Date(sprint.start_date).toLocaleDateString()} →{" "}
                {new Date(sprint.end_date).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="health-loading">
            <div className="health-spinner" />
            <div className="health-loading-text">
              ✨ Analyzing Sprint Health...
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="health-error">
            <div className="health-error-icon">⚠️</div>
            <div className="health-error-text">{error}</div>
          </div>
        )}

        {/* CONTENT */}
        {analysis && !loading && (
          <>
            {/* HEALTH SCORE */}
            <div className="health-score-section">
              <div className="health-score-header">
                <span className="health-status-emoji">
                  {analysis.health_status.split(" ")[0]}
                </span>
                <span className="health-status-text">
                  {analysis.health_status}
                </span>
              </div>
              <div className="health-score-value">
                Health Score: {analysis.health_score}/100
              </div>
            </div>

            {/* SUMMARY */}
            <div className="health-summary-section">
              <h4 className="health-section-title">Sprint Summary</h4>
              <div className="health-summary-grid">
                <div className="health-summary-item">
                  <div className="health-summary-label">Sprint Progress</div>
                  <div className="health-summary-value">
                    {analysis.summary.sprint_progress}%
                  </div>
                </div>
                <div className="health-summary-item">
                  <div className="health-summary-label">Time Elapsed</div>
                  <div className="health-summary-value">
                    {analysis.summary.time_progress}%
                  </div>
                </div>
                <div className="health-summary-item">
                  <div className="health-summary-label">Issues Completed</div>
                  <div className="health-summary-value">
                    {analysis.summary.completed_issues}/
                    {analysis.summary.total_issues}
                  </div>
                </div>
                <div className="health-summary-item">
                  <div className="health-summary-label">In Progress</div>
                  <div className="health-summary-value">
                    {analysis.summary.in_progress_issues}
                  </div>
                </div>
                <div className="health-summary-item">
                  <div className="health-summary-label">Blocked Issues</div>
                  <div className="health-summary-value">
                    {analysis.summary.blocked_issues}
                  </div>
                </div>
                <div className="health-summary-item">
                  <div className="health-summary-label">
                    High Priority Incomplete
                  </div>
                  <div className="health-summary-value">
                    {analysis.summary.high_priority_incomplete}
                  </div>
                </div>
              </div>
            </div>

            {/* RISKS */}
            {analysis.risks.length > 0 && (
              <div className="health-risks-section">
                <h4 className="health-section-title">⚠️ Why?</h4>
                <ul className="health-risks-list">
                  {analysis.risks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* RANKED ISSUES */}
            {analysis.ranked_incomplete_issues.length > 0 && (
              <div className="health-issues-section">
                <h4 className="health-section-title">🎯 Complete First</h4>
                <div className="health-issues-list">
                  {analysis.ranked_incomplete_issues.map((issue) => (
                    <div key={issue.issue_id} className="health-issue-card">
                      <div className="health-issue-header">
                        <div className="health-issue-title">
                          <span className="health-issue-priority">
                            {issue.priority === "critical"
                              ? "🔴"
                              : issue.priority === "high"
                              ? "🟠"
                              : issue.priority === "medium"
                              ? "🟡"
                              : "🟢"}
                          </span>
                          BUG-{issue.issue_id} — {issue.title}
                        </div>
                        <div className="health-issue-action">
                          {issue.action_priority === 1
                            ? "Complete first"
                            : issue.action_priority === 2
                            ? "Complete second"
                            : issue.action_priority === 3
                            ? "Complete third"
                            : `Priority ${issue.action_priority}`}
                        </div>
                      </div>
                      <div className="health-issue-priority-badge">
                        Priority: {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)} | Status:{" "}
                        {issue.status.replace("_", " ")}
                      </div>
                      <div className="health-issue-reasoning">
                        {issue.reasoning}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI RECOMMENDATION */}
            <div className="health-recommendation-section">
              <h4 className="health-section-title">🤖 AI Recommendation</h4>
              <div className="health-recommendation-text">
                {analysis.ai_recommendation
                  .split("\n")
                  .map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
              </div>
            </div>

            {/* SPRINT OUTLOOK */}
            <div className="health-outlook-section">
              <h4 className="health-section-title">📌 Sprint Outlook</h4>
              <div className="health-outlook-text">
                {analysis.sprint_outlook}
              </div>
            </div>

            {/* FOOTER */}
            <div className="health-footer">
              <button
                className="btn btn-outline btn-sm"
                onClick={fetchAnalysis}
                disabled={loading}
              >
                Refresh Analysis
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .sprint-health-content {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* Sprint Info */
        .health-sprint-info {
          padding: 12px;
          background: var(--bg-page);
          border-radius: 8px;
        }

        .health-sprint-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--brand-700);
          margin-bottom: 2px;
        }

        .health-sprint-project {
          font-size: 12px;
          color: var(--text-muted);
        }

        .health-sprint-dates {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        /* Loading */
        .health-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 32px 16px;
          text-align: center;
        }

        .health-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f0f0f0;
          border-top-color: var(--brand-500);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .health-loading-text {
          font-size: 13px;
          color: var(--text-muted);
        }

        /* Error */
        .health-error {
          display: flex;
          gap: 10px;
          padding: 12px;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: 8px;
          color: #991b1b;
        }

        .health-error-icon {
          flex-shrink: 0;
          font-size: 16px;
        }

        .health-error-text {
          font-size: 12px;
          line-height: 1.5;
        }

        /* Health Score */
        .health-score-section {
          padding: 14px;
          background: linear-gradient(135deg, #eee9ff, #f5f3ff);
          border: 1px solid #e5d9ff;
          border-radius: 10px;
        }

        .health-score-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .health-status-emoji {
          font-size: 18px;
        }

        .health-status-text {
          font-size: 13px;
          font-weight: 600;
          color: var(--brand-700);
        }

        .health-score-value {
          font-size: 14px;
          font-weight: 700;
          color: var(--brand-600);
        }

        /* Section Title */
        .health-section-title {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
        }

        /* Summary */
        .health-summary-section {
          padding: 12px 0;
        }

        .health-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .health-summary-item {
          padding: 8px;
          background: var(--bg-page);
          border-radius: 6px;
          text-align: center;
        }

        .health-summary-label {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 3px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .health-summary-value {
          font-size: 14px;
          font-weight: 700;
          color: var(--brand-700);
        }

        /* Risks */
        .health-risks-section {
          padding: 12px 0;
        }

        .health-risks-list {
          margin: 0;
          padding-left: 18px;
          list-style: none;
        }

        .health-risks-list li {
          margin-bottom: 6px;
          font-size: 12px;
          color: var(--text);
          line-height: 1.4;
        }

        .health-risks-list li:before {
          content: "• ";
          color: #ef4444;
          font-weight: bold;
          margin-right: 6px;
        }

        /* Issues */
        .health-issues-section {
          padding: 12px 0;
        }

        .health-issues-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .health-issue-card {
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: var(--bg-page);
        }

        .health-issue-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }

        .health-issue-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          min-width: 0;
        }

        .health-issue-priority {
          font-size: 14px;
          flex-shrink: 0;
        }

        .health-issue-action {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 700;
          color: var(--brand-600);
          background: var(--brand-50);
          padding: 3px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .health-issue-priority-badge {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 5px;
        }

        .health-issue-reasoning {
          font-size: 11px;
          color: var(--text);
          line-height: 1.4;
        }

        /* Recommendation */
        .health-recommendation-section {
          padding: 12px;
          background: #fffbeb;
          border: 1px solid #fef08a;
          border-radius: 8px;
        }

        .health-recommendation-text {
          font-size: 12px;
          color: #78350f;
          line-height: 1.6;
        }

        .health-recommendation-text div {
          margin-bottom: 4px;
        }

        .health-recommendation-text div:last-child {
          margin-bottom: 0;
        }

        /* Outlook */
        .health-outlook-section {
          padding: 12px;
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          border-radius: 8px;
        }

        .health-outlook-text {
          font-size: 12px;
          color: #15803d;
          line-height: 1.6;
        }

        /* Footer */
        .health-footer {
          display: flex;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .health-footer button {
          flex: 1;
        }

        /* Responsive */
        @media (max-width: 600px) {
          .health-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .health-issue-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .health-issue-action {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </AiActionModal>
  );
}