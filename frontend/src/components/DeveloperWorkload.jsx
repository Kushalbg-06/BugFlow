import React from "react";

// distinct color per developer row, cycling through this palette
const DEV_COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

// data: [{ developer_name, open_count, in_progress_count, resolved_count, workload_percentage }]
export default function DeveloperWorkload({ data }) {
  return (
    <div className="analytics-card">
      <h3 className="analytics-card-title">Developer Workload</h3>
      <table className="analytics-table workload-table">
        <thead>
          <tr>
            <th>Developer</th>
            <th>Open</th>
            <th>Prog.</th>
            <th>Res.</th>
            <th>Workload</th>
          </tr>
        </thead>
        <tbody>
          {data.map((dev, i) => {
            const color = DEV_COLORS[i % DEV_COLORS.length];
            return (
              <tr key={dev.developer_name}>
                <td className="workload-name">
                  <span className="donut-legend-dot" style={{ background: color, marginRight: 8 }} />
                  {dev.developer_name}
                </td>
                <td>{dev.open_count}</td>
                <td>{dev.in_progress_count}</td>
                <td>{dev.resolved_count}</td>
                <td>
                  <div className="workload-bar-row">
                    <div className="workload-bar-track">
                      <div
                        className="workload-bar-fill"
                        style={{ width: `${dev.workload_percentage}%`, background: color }}
                      />
                    </div>
                    <span className="workload-pct" style={{ color }}>
                      {dev.workload_percentage}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr><td colSpan={5} style={{ color: "#9ca3af", padding: "12px 0" }}>No workload data yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}