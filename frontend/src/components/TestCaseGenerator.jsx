import { useState } from "react";
import api from "../api";

const PRIORITY_COLORS = {
  high: { bg: "#fee2e2", color: "#b91c1c" },
  medium: { bg: "#fde047", color: "#854d0e" },
  low: { bg: "#dcfce7", color: "#15803d" },
};

export default function TestCaseGenerator({ issueId }) {
  const [testCases, setTestCases] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setError("");
    setSaved(false);
    api
      .get(`/issues/${issueId}/generate-test-cases`)
      .then((res) => setTestCases(res.data))
      .catch(() => setError("Could not generate test cases"))
      .finally(() => setLoading(false));
  };

  const handleAddAll = () => {
    if (!testCases?.length) return;
    setSaving(true);
    setError("");
    api
      .post(`/issues/${issueId}/test-cases`, { test_cases: testCases })
      .then(() => setSaved(true))
      .catch(() => setError("Could not save test cases"))
      .finally(() => setSaving(false));
  };

  const hasResults = testCases && testCases.length > 0;

  return (
    <div className="tc-generator-card">
      <p className="tc-subtitle">Based on this defect, generate test cases.</p>

      {!hasResults && (
        <button className="tc-generate-btn" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Test Cases"}
        </button>
      )}

      {error && <p className="tc-error">{error}</p>}

      {testCases?.length === 0 && <p className="tc-empty">No test cases could be generated.</p>}

      {hasResults && (
        <>
          <div className="tc-results-header">Generated Test Cases</div>

          <div className="tc-list">
            {testCases.map((tc, i) => {
              const color = PRIORITY_COLORS[tc.priority] || PRIORITY_COLORS.medium;
              return (
                <div className="tc-item" key={i}>
                  <div className="tc-item-top">
                    <span className="tc-id">TC-{String(i + 1).padStart(3, "0")}</span>
                    <span className="tc-priority-badge" style={{ backgroundColor: color.bg, color: color.color }}>
                      {tc.priority?.toUpperCase()}
                    </span>
                  </div>
                  <div className="tc-item-title">{tc.title}</div>
                  <div className="tc-item-expected">Expected: {tc.expected_result}</div>
                </div>
              );
            })}
          </div>

          <div className="tc-footer-actions">
            <button className="tc-regenerate-btn" onClick={handleGenerate} disabled={loading}>
              {loading ? "Regenerating..." : "Regenerate"}
            </button>
            <button className="tc-add-all-btn" onClick={handleAddAll} disabled={saving || saved}>
              {saved ? "Added to Test Cases" : saving ? "Saving..." : "+ Add All to Test Cases"}
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        .tc-generator-card {
          display: flex;
          flex-direction: column;
        }
        .tc-subtitle {
          font-size: 13px;
          color: #777;
          margin: 0 0 16px;
        }
        .tc-generate-btn {
          width: 100%;
          background: #5b3df5;
          color: #fff;
          border: none;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .tc-generate-btn:hover:not(:disabled) { background: #4c2dd4; }
        .tc-generate-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .tc-error {
          color: #d9001b;
          font-size: 13px;
          margin: 12px 0 0;
        }
        .tc-empty {
          font-size: 13px;
          color: #999;
          margin: 12px 0 0;
        }

        .tc-results-header {
          font-size: 12px;
          font-weight: 700;
          color: #5b3df5;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin: 0 0 12px;
        }

        .tc-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .tc-item {
          background: #f9f8fc;
          border: 1px solid #ede9fe;
          border-radius: 10px;
          padding: 14px;
        }
        .tc-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .tc-id {
          font-size: 11px;
          font-weight: 700;
          color: #5b3df5;
          background: #ede9fe;
          padding: 3px 9px;
          border-radius: 5px;
        }
        .tc-priority-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 5px;
        }
        .tc-item-title {
          font-size: 14px;
          font-weight: 600;
          color: #222;
          margin-bottom: 4px;
          line-height: 1.4;
        }
        .tc-item-expected {
          font-size: 12.5px;
          color: #666;
          line-height: 1.4;
        }

        .tc-footer-actions {
          display: flex;
          gap: 10px;
          border-top: 1px solid #eee;
          padding-top: 16px;
        }
        .tc-regenerate-btn {
          flex: 1;
          background: #fff;
          color: #5b3df5;
          border: 1px solid #d8cffe;
          padding: 11px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .tc-regenerate-btn:hover:not(:disabled) { background: #f5f1ff; }
        .tc-regenerate-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .tc-add-all-btn {
          flex: 1;
          background: #16a34a;
          color: #fff;
          border: none;
          padding: 11px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .tc-add-all-btn:hover:not(:disabled) { background: #128a3e; }
        .tc-add-all-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </div>
  );
}