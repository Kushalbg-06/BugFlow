import React from "react";

const SEVERITY_STYLE = {
  critical: { bg: "#fee2e2", color: "#dc2626" },
  high: { bg: "#ffedd5", color: "#ea580c" },
  medium: { bg: "#fef3c7", color: "#ca8a04" },
  low: { bg: "#dcfce7", color: "#16a34a" },
};

const STATUS_STYLE = {
  open: { bg: "#fee2e2", color: "#dc2626" },
  in_progress: { bg: "#ffedd5", color: "#ea580c" },
  in_review: { bg: "#e0e7ff", color: "#4338ca" },
  resolved: { bg: "#dcfce7", color: "#16a34a" },
};

function Badge({ text, style }) {
  return (
    <span className="badge" style={{ background: style?.bg || "#f3f4f6", color: style?.color || "#374151" }}>
      {text ? text.replace("_", " ") : "—"}
    </span>
  );
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// data: [{ key, title, project_name, severity, status, assignee_name, created_at, resolution_days }]
export default function RecentDefectsTable({ data, onViewAll }) {
  return (
    <div className="defects-table-card">
      <div className="defects-table-header">
        <h3 className="analytics-card-title" style={{ margin: 0 }}>Recent Defects</h3>
        <button className="view-all-btn" onClick={onViewAll}>View All</button>
      </div>
      <table className="defects-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Project</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Assigned To</th>
            <th>Created On</th>
            <th>Resolution Time</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td style={{ color: "#6b7280" }}>{d.key}</td>
              <td className="title-cell">{d.title}</td>
              <td>{d.project_name}</td>
              <td><Badge text={d.severity} style={SEVERITY_STYLE[d.severity]} /></td>
              <td><Badge text={d.status} style={STATUS_STYLE[d.status]} /></td>
              <td>
                <span className="assignee-cell">
                  <span className="assignee-avatar">{initials(d.assignee_name)}</span>
                  {d.assignee_name || "Unassigned"}
                </span>
              </td>
              <td style={{ color: "#6b7280" }}>
                {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </td>
              <td style={{ color: "#6b7280" }}>
                {d.resolution_days != null ? `${d.resolution_days} days` : "—"}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={8} style={{ color: "#9ca3af", padding: "12px 0" }}>No defects yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}