import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../utils/notificationsApi";
import "../styles/notifications.css";

const CATEGORY_META = {
  assigned: { icon: "🔴", label: "Assigned" },
  comments: { icon: "💬", label: "Comments" },
  status: { icon: "🟡", label: "Status" },
  ai: { icon: "🤖", label: "AI" },
  system: { icon: "🟣", label: "System" },
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const refreshUnreadCount = useCallback(() => {
    getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications({ limit: 5 })
      .then((data) => {
        setItems(data.items);
        setUnreadCount(data.unread_count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (item) => {
    if (!item.is_read) {
      markNotificationRead(item.id)
        .then(() => setUnreadCount((c) => Math.max(0, c - 1)))
        .catch(() => {});
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllNotificationsRead()
      .then(() => {
        setUnreadCount(0);
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      })
      .catch(() => {});
  };

  return (
    <div className="notification-section" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        title="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" className="mark-all-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-panel-list">
            {loading && <div className="notification-empty">Loading…</div>}

            {!loading && items.length === 0 && (
              <div className="notification-empty">You're all caught up.</div>
            )}

            {!loading &&
              items.map((item) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.system;
                return (
                  <div
                    key={item.id}
                    className={"notification-row" + (item.is_read ? "" : " unread")}
                    onClick={() => handleItemClick(item)}
                  >
                    <span className="notification-row-icon">{meta.icon}</span>
                    <div className="notification-row-body">
                      <div className="notification-row-title">{item.title}</div>
                      {item.message && (
                        <div className="notification-row-message">{item.message}</div>
                      )}
                      <div className="notification-row-time">{timeAgo(item.created_at)}</div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div
            className="notification-panel-footer"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            View all notifications →
          </div>
        </div>
      )}
    </div>
  );
}