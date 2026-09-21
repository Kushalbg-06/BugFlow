import api from "../api";

export const getNotifications = (params = {}) =>
  api.get("/notifications", { params }).then((res) => res.data);

export const getUnreadCount = () =>
  api.get("/notifications/unread-count").then((res) => res.data.count);

export const markNotificationRead = (id) =>
  api.post(`/notifications/${id}/read`).then((res) => res.data);

export const markAllNotificationsRead = () =>
  api.post("/notifications/mark-all-read").then((res) => res.data);