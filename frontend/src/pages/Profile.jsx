import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import SkillsExpertise from "../components/SkillsExpertise";


export default function Profile() {
  const { user, setUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);

  // Load user stats
  useEffect(() => {
    if (!user?.id) return;
    
    setLoadingStats(true);
    api
      .get("/users/me/stats")
      .then((res) => setStats(res.data))
      .catch((err) => {
        console.error("Error loading stats:", err);
        setStats(null);
      })
      .finally(() => setLoadingStats(false));
  }, [user?.id]);

  // Profile display
  const initial = user?.username ? user.username[0].toUpperCase() : "?";
  const roleLabel = user?.role 
    ? user.role.replace(/_/g, " ").split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")
    : "—";
  
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  const displayName = user?.full_name || user?.username || "User";

  // Stats with fallback
  const issuesCreated = stats?.issues_created || 0;
  const issuesResolved = stats?.issues_resolved || 0;
  const assignedToMe = stats?.issues_assigned || 0;
  const totalComments = stats?.total_comments || 0;

  const startEdit = () => {
    setError("");
    setForm({
      full_name: user?.full_name || "",
      email: user?.email || "",
      bio: user?.bio || "",
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
    
    if (!form.email) {
      setError("Email is required");
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch("/users/me", {
        full_name: form.full_name || null,
        email: form.email,
        bio: form.bio || null,
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
              <div style={{ fontWeight: 700, fontSize: 19 }}>{displayName}</div>
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
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{totalComments}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Comments</div>
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
                  placeholder="Your full name"
                  style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12, width: "100%" }}
                />
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12, width: "100%" }}
                />
                <label>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell us about yourself"
                  style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12, width: "100%", minHeight: 80, fontFamily: "inherit" }}
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
                <ProfileRow label="Full Name" value={user?.full_name || "—"} />
                <ProfileRow label="Email" value={user?.email || "—"} />
                <ProfileRow label="Role" value={roleLabel} />
                {user?.bio && <ProfileRow label="Bio" value={user.bio} />}
              </>
            )}
          </div>

          <SkillsExpertise />

          <div className="panel">
            <CardHeader icon="🛡" title="Account" />
            <ProfileRow label="Member Since" value={memberSince} />
            <ProfileRow label="Account Status" value={<span className="status-badge">Active</span>} />
            <ProfileRow label="User ID" value={`#${user?.id || "—"}`} />
            <ProfileRow label="Language" value="English" />
            <ProfileRow label="Time Zone" value="(GMT+05:30) Asia/Kolkata" />
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
              {loadingStats ? "Loading activity..." : "Your recent activity in BugFlow."}
            </p>
            {!loadingStats && stats ? (
              <>
                <ActivityRow text={`${issuesCreated} issues created`} time="" />
                <ActivityRow text={`${assignedToMe} issues assigned`} time="" />
                <ActivityRow text={`${issuesResolved} issues resolved`} time="" />
                <ActivityRow text={`${totalComments} comments added`} time="" />
              </>
            ) : (
              <ActivityRow text="Loading stats..." time="" />
            )}
            <a href="/issues" className="profile-link">View All Issues →</a>
          </div>

          <div className="panel">
            <CardHeader icon="⚙" title="Preferences" />
            <ProfileRow label="Theme" value="Light" />
            <ProfileRow label="Date Format" value="DD MMM YYYY" />
            <ProfileRow label="Time Format" value="12 Hour" />
            <ProfileRow label="Items per page" value="10" />
            <ProfileRow label="Default View" value="Dashboard" />
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