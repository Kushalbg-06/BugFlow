import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";
import "../styles/dashboard.css";
import { useAuth } from "../context/AuthContext";
import { PERMISSIONS } from "../auth/permissions";

// ---- config: colors + icons kept local so this page has zero dependency
// on the shape of your existing analytics components ----
const STATUS_META = {
  open: { label: "Open", color: "#ef4444" },
  in_progress: { label: "In Progress", color: "#f59e0b" },
  in_review: { label: "In Review", color: "#8b5cf6" },
  resolved: { label: "Resolved", color: "#22c55e" },
};

const PRIORITY_META = {
  critical: { label: "Critical", color: "#ef4444" },
  high: { label: "High", color: "#f97316" },
  medium: { label: "Medium", color: "#eab308" },
  low: { label: "Low", color: "#3b82f6" },
};

const ACTIVITY_ICON = {
  status_change: { icon: "↻", bg: "#fff3e0", fg: "#f97316" },
  created: { icon: "＋", bg: "#fde8e8", fg: "#ef4444" },
  resolved: { icon: "✓", bg: "#e7f8ee", fg: "#22c55e" },
  comment: { icon: "💬", bg: "#eef0ff", fg: "#6366f1" },
  sprint: { icon: "▤", bg: "#e7f2fe", fg: "#3b82f6" },
  default: { icon: "•", bg: "#f1f1f4", fg: "#6b7280" },
};

const QUOTES = [
  "Small fixes lead to big progress.",
  "Every bug closed is a step forward.",
  "Consistency beats intensity.",
  "Ship it, then improve it.",
];

