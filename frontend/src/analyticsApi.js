import api from "./api"; 
export const getAnalyticsSummary = (windowDays = 30) =>
  api.get(`/analytics/summary`, { params: { window_days: windowDays } }).then(r => r.data);

export const getBySeverity = () =>
  api.get(`/analytics/by-severity`).then(r => r.data);

export const getByCategory = () =>
  api.get(`/analytics/by-category`).then(r => r.data);

export const getByStatus = () =>
  api.get(`/analytics/by-status`).then(r => r.data);

export const getTrends = (days = 7) =>
  api.get(`/analytics/trends`, { params: { days } }).then(r => r.data);

export const getDeveloperWorkload = (limit = 5) =>
  api.get(`/analytics/developer-workload`, { params: { limit } }).then(r => r.data);

export const getRecentDefects = (limit = 5, severity, status) =>
  api.get(`/analytics/recent-defects`, { params: { limit, severity: severity || undefined, status: status || undefined } }).then(r => r.data);