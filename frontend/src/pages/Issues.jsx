import { useEffect, useState } from "react";
import api from "../api";
import AppShell from "../components/AppShell";
import IssueCard from "../components/IssueCard";

const COLUMNS = [
  { key: "open", label: "Open", dot: "var(--open)" },
  { key: "in_progress", label: "In Progress", dot: "var(--progress)" },
  { key: "in_review", label: "In Review", dot: "#7a5fd0" },
  { key: "resolved", label: "Resolved", dot: "var(--resolved)" },
];

const COLLAPSED_COUNT = 1; // how many issues to show before "Show all"

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [sprintFilter, setSprintFilter] = useState("");
  const [transitionError, setTransitionError] = useState("");

  // tracks which columns are expanded to show all issues
  const [expandedColumns, setExpandedColumns] = useState({});

  const load = () => {
    api.get("/issues").then((res) => setIssues(res.data));
    api.get("/projects").then((res) => setProjects(res.data));
    api.get("/sprints").then((res) => setSprints(res.data));
  };

  useEffect(load, []);

  const projectName = (id) => projects.find((p) => p.id === id)?.name;

  const filtered = issues.filter((issue) => {
    const matchesSearch =
      !search ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = !priorityFilter || issue.priority === priorityFilter;
    const matchesSeverity = !severityFilter || issue.severity === severityFilter;
    const matchesSprint = !sprintFilter || String(issue.sprint_id) === sprintFilter;
    return matchesSearch && matchesPriority && matchesSeverity && matchesSprint;
  });

  const handleStatusChange = async (id, status) => {
    setTransitionError("");
    try {
      await api.put(`/issues/${id}`, { status });
      load();
    } catch (err) {
      setTransitionError(err.response?.data?.detail || "Could not update status");
    }
  };

  const handlePriorityChange = async (id, priority) => {
    await api.put(`/issues/${id}`, { priority });
    load();
  };

  const handleSeverityChange = async (id, severity) => {
    await api.put(`/issues/${id}`, { severity });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this issue?")) return;
    await api.delete(`/issues/${id}`);
    load();
  };

  const toggleExpanded = (colKey) => {
    setExpandedColumns((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  return (
    <AppShell>
      <div className="page">
        <h2>Issues</h2>
        <p className="page-subtitle">All bugs across your projects.</p>

        {transitionError && <p className="error">{transitionError}</p>}

        <div className="toolbar" style={{ alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <input
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Severity</label>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Sprint</label>
            <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)}>
              <option value="">All Sprints</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="kanban">
          {COLUMNS.map((col) => {
            const colIssues = filtered.filter((i) => i.status === col.key);
            const isExpanded = !!expandedColumns[col.key];
            const visibleIssues = isExpanded ? colIssues : colIssues.slice(0, COLLAPSED_COUNT);
            const hiddenCount = colIssues.length - visibleIssues.length;

            return (
              <div className="kanban-column" key={col.key}>
                <div className="kanban-column-header">
                  <span className="dot" style={{ background: col.dot }} />
                  {col.label}
                  <span className="count">{colIssues.length}</span>
                </div>
                {colIssues.length === 0 && <div className="kanban-empty">No issues here</div>}
                {visibleIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    projectName={projectName(issue.project_id)}
                    onStatusChange={handleStatusChange}
                    onPriorityChange={handlePriorityChange}
                    onSeverityChange={handleSeverityChange}
                    onDelete={handleDelete}
                  />
                ))}
                {colIssues.length > COLLAPSED_COUNT && (
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => toggleExpanded(col.key)}
                    style={{ width: "100%", marginTop: 8 }}
                  >
                    {isExpanded ? "Show less" : `Show all (${hiddenCount} more)`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

