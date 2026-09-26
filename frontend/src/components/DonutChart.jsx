import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const DEFAULT_COLORS = ["#6366f1", "#3b82f6", "#22c55e", "#f97316", "#d1d5db", "#eab308"];

export default function DonutChart({ title, data, colors = DEFAULT_COLORS }) {
  return (
    <div className="analytics-card">
      <h3 className="analytics-card-title">{title}</h3>
      <div className="donut-row">
        <div className="donut-visual">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                innerRadius="65%"
                outerRadius="100%"
                paddingAngle={2}
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="donut-legend">
          {data.map((d, i) => (
            <li className="donut-legend-row" key={d.label}>
              <span className="donut-legend-label">
                <span className="donut-legend-dot" style={{ background: colors[i % colors.length] }} />
                {d.label}
              </span>
              <span className="donut-legend-value">
                {d.count} ({d.percentage}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}