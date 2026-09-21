export default function AiDeveloperPanel({
  recommendations,
  isOpen,
  onClose,
  onAssign,
  onReanalyze,
  canAssign,
  reanalyzing,
}) {
  if (!isOpen || !recommendations) return null;

  const { best_match, other_recommendations } = recommendations;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />

      <div className="modal-container">
        <div className="modal-content developer-modal">
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-content">
              <h2>🤖 AI Developer Recommendation</h2>
              <p>Recommended developers based on this issue, experience and current workload.</p>
            </div>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>

          {/* Best Match */}
          <div className="modal-section">
            <h3 className="section-label">BEST MATCH</h3>
            <div className="developer-card-large">
              <div className="dev-card-header">
                <div className="dev-large-avatar">
                  {best_match.username.charAt(0).toUpperCase()}
                </div>
                <div className="dev-card-info">
                  <div className="dev-name-section">
                    <h4>{best_match.username}</h4>
                    <span className="match-badge best">{best_match.match_score}% Match</span>
                  </div>
                  <div className="dev-skills">{best_match.skills.slice(0, 3).join(" • ")}</div>
                  <div className="dev-active-issues">{best_match.active_issues_count} active issues</div>
                </div>
              </div>

              {best_match.reasoning?.length > 0 && (
                <div className="dev-reasoning">
                  <div className="reasoning-header">WHY RECOMMENDED?</div>
                  {best_match.reasoning.map((reason, i) => (
                    <div key={i} className="reasoning-item">
                      <span className="check">✓</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="assign-btn-primary"
                disabled={!canAssign}
                onClick={() => {
                  onAssign(best_match.user_id);
                  onClose();
                }}
              >
                Assign to {best_match.username}
              </button>
            </div>
          </div>

          {/* Other Recommendations */}
          {other_recommendations?.length > 0 && (
            <div className="modal-section">
              <h3 className="section-label">OTHER RECOMMENDATIONS</h3>
              <div className="developers-list">
                {other_recommendations.map((dev) => (
                  <button
                    key={dev.user_id}
                    className="developer-card"
                    disabled={!canAssign}
                    onClick={() => {
                      onAssign(dev.user_id);
                      onClose();
                    }}
                  >
                    <div className="dev-header">
                      <div className="dev-avatar">{dev.username.charAt(0).toUpperCase()}</div>
                      <div className="dev-info">
                        <div className="dev-name-row">
                          <h5>{dev.username}</h5>
                          <span className="match-badge">{dev.match_score}% Match</span>
                        </div>
                        <div className="dev-skills-small">{dev.skills.slice(0, 2).join(" • ")}</div>
                      </div>
                    </div>
                    <div className="dev-meta">
                      <span className="active-issues">{dev.active_issues_count} active</span>
                      <span className="chevron">›</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="modal-footer">
            <button className="btn btn-outline-secondary" onClick={onReanalyze} disabled={reanalyzing}>
              {reanalyzing ? "⏳ Analyzing..." : "🔄 Re-analyze"}
            </button>
            <button className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
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
          max-width: 600px;
          max-height: 85vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .developer-modal {
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
          border-bottom: 1px solid #f3f4f6;
        }

        .modal-section:last-of-type {
          border-bottom: none;
        }

        .section-label {
          margin: 0 0 14px 0;
          font-size: 10px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .developer-card-large {
          width: 100%;
          background: white;
          border: 2px solid #ede9fe;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dev-card-header {
          display: flex;
          gap: 14px;
        }

        .dev-large-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          background: #5b3df5;
          color: white;
          border-radius: 10px;
          font-weight: 700;
          font-size: 20px;
          flex-shrink: 0;
        }

        .dev-card-info {
          flex: 1;
        }

        .dev-name-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .dev-name-section h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #111;
        }

        .match-badge {
          display: inline-block;
          background: #dcfce7;
          color: #16a34a;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .match-badge.best {
          background: #e0e7ff;
          color: #5b3df5;
        }

        .dev-skills {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .dev-active-issues {
          font-size: 12px;
          color: #999;
        }

        .dev-reasoning {
          background: #f9f8fc;
          border-radius: 8px;
          padding: 12px;
        }

        .reasoning-header {
          font-size: 10px;
          font-weight: 700;
          color: #5b3df5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .reasoning-item {
          display: flex;
          gap: 8px;
          font-size: 12px;
          color: #333;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        .reasoning-item:last-child {
          margin-bottom: 0;
        }

        .check {
          color: #16a34a;
          font-weight: 700;
          flex-shrink: 0;
        }

        .assign-btn-primary {
          width: 100%;
          padding: 12px;
          background: #5b3df5;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }

        .assign-btn-primary:hover:not(:disabled) {
          background: #4c2dd4;
        }

        .assign-btn-primary:disabled {
          opacity: 0.5;
          cursor: default;
        }

        .developers-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .developer-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .developer-card:hover:not(:disabled) {
          border-color: #d1d5db;
          background: #fafafa;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .developer-card:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .dev-header {
          display: flex;
          gap: 10px;
        }

        .dev-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: #ede9fe;
          color: #5b3df5;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .dev-info {
          flex: 1;
          min-width: 0;
        }

        .dev-name-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .dev-name-row h5 {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: #111;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dev-skills-small {
          font-size: 11px;
          color: #666;
          line-height: 1.3;
        }

        .dev-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid #f3f4f6;
        }

        .active-issues {
          font-size: 11px;
          color: #999;
        }

        .chevron {
          font-size: 16px;
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

        .btn-outline-secondary:hover:not(:disabled) {
          background: #fafafa;
          border-color: #d1d5db;
        }

        .btn-outline-secondary:disabled {
          opacity: 0.6;
          cursor: default;
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