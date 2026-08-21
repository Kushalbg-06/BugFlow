import { useEffect, useState } from "react";
import api from "../api";

export default function ResolutionAssistant({ issueId }) {
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
    <div className="ai-assistant-card">
      <div className="ai-assistant-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="ai-assistant-title">
          <span className="ai-star">🤖</span> AI Resolution Assistant
          <span className="beta-badge">BETA</span>
        </div>
        <span className="collapse-chevron">{collapsed ? "▾" : "▴"}</span>
      </div>

      {!collapsed && (
        <>
          <p className="ai-assistant-subtitle">
            AI-generated insights to help you investigate and resolve this issue faster.
          </p>

          {loading && <p className="hint">Loading...</p>}
          {error && <p className="error">{error}</p>}

          {data && (
            <>
              {/* Root Cause Hypotheses */}
              <div className="ai-section">
                <h5>🎯 Root Cause Hypotheses</h5>
                <ol className="hypothesis-list">
                  {data.root_cause_hypotheses.map((h, i) => (
                    <li key={i}>
                      {h.hypothesis} <span className="confidence-tag">{h.confidence}%</span>
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
                    <div>
                      <div className="code-area-label">Frontend</div>
                      {data.suggested_code_areas.frontend.map((f, i) => (
                        <div key={i} className="code-area-item">• {f}</div>
                      ))}
                    </div>
                  )}
                  {data.suggested_code_areas.backend?.length > 0 && (
                    <div>
                      <div className="code-area-label">Backend</div>
                      {data.suggested_code_areas.backend.map((f, i) => (
                        <div key={i} className="code-area-item">• {f}</div>
                      ))}
                    </div>
                  )}
                  {data.suggested_code_areas.api?.length > 0 && (
                    <div>
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
                    <span>Expected:</span> <strong>{data.detected_mismatch.expected}</strong>
                  </div>
                  <div className="mismatch-row">
                    <span>Actual:</span> <strong>{data.detected_mismatch.actual}</strong>
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
                  <p className="hint" style={{ fontSize: 12, margin: 0 }}>
                    No similar defects found.
                  </p>
                ) : (
                  data.similar_defects.map((d) => (
                    <div key={d.issue_id} className="similar-defect-line">
                      <span className="defect-pill">BUG-{d.issue_id}</span> {d.title}
                    </div>
                  ))
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

              {/* Verification Checklist */}
              <div className="ai-section">
                <h5>🧪 Verification Checklist</h5>
                {data.verification_checklist.map((c, i) => (
                  <label key={i} className="checklist-item">
                    <input type="checkbox" /> {c}
                  </label>
                ))}
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
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
          font-size: 12px;
          color: #777;
          margin: 8px 0 16px;
        }
        .ai-section { margin-bottom: 16px; }
        .ai-section h5 {
          font-size: 12px;
          font-weight: 700;
          color: #4b2fd6;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin: 0 0 8px;
        }
        .hypothesis-list {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #333;
          line-height: 1.8;
        }
        .confidence-tag {
          background: #f2effe;
          color: #5b3df5;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          margin-left: 4px;
        }
        .detailed-list {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
        }
        .detailed-list li { margin-bottom: 10px; }
        .detailed-item-title { font-weight: 600; color: #333; }
        .detailed-item-body { font-size: 12px; color: #666; margin-top: 2px; }
        .code-areas-grid {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .code-area-label {
          font-weight: 700;
          font-size: 11px;
          color: #4b2fd6;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .code-area-item { font-size: 12px; color: #333; margin-bottom: 2px; }
        .mismatch-block {
          background: #fff8e6;
          border: 1px solid #f5e3a8;
          border-radius: 8px;
          padding: 12px;
        }
        .mismatch-row { font-size: 13px; margin-bottom: 4px; }
        .mismatch-row span { color: #777; margin-right: 6px; }
        .mismatch-note { font-size: 12px; color: #7a5c00; margin-top: 6px; }
        .ai-section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .view-all-link {
          font-size: 12px;
          color: #6d5ae6;
          text-decoration: none;
        }
        .similar-defect-line {
          font-size: 12px;
          color: #333;
          margin-bottom: 6px;
        }
        .defect-pill {
          background: #f2effe;
          color: #5b3df5;
          border: 1px solid #e2dbfc;
          border-radius: 8px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          margin-right: 6px;
        }
        .previous-resolution-text {
          font-size: 13px;
          color: #555;
          background: #f8f8fb;
          border-radius: 8px;
          padding: 10px 12px;
          margin: 0;
          line-height: 1.5;
        }
        .possible-resolution-box {
          background: #edf9f0;
          border: 1px solid #d8f0dc;
          border-radius: 8px;
          padding: 12px;
        }
        .possible-resolution-box h5 { color: #2e7d32; }
        .possible-resolution-box p {
          font-size: 13px;
          color: #2f5233;
          margin: 0;
          line-height: 1.5;
        }
        .stats-row {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .stat-box {
          flex: 1;
          min-width: 90px;
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 10px;
        }
        .stat-label { font-size: 10px; color: #777; margin-bottom: 4px; }
        .stat-value { font-size: 18px; font-weight: 700; color: #4b2fd6; }
        .stat-value-sm { font-size: 12px; font-weight: 600; color: #333; }
        .checklist-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .ai-feedback-row {
          border-top: 1px solid #eee;
          padding-top: 12px;
        }
        .regenerate-btn {
          width: 100%;
          background: #5b3df5;
          color: #fff;
          border: none;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .regenerate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}