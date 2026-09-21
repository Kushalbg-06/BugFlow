import React from "react";

/**
 * icon: any react node (e.g. lucide-react icon)
 * accent: "default" | "orange" | "green" | "blue"  -> tints the card background
 */
const ACCENT_BG = {
  default: "#ffffff",
  orange: "#fef3e2",
  green: "#e7f7ee",
  blue: "#eaf1ff",
  yellow: "#fef9e7",
};

const ACCENT_ICON_BG = {
  default: "#f1f0fb",
  orange: "#fde2b8",
  green: "#c9f0da",
  blue: "#dbe6ff",
  yellow: "#fce9a8",
};

export default function StatCard({ label, value, delta, icon, accent = "default" }) {
  const deltaColor = delta?.direction === "up" ? "#16a34a" : "#dc2626";
  const deltaArrow = delta?.direction === "up" ? "↑" : "↓";

  return (
    <div
      style={{
        background: ACCENT_BG[accent],
        border: "1px solid #eceafb",
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{label}</span>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: ACCENT_ICON_BG[accent],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#1f2430" }}>{value}</div>
      {delta && (
        <div style={{ fontSize: 12, color: deltaColor, fontWeight: 600 }}>
          {deltaArrow} {delta.value}%{" "}
          <span style={{ color: "#9ca3af", fontWeight: 400 }}>vs last 30 days</span>
        </div>
      )}
    </div>
  );
}