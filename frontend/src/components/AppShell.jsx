import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PERMISSIONS } from "../auth/permissions";
import NotificationBell from "./NotificationBell";
import "../styles/AppShell-nav.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/projects", label: "Projects", icon: "▥" },
  { to: "/issues", label: "Issues", icon: "◉" },
  { to: "/sprints", label: "Sprints", icon: "◷" },
  { to: "/analytics", label: "Analytics", icon: "▲" },
  { to: "/create-issue", label: "Create Issue", icon: "＋", permission: PERMISSIONS.CREATE_ISSUE },
];

export default function AppShell({ children }) {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => localStorage.getItem("bugflow-theme") || "light");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Just flips a data-theme attribute + remembers the choice. See the note
  // at the bottom of the CSS file about what this does and doesn't affect.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bugflow-theme", theme);
  }, [theme]);

  // Close the profile dropdown on any click outside it.
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initial = user?.username ? user.username[0].toUpperCase() : "?";
  const roleLabel = user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "";

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

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
          {visibleNavItems.map((item) => (
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
            <button
              type="button"
              className="theme-toggle-btn"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>

            <NotificationBell />

            <div className="topbar-user-section" ref={menuRef}>
              <div className="topbar-user" onClick={() => setMenuOpen((open) => !open)}>
                <div className="avatar">{initial}</div>
                <div className="topbar-user-info" style={{ textAlign: "right" }}>
                  <strong>{user?.username || "..."}</strong>
                  <span>{roleLabel}</span>
                </div>
                <span className={"topbar-chevron" + (menuOpen ? " open" : "")}>▾</span>
              </div>

              {menuOpen && (
                <div className="profile-dropdown">
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/profile");
                    }}
                  >
                    👤 Profile
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/settings");
                    }}
                  >
                    ⚙️ Settings
                  </div>
                  <div className="dropdown-divider" />
                  <div
                    className="dropdown-item logout"
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    ↩ Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}