function countSince(list, days, field = "created_at") {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return list.filter((item) => item[field] && new Date(item[field]).getTime() >= cutoff).length;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const { hasPermission, user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Optional: recent activity feed. Adjust the endpoint below to whatever
  // your backend actually exposes (app/routers + app/services/activity.py) —
  // this assumes GET /activity/recent, and silently falls back to an
  // issue-derived feed if that route doesn't exist.
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const navigate = useNavigate();
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  useEffect(() => {
    Promise.all([api.get("/issues"), api.get("/projects")])
      .then(([issuesRes, projectsRes]) => {
        setIssues(issuesRes.data);
        setProjects(projectsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/activity/recent")
      .then((res) => !cancelled && setActivity(res.data))
      .catch(() => {
        // fallback: synthesize a feed from the most recently created/updated issues
        if (cancelled) return;
        const derived = [...issues]
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 5)
          .map((i) => ({
            type: "created",
            title: "New issue created",
            subtitle: i.title,
            time: i.created_at,
          }));
        setActivity(derived);
      })
      .finally(() => !cancelled && setActivityLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues]);

  const counts = {
    total: issues.length,
    open: issues.filter((i) => i.status === "open").length,
    in_progress: issues.filter((i) => i.status === "in_progress").length,
    in_review: issues.filter((i) => i.status === "in_review").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
  };

  const priorityCounts = {
    critical: issues.filter((i) => i.priority === "critical").length,
    high: issues.filter((i) => i.priority === "high").length,
    medium: issues.filter((i) => i.priority === "medium").length,
    low: issues.filter((i) => i.priority === "low").length,
  };
  const maxPriority = Math.max(1, ...Object.values(priorityCounts));
  // round the axis top up to a clean multiple of 5 so the scale reads like
  // a normal chart (0 / 5 / 10 / 15) instead of an arbitrary max value
  const niceMax = Math.max(5, Math.ceil(maxPriority / 5) * 5);
  const axisTicks = [niceMax, Math.round((niceMax * 2) / 3), Math.round(niceMax / 3), 0];

  const donutGradient = useMemo(() => {
    const total = counts.total || 1;
    const order = ["open", "in_progress", "in_review", "resolved"];
    let acc = 0;
    const stops = order.map((key) => {
      const start = (acc / total) * 360;
      acc += counts[key];
      const end = (acc / total) * 360;
      return `${STATUS_META[key].color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [counts]);

  const projectName = (projectId, fallbackIssue) =>
    fallbackIssue?.project?.name ||
    projects.find((p) => p.id === projectId)?.name ||
    "—";

  // Adjust this chain to whatever field your /auth "me" response actually
  // returns — falling back through the common possibilities so the greeting
  // never silently renders as just "Welcome back!".
  const displayName =
    user?.name || user?.full_name || user?.username || user?.email?.split("@")[0];

  const newIssuesThisWeek = countSince(issues, 7);
  const openThisWeek = countSince(
    issues.filter((i) => i.status === "open"),
    7
  );
  const inProgressThisWeek = countSince(
    issues.filter((i) => i.status === "in_progress"),
    7
  );
  const resolvedThisWeek = countSince(
    issues.filter((i) => i.status === "resolved"),
    7
  );
  const projectsThisMonth = countSince(projects, 30);

  const canCreateIssue = hasPermission(PERMISSIONS.CREATE_ISSUE);
  const recentIssues = [...issues]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 4);
  const recentProjects = [...projects].slice(0, 4);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <AppShell>
      <div className="page dashboard">
        <div className="page-header-row">
          <div>
            <h2>
              Welcome back
              {displayName ? `, ${displayName}` : ""}!
            </h2>
            <p className="page-subtitle">Here's what's happening with your workspace today.</p>
          </div>
          <div className="header-right">
            <div className="date-badge">
              <span className="date-icon">📅</span>
              <div>
                <div className="date-main">{todayLabel}</div>
                <div className="date-sub">Have a productive day!</div>
              </div>
            </div>
            {canCreateIssue && (
              <button className="btn" onClick={() => navigate("/create-issue")}>
                + Create Issue
              </button>
            )}
          </div>
        </div>

        {/* ---- stat cards ---- */}
        <div className="stat-grid">
          <StatCard
            label="Total Projects"
            value={projects.length}
            icon="▥"
            tone="blue"
            trend={`+${projectsThisMonth} this month`}
            trendTone={projectsThisMonth > 0 ? "good" : "flat"}
          />
          <StatCard
            label="Total Issues"
            value={counts.total}
            icon="◉"
            tone="indigo"
            trend={`+${newIssuesThisWeek} this week`}
            trendTone={newIssuesThisWeek > 0 ? "good" : "flat"}
          />
          <StatCard
            label="Open Issues"
            value={counts.open}
            icon="!"
            tone="red"
            trend={`+${openThisWeek} this week`}
            trendTone={openThisWeek > 0 ? "bad" : "flat"}
          />
          <StatCard
            label="In Progress"
            value={counts.in_progress}
            icon="↻"
            tone="orange"
            trend={`+${inProgressThisWeek} this week`}
            trendTone={inProgressThisWeek > 0 ? "good" : "flat"}
          />
          <StatCard
            label="Resolved"
            value={counts.resolved}
            icon="✓"
            tone="green"
            trend={`+${resolvedThisWeek} this week`}
            trendTone={resolvedThisWeek > 0 ? "good" : "flat"}
          />
        </div>

        {!loading && (
          <>
            {/* ---- charts + activity row ---- */}
            <div className="dash-grid-3">
              <div className="panel">
                <div className="panel-header">
                  <h3>Issue Status Overview</h3>
                </div>
                <div className="panel-center">
                  <div className="donut-row">
                    <div className="donut" style={{ background: donutGradient }}>
                      <div className="donut-hole">
                        <div className="donut-total">{counts.total}</div>
                        <div className="donut-sub">Total Issues</div>
                      </div>
                    </div>
                    <ul className="legend">
                      {Object.entries(STATUS_META).map(([key, meta]) => (
                        <li key={key}>
                          <span className="dot" style={{ background: meta.color }} />
                          {meta.label}
                          <span className="legend-count">{counts[key] || 0}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Priority Distribution</h3>
                </div>
                <div className="priority-chart">
                  <div className="priority-yaxis">
                    {axisTicks.map((t) => (
                      <span key={t} style={{ bottom: `${(t / niceMax) * 100}%` }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="priority-plot">
                    {axisTicks.map((t) => (
                      <span
                        key={`grid-${t}`}
                        className={`priority-gridline${t === 0 ? " baseline" : ""}`}
                        style={{ bottom: `${(t / niceMax) * 100}%` }}
                      />
                    ))}
                    <div className="bar-chart">
                      {Object.entries(PRIORITY_META).map(([key, meta]) => {
                        const value = priorityCounts[key] || 0;
                        const heightPct = (value / niceMax) * 100;
                        return (
                          <div className="bar-col" key={key}>
                            <span className="bar-value">{value}</span>
                            <div
                              className="bar-fill"
                              style={{ height: `${heightPct}%`, background: meta.color }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="priority-yaxis-spacer" />
                  <div className="bar-labels">
                    {Object.values(PRIORITY_META).map((meta) => (
                      <span key={meta.label}>{meta.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Recent Activity</h3>
                  <Link to="/activity" className="link-sm">
                    View All
                  </Link>
                </div>
                <ul className="activity-feed">
                  {activity.slice(0, 4).map((a, idx) => {
                    const meta = ACTIVITY_ICON[a.type] || ACTIVITY_ICON.default;
                    return (
                      <li key={idx}>
                        <span
                          className="activity-icon"
                          style={{ background: meta.bg, color: meta.fg }}
                        >
                          {meta.icon}
                        </span>
                        <div className="activity-body">
                          <div className="activity-title">{a.title}</div>
                          <div className="activity-subtitle">{a.subtitle}</div>
                        </div>
                        <span className="activity-time">{timeAgo(a.time)}</span>
                      </li>
                    );
                  })}
                  {!activityLoading && activity.length === 0 && (
                    <p className="hint">No recent activity.</p>
                  )}
                </ul>
              </div>
            </div>

            {/* ---- issues table + projects row ---- */}
            <div className="dash-grid-2">
              <div className="panel">
                <div className="panel-header">
                  <h3>Recent Issues</h3>
                  <Link to="/issues" className="btn btn-outline btn-sm">
                    View All
                  </Link>
                </div>
                <div className="table-scroll">
                  <table className="issue-table">
                    <colgroup>
                      <col style={{ width: "56px" }} />
                      <col style={{ width: "180px" }} />
                      <col style={{ width: "120px" }} />
                      <col style={{ width: "96px" }} />
                      <col style={{ width: "84px" }} />
                      <col style={{ width: "92px" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Title</th>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentIssues.map((issue) => {
                        const status = STATUS_META[issue.status] || STATUS_META.open;
                        const priority = PRIORITY_META[issue.priority] || PRIORITY_META.low;
                        return (
                          <tr
                            key={issue.id}
                            onClick={() => navigate(`/issues/${issue.id}`)}
                          >
                            <td className="mono">{issue.key || `#${issue.id}`}</td>
                            <td className="truncate" title={issue.title}>
                              {issue.title}
                            </td>
                            <td className="truncate" title={projectName(issue.project_id, issue)}>
                              {projectName(issue.project_id, issue)}
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{ background: `${status.color}1a`, color: status.color }}
                              >
                                {status.label}
                              </span>
                            </td>
                            <td>
                              <span className="priority-tag">
                                <span className="dot" style={{ background: priority.color }} />
                                {priority.label}
                              </span>
                            </td>
                            <td className="muted nowrap">
                              {issue.created_at
                                ? new Date(issue.created_at).toLocaleDateString(undefined, {
                                    day: "2-digit",
                                    month: "short",
                                  })
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                      {recentIssues.length === 0 && (
                        <tr>
                          <td colSpan={6} className="hint">
                            No issues yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Your Projects</h3>
                  <Link to="/projects" className="btn btn-outline btn-sm">
                    View All
                  </Link>
                </div>
                {recentProjects.map((project) => {
                  const projIssues = issues.filter((i) => i.project_id === project.id);
                  return (
                    <div
                      className="project-row"
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="project-icon">{project.name?.[0]?.toUpperCase() || "P"}</div>
                      <div className="project-info">
                        <h4>{project.name}</h4>
                        <p>{project.description || "No description"}</p>
                        <span className="project-meta">{projIssues.length} Issues</span>
                      </div>
                      <span className="chevron">›</span>
                    </div>
                  );
                })}
                {projects.length === 0 && <p className="hint">No projects yet.</p>}
              </div>
            </div>

            {/* ---- AI banner ---- */}
            <div className="ai-banner">
              <div>
                <strong>Need help prioritizing issues?</strong>
                <p>Use AI to get smart suggestions, detect trends, and improve productivity.</p>
              </div>
              <div className="ai-banner-actions">
                <button className="btn-ai" onClick={() => navigate("/ai-assistant")}>
                  ✦ Try AI Assistant
                </button>
                <span className="quote">"{quote}"</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon, tone, trend, trendTone = "flat" }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {trend && (
          <div className={`stat-trend trend-${trendTone}`}>
            <span className="trend-arrow">↑</span>
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}