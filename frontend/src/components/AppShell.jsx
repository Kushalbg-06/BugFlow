import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/projects", label: "Projects", icon: "▥" },
  { to: "/issues", label: "Issues", icon: "◉" },
  { to: "/sprints", label: "Sprints", icon: "◷" },
  { to: "/create-issue", label: "Create Issue", icon: "＋" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initial = user?.username ? user.username[0].toUpperCase() : "?";
  const roleLabel = user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
        <div className="sidebar-logo">
        <img src="/bugflow-logo.png" alt="BugFlow Logo" />
        </div>
          <div className="sidebar-brand-text">
            <strong>BugFlow</strong>
            <span>Bug Management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div
          className="sidebar-footer sidebar-profile"
          onClick={() => navigate("/profile")}
          style={{ cursor: "pointer" }}
        >
          <div className="avatar">{initial}</div>
          <div className="topbar-user-info">
            <strong>{user?.username || "..."}</strong>
            <span>{roleLabel}</span>
          </div>
          <span className="sidebar-profile-chevron">›</span>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-brand">BugFlow</div>
          <div className="topbar-right">
            <button className="btn btn-sm" onClick={handleLogout}>
              ↩ Logout
            </button>
            <div
              className="topbar-user"
              onClick={() => navigate("/profile")}
              style={{ cursor: "pointer" }}
            >
              <div className="topbar-user-info" style={{ textAlign: "right" }}>
                <strong>{user?.username || "..."}</strong>
                <span>{roleLabel}</span>
              </div>
              <div className="avatar">{initial}</div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

