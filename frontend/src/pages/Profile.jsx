import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [issues, setIssues] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingIssues, setLoadingIssues] = useState(true);

  // Load issues
  useEffect(() => {
    setLoadingIssues(true);
    api
      .get("/issues")
      .then((res) => setIssues(res.data || []))
      .catch((err) => {
        console.error("Error loading issues:", err);
        setIssues([]);
      })
      .finally(() => setLoadingIssues(false));
  }, []);

  // Profile display
  const initial = user?.username ? user.username[0].toUpperCase() : "?";
  const roleLabel = user?.role ? user.role.replace(/_/g, " ").split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ") : "—";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  // Stats
  const issuesCreated = issues.filter((i) => i.reporter_id === user?.id).length;
  const issuesResolved = issues.filter((i) => i.status === "resolved" && i.reporter_id === user?.id).length;
  const assignedToMe = issues.filter((i) => i.assignee_id === user?.id).length;

  const startEdit = () => {
    setError("");
    setForm({
      full_name: user?.full_name || user?.username || "",
      email: user?.email || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!form.email || !form.full_name) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch("/users/me", {
        full_name: form.full_name,
        email: form.email,
      });
      
      // Update user in context
      if (setUser) {
        setUser(res.data);
      }
      
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update profile");
      console.error("Error updating profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <AppShell>
        <div className="page">
          <p>Loading profile...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page">
        <div className="page-header-row">
          <div>
            <h2>Profile</h2>
            <p className="page-subtitle">Manage your personal information and account settings.</p>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {/* Summary card */}
        <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative" }}>
              <div className="avatar" style={{ width: 72, height: 72, fontSize: 26 }}>{initial}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 19 }}>{user?.username || "..."}</div>
              <span className="profile-role-badge">{roleLabel}</span>
              <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>
                <span>✉ {user?.email || "—"}</span>
                <span>📅 Member since <strong style={{ color: "var(--text-dark)" }}>{memberSince}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 32 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{issuesCreated}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Issues Created</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{issuesResolved}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Issues Resolved</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{assignedToMe}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Assigned to Me</div>
            </div>
          </div>
        </div>

        {/* Row 1 */}
        <div className="profile-card-grid">
          <div className="panel">
            <CardHeader icon="👤" title="Personal Information" onEdit={editing ? null : startEdit} />
            {editing ? (
              <form onSubmit={handleSave}>
                <label>Full Name</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12 }}
                />
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn btn-sm" type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button className="btn btn-outline btn-sm" type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <ProfileRow label="Full Name" value={user?.full_name || user?.username || "—"} />
                <ProfileRow label="Email" value={user?.email || "—"} />
                <ProfileRow label="Role" value={roleLabel} />
              </>
            )}
          </div>

          <div className="panel">
            <CardHeader icon="🛡" title="Account" />
            <ProfileRow label="Member Since" value={memberSince} />
            <ProfileRow label="Last Active" value="Today" />
            <ProfileRow label="Account Status" value={<span className="status-badge">Active</span>} />
            <ProfileRow label="Language" value="English" />
            <ProfileRow label="Time Zone" value="(GMT+05:30) Asia/Kolkata" />
          </div>

          <div className="panel">
            <CardHeader icon="🔒" title="Security" />
            <ProfileRow label="Password" value="••••••••" />
            <ProfileRow label="Two-Factor Auth" value="Disabled" />
            <ProfileRow label="Active Sessions" value="2" />
            <ProfileRow label="Login History" value="Available" />
          </div>
        </div>

        {/* Row 2 */}
        <div className="profile-card-grid" style={{ marginTop: 20 }}>
          <div className="panel">
            <CardHeader icon="🔔" title="Notification Preferences" />
            <ToggleRow label="Issue assigned to me" on />
            <ToggleRow label="Issue status changed" on />
            <ToggleRow label="New comment" on />
            <ToggleRow label="Mention notifications" on />
            <ToggleRow label="Sprint deadline reminders" on />
          </div>

          <div className="panel">
            <CardHeader icon="📈" title="Activity Overview" />
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px" }}>
              {loadingIssues ? "Loading activity..." : "Your recent activity in BugFlow."}
            </p>
            {!loadingIssues && issues.length === 0 && (
              <ActivityRow text="No recent activity yet" time="" />
            )}
            {!loadingIssues && issues.length > 0 && (
              <>
                <ActivityRow text={`${issuesCreated} issues created`} time="" />
                <ActivityRow text={`${assignedToMe} issues assigned`} time="" />
                {issuesResolved > 0 && <ActivityRow text={`${issuesResolved} issues resolved`} time="" />}
              </>
            )}
            <a href="#" className="profile-link">View All Activity →</a>
          </div>

          <div className="panel">
            <CardHeader icon="⚙" title="Preferences" />
            <ProfileRow label="Theme" value="Light" />
            <ProfileRow label="Date Format" value="DD MMM YYYY" />
            <ProfileRow label="Time Format" value="12 Hour" />
            <ProfileRow label="Items per page" value="10" />
            <ProfileRow label="Default Project" value={user?.default_project || "None"} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function CardHeader({ icon, title, onEdit }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div className="profile-card-title" style={{ marginBottom: 0 }}>
        {icon} {title}
      </div>
      {onEdit && (
        <button className="btn btn-outline btn-sm" type="button" onClick={onEdit}>
          ✏ Edit
        </button>
      )}
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-label">{label}</span>
      <span className="profile-info-value">{value}</span>
    </div>
  );
}

function ToggleRow({ label, on }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-value" style={{ fontWeight: 500 }}>{label}</span>
      <span className={"toggle-pill" + (on ? " on" : "")} style={{ marginLeft: "auto" }}>{on ? "On" : "Off"}</span>
    </div>
  );
}

function ActivityRow({ text, time }) {
  return (
    <div className="profile-info-row">
      <span className="activity-dot" />
      <span className="profile-info-value">{text}</span>
      {time && <span className="profile-info-label" style={{ marginLeft: "auto" }}>{time}</span>}
    </div>
  );
}