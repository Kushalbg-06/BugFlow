import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, AlertCircle, Loader2, CheckCircle2, Clock, Calendar, Filter, X, Eye } from "lucide-react";
import AppShell from "../components/AppShell";
import StatCard from "../components/StatCard";
import DonutChart from "../components/DonutChart";
import TrendChart from "../components/TrendChart";
import DeveloperWorkload from "../components/DeveloperWorkload";
import RecentDefectsTable from "../components/RecentDefectsTable";
import "../styles/analytics.css";
import {
  getAnalyticsSummary, getBySeverity, getByCategory, getByStatus,
  getTrends, getDeveloperWorkload, getRecentDefects,
} from "../analyticsApi";

const SEVERITY_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
const CATEGORY_COLORS = ["#6366f1", "#3b82f6", "#22c55e", "#f97316", "#d1d5db", "#a855f7"];
const STATUS_COLORS = ["#ef4444", "#f97316", "#3b82f6", "#22c55e"];

const DATE_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const SEVERITY_OPTIONS = ["critical", "high", "medium", "low"];
const STATUS_OPTIONS = ["open", "in_progress", "in_review", "resolved"];

export default function Analytics() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [severity, setSeverity] = useState([]);
  const [category, setCategory] = useState([]);
  const [status, setStatus] = useState([]);
  const [trends, setTrends] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // date range control
  const [dateRange, setDateRange] = useState(DATE_RANGES[1]);
  const [dateOpen, setDateOpen] = useState(false);

  // recent-defects filter control
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [appliedSeverity, setAppliedSeverity] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");

  const activeFilterCount = (appliedSeverity ? 1 : 0) + (appliedStatus ? 1 : 0);

  // reload everything that depends on the date range
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getAnalyticsSummary(dateRange.days),
      getBySeverity(),
      getByCategory(),
      getByStatus(),
      getTrends(dateRange.days),
      getDeveloperWorkload(5),
      getRecentDefects(5, appliedSeverity, appliedStatus),
    ])
      .then(([s, sev, cat, st, tr, wl, rd]) => {
        if (cancelled) return;
        setSummary(s); setSeverity(sev); setCategory(cat); setStatus(st);
        setTrends(tr); setWorkload(wl); setRecent(rd);
      })
      .catch(() => !cancelled && setError("Couldn't load analytics."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [dateRange]);

  // reload only recent defects when filters change
  useEffect(() => {
    getRecentDefects(5, appliedSeverity, appliedStatus).then(setRecent).catch(() => {});
  }, [appliedSeverity, appliedStatus]);

  const applyFilters = () => {
    setAppliedSeverity(filterSeverity);
    setAppliedStatus(filterStatus);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterSeverity("");
    setFilterStatus("");
    setAppliedSeverity("");
    setAppliedStatus("");
    setFilterOpen(false);
  };

  return (
    <AppShell>
      <div className="page">
        <div className="page-header-row">
          <div>
            <h2>Analytics</h2>
            <p className="page-subtitle">Overview of defect metrics and team performance</p>
          </div>

          <div style={{ display: "flex", gap: 10, position: "relative" }}>
            {/* Date range dropdown */}
            <div style={{ position: "relative" }}>
              <button
                className="view-all-btn"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => { setDateOpen((o) => !o); setFilterOpen(false); }}
              >
                <Calendar size={14} /> {dateRange.label}
              </button>
              {dateOpen && (
                <div className="dropdown-panel">
                  {DATE_RANGES.map((r) => (
                    <button
                      key={r.label}
                      className={"dropdown-item" + (r.label === dateRange.label ? " active" : "")}
                      onClick={() => { setDateRange(r); setDateOpen(false); }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filters dropdown */}
            <div style={{ position: "relative" }}>
              <button
                className="view-all-btn"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => { setFilterOpen((o) => !o); setDateOpen(false); }}
              >
                <Filter size={14} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
              {filterOpen && (
                <div className="dropdown-panel" style={{ width: 220 }}>
                  <div className="dropdown-section-label">Severity</div>
                  <select
                    className="dropdown-select"
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                  >
                    <option value="">All</option>
                    {SEVERITY_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>

                  <div className="dropdown-section-label" style={{ marginTop: 10 }}>Status</div>
                  <select
                    className="dropdown-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>

                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button className="dropdown-apply-btn" onClick={applyFilters}>Apply</button>
                    <button className="dropdown-clear-btn" onClick={clearFilters}>
                      <X size={12} /> Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && <p className="hint">Loading analytics…</p>}
        {error && <p className="hint" style={{ color: "#dc2626" }}>{error}</p>}

        {!loading && !error && (
          <>
            <div className="analytics-grid-6">
              <StatCard label="Total Defects" value={summary.total_defects} delta={summary.total_delta} icon={<Bug size={16} color="#4338ca" />} />
              <StatCard label="Open Defects" value={summary.open_defects} delta={summary.open_delta} icon={<AlertCircle size={16} color="#ea580c" />} accent="orange" />
              <StatCard label="In Progress" value={summary.in_progress_defects} delta={summary.in_progress_delta} icon={<Loader2 size={16} color="#ca8a04" />} accent="yellow" />
              <StatCard label="In Review" value={summary.in_review_defects} delta={summary.in_review_delta} icon={<Eye size={16} color="#2563eb" />} accent="blue" />
              <StatCard label="Resolved Defects" value={summary.resolved_defects} delta={summary.resolved_delta} icon={<CheckCircle2 size={16} color="#16a34a" />} accent="green" />
              <StatCard label="Avg. Resolution Time" value={`${summary.avg_resolution_days} days`} delta={summary.avg_resolution_delta} icon={<Clock size={16} color="#4338ca" />} />
            </div>

            <div className="analytics-grid-3">
              <DonutChart title="Issues by Severity" data={severity} colors={SEVERITY_COLORS} />
              <DonutChart title="Issues by Category" data={category} colors={CATEGORY_COLORS} />
              <DonutChart title="Issues by Status" data={status} colors={STATUS_COLORS} />
            </div>

            <div className="analytics-grid-2">
              <TrendChart data={trends} />
              <DeveloperWorkload data={workload} />
            </div>

            <RecentDefectsTable data={recent} onViewAll={() => navigate("/issues")} />
          </>
        )}
      </div>
    </AppShell>
  );
}