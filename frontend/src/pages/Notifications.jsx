import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../utils/notificationsApi";
import "../styles/notifications.css";

const TABS = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Assigned" },
  { key: "comments", label: "Comments" },
  { key: "status", label: "Status" },
  { key: "ai", label: "AI" },
  { key: "system", label: "System" },
];

const CATEGORY_META = {
  assigned: { icon: "🔴" },
  comments: { icon: "💬" },
  status: { icon: "🟡" },
  ai: { icon: "🤖" },
  system: { icon: "🟣" },
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

export default function Notifications() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    getNotifications({ category: tab, limit: pageSize, offset: 0 })
      .then((data) => {
        setItems(data.items);
        setUnreadCount(data.unread_count);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const loadMore = () => {
    const nextOffset = offset + pageSize;
    getNotifications({ category: tab, limit: pageSize, offset: nextOffset }).then((data) => {
      setItems((prev) => [...prev, ...data.items]);
      setOffset(nextOffset);
    });
  };

  const handleItemClick = (item) => {
    if (!item.is_read) {
      markNotificationRead(item.id).then(() => {
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      });
    }
    if (item.link) navigate(item.link);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead().then(() => {
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    });
  };

  return (
    <AppShell>
      <div className="page notifications-page">
        <div className="page-header-row">
          <div>
            <h2>Notifications</h2>
            <p className="page-subtitle">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>
              Mark all read
            </button>
          )}
        </div>

        <div className="notification-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={"notification-tab" + (tab === t.key ? " active" : "")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="panel notifications-list-panel">
          {loading && <p className="hint">Loading…</p>}

          {!loading && items.length === 0 && (
            <p className="hint">No notifications in this category yet.</p>
          )}

          {!loading &&
            items.map((item) => {
              const meta = CATEGORY_META[item.category] || {};
              return (
                <div
                  key={item.id}
                  className={"notification-row" + (item.is_read ? "" : " unread")}
                  onClick={() => handleItemClick(item)}
                >
                  <span className="notification-row-icon">{meta.icon || "🔔"}</span>
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

          {!loading && items.length < total && (
            <button className="btn btn-outline btn-sm load-more-btn" onClick={loadMore}>
              Load more
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}