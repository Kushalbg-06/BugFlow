import { useEffect, useState } from "react";
import api from "../api";

export default function ResolutionAssistant({ issueId, embedded = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api
      .get(`/issues/${issueId}/resolution-assistant`)
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load resolution assistant"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [issueId]);

  const handleRegenerate = () => {
    load();
  };

  return (
    <div className={embedded ? "ai-assistant-card embedded" : "ai-assistant-card"}>
      {!embedded && (
        <div className="ai-assistant-header" onClick={() => setCollapsed(!collapsed)}>
          <div className="ai-assistant-title">
            <span className="ai-star">🤖</span> AI Resolution Assistant
            <span className="beta-badge">BETA</span>
          </div>
          <span className="collapse-chevron">{collapsed ? "▾" : "▴"}</span>
        </div>
      )}

      {!collapsed && (
        <>
          <p className="ai-assistant-subtitle">
            AI-generated insights to help you investigate and resolve this issue faster.
          </p>

          {loading && <p className="hint">Loading...</p>}
          {error && <p className="error">{error}</p>}

          {data && (
            <>
              {/* Confidence / Impact / Effort */}
              <div className="stats-row">
                <div className="stat-box">
                  <div className="stat-label">📊 Confidence</div>
                  <div className="stat-value">{data.confidence_score}%</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">🧩 Impact Area</div>
                  <div className="stat-value-sm">{data.impact_area.join(" • ")}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">⏱ Effort</div>
                  <div className="stat-value-sm">{data.estimated_effort}</div>
                </div>
              </div>

              {/* Root Cause Hypotheses */}
              <div className="ai-section">
                <h5>🎯 Root Cause Hypotheses</h5>
                <ol className="hypothesis-list">
                  {data.root_cause_hypotheses.map((h, i) => (
                    <li key={i}>
                      <span className="hypothesis-text">{h.hypothesis}</span>
                      <span className="confidence-tag">{h.confidence}%</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Possible Investigation Areas */}
              <div className="ai-section">
                <h5>🔍 Possible Investigation Areas</h5>
                <ol className="detailed-list">
                  {data.investigation_areas.map((a, i) => (
                    <li key={i}>
                      <div className="detailed-item-title">{a.area}</div>
                      <div className="detailed-item-body">{a.detail}</div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Suggested Code Areas */}
              <div className="ai-section">
                <h5>🧑‍💻 Suggested Code Areas</h5>
                <div className="code-areas-grid">
                  {data.suggested_code_areas.frontend?.length > 0 && (
                    <div className="code-area-block">
                      <div className="code-area-label">Frontend</div>
                      {data.suggested_code_areas.frontend.map((f, i) => (
                        <div key={i} className="code-area-item">• {f}</div>
                      ))}
                    </div>
                  )}
                  {data.suggested_code_areas.backend?.length > 0 && (
                    <div className="code-area-block">
                      <div className="code-area-label">Backend</div>
                      {data.suggested_code_areas.backend.map((f, i) => (
                        <div key={i} className="code-area-item">• {f}</div>
                      ))}
                    </div>
                  )}
                  {data.suggested_code_areas.api?.length > 0 && (
                    <div className="code-area-block">
                      <div className="code-area-label">API</div>
                      {data.suggested_code_areas.api.map((f, i) => (
                        <div key={i} className="code-area-item">• {f}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Debugging Steps */}
              <div className="ai-section">
                <h5>🐞 Debugging Steps</h5>
                <ol className="detailed-list">
                  {data.debugging_steps.map((s, i) => (
                    <li key={i}>
                      <div className="detailed-item-title">{s.step}</div>
                      <div className="detailed-item-body">{s.detail}</div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Detected Mismatch */}
              {data.detected_mismatch && (
                <div className="ai-section mismatch-block">
                  <h5>⚠️ Detected Mismatch</h5>
                  <div className="mismatch-row">
                    <span className="mismatch-label">Expected</span>
                    <strong>{data.detected_mismatch.expected}</strong>
                  </div>
                  <div className="mismatch-row">
                    <span className="mismatch-label">Actual</span>
                    <strong>{data.detected_mismatch.actual}</strong>
                  </div>
                  <div className="mismatch-note">Likely issue: {data.detected_mismatch.likely_issue}</div>
                </div>
              )}

              {/* Similar Defects */}
              <div className="ai-section">
                <div className="ai-section-header-row">
                  <h5>🔗 Similar Defects</h5>
                  {data.similar_defects.length > 0 && (
                    <a href="#" className="view-all-link" onClick={(e) => e.preventDefault()}>
                      View all
                    </a>
                  )}
                </div>
                {data.similar_defects.length === 0 ? (
                  <p className="hint tight">No similar defects found.</p>
                ) : (
                  <div className="similar-defects-list">
                    {data.similar_defects.map((d) => (
                      <div key={d.issue_id} className="similar-defect-line">
                        <span className="defect-pill">BUG-{d.issue_id}</span>
                        <span>{d.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Previous Resolution */}
              {data.previous_resolution && (
                <div className="ai-section">
                  <h5>📝 Previous Resolution</h5>
                  <p className="previous-resolution-text">{data.previous_resolution}</p>
                </div>
              )}

              {/* Possible Resolution */}
              <div className="ai-section possible-resolution-box">
                <h5>💡 Possible Resolution</h5>
                <p>{data.possible_resolution}</p>
              </div>

              {/* Verification Checklist */}
              <div className="ai-section">
                <h5>🧪 Verification Checklist</h5>
                <div className="checklist">
                  {data.verification_checklist.map((c, i) => (
                    <label key={i} className="checklist-item">
                      <input type="checkbox" />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="ai-feedback-row">
                <button className="regenerate-btn" onClick={handleRegenerate} disabled={loading}>
                  {loading ? "..." : "🔄 Regenerate"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <style jsx>{`
        .ai-assistant-card {
          background: #fff;
          border: 1px solid #ece9fb;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .ai-assistant-card.embedded {
          border: none;
          box-shadow: none;
          padding: 0;
          margin-bottom: 0;
        }

        .ai-assistant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .ai-assistant-title {
          font-weight: 700;
          font-size: 15px;
          color: #4b2fd6;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ai-star { color: #8b5cf6; }
        .beta-badge {
          background: #efe9fe;
          color: #7c3aed;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          margin-left: 4px;
        }
        .collapse-chevron { color: #999; }
        .ai-assistant-subtitle {
          font-size: 13px;
          color: #777;
          line-height: 1.5;
          margin: 0 0 20px;
        }

        /* STATS ROW */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }
        .stat-box {
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .stat-label { font-size: 11px; color: #777; }
        .stat-value { font-size: 20px; font-weight: 700; color: #4b2fd6; }
        .stat-value-sm { font-size: 12.5px; font-weight: 600; color: #333; line-height: 1.4; }

        /* SECTIONS */
        .ai-section { margin-bottom: 22px; }
        .ai-section:last-of-type { margin-bottom: 0; }
        .ai-section h5 {
          font-size: 12px;
          font-weight: 700;
          color: #4b2fd6;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin: 0 0 12px;
        }

        .hypothesis-list {
          margin: 0;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .hypothesis-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: #333;
        }
        .hypothesis-text { flex: 1; }
        .confidence-tag {
          flex-shrink: 0;
          background: #f2effe;
          color: #5b3df5;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .detailed-list {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .detailed-item-title { font-weight: 600; color: #333; margin-bottom: 3px; }
        .detailed-item-body { font-size: 12.5px; color: #666; line-height: 1.5; }

        .code-areas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
        }
        .code-area-block {
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .code-area-label {
          font-weight: 700;
          font-size: 11px;
          color: #4b2fd6;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .code-area-item { font-size: 12.5px; color: #333; line-height: 1.6; }

        .mismatch-block {
          background: #fff8e6;
          border: 1px solid #f5e3a8;
          border-radius: 10px;
          padding: 14px;
        }
        .mismatch-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          margin-bottom: 6px;
        }
        .mismatch-label {
          color: #7a5c00;
          min-width: 60px;
          font-weight: 600;
        }
        .mismatch-note { font-size: 12.5px; color: #7a5c00; margin-top: 8px; }

        .ai-section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .ai-section-header-row h5 { margin-bottom: 0; }
        .view-all-link {
          font-size: 12px;
          color: #6d5ae6;
          text-decoration: none;
          font-weight: 600;
        }
        .similar-defects-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .similar-defect-line {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          color: #333;
        }
        .defect-pill {
          flex-shrink: 0;
          background: #f2effe;
          color: #5b3df5;
          border: 1px solid #e2dbfc;
          border-radius: 8px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: 600;
        }
        .hint.tight { padding: 0; margin: 0; text-align: left; }

        .previous-resolution-text {
          font-size: 13px;
          color: #555;
          background: #f8f8fb;
          border-radius: 8px;
          padding: 12px 14px;
          margin: 0;
          line-height: 1.6;
        }

        .possible-resolution-box {
          background: #edf9f0;
          border: 1px solid #d8f0dc;
          border-radius: 10px;
          padding: 14px;
        }
        .possible-resolution-box h5 { color: #2e7d32; }
        .possible-resolution-box p {
          font-size: 13px;
          color: #2f5233;
          margin: 0;
          line-height: 1.6;
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
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          cursor: pointer;
          accent-color: #5b3df5;
        }

        .ai-feedback-row {
          border-top: 1px solid #eee;
          padding-top: 16px;
          margin-top: 22px;
        }
        .regenerate-btn {
          width: 100%;
          background: #5b3df5;
          color: #fff;
          border: none;
          padding: 11px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .regenerate-btn:hover:not(:disabled) { background: #4c2dd4; }
        .regenerate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .hint {
          text-align: center;
          color: #999;
          font-size: 13px;
          padding: 20px;
        }
        .error { color: #d9001b; font-size: 13px; }
      `}</style>
    </div>
  );
}