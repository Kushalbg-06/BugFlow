import { useEffect, useState } from "react";
import api from "../api";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { PERMISSIONS } from "../auth/permissions";

const ROLES = ["admin", "manager", "developer", "qa", "reporter"];

export default function Users() {
  const { user: me, hasPermission } = useAuth();
  const canManageRoles = hasPermission(PERMISSIONS.MANAGE_ROLES);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", role: "reporter" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/users")
      .then((res) => setUsers(res.data))
      .catch(() => setError("Could not load users"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRoleChange = async (userId, newRole) => {
    setError("");
    setSavingId(userId);
    try {
      const res = await api.patch(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update role");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    setError("");
    setSavingId(userId);
    try {
      const res = await api.patch(`/users/${userId}/status`, { is_active: !isActive });
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update status");
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await api.post("/users", createForm);
      setShowCreate(false);
      setCreateForm({ username: "", email: "", password: "", role: "reporter" });
      load();
    } catch (err) {
      setCreateError(err.response?.data?.detail || "Could not create user");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <div className="page">
        <div className="users-header">
          <div>
            <h2>Users</h2>
            <p className="page-subtitle">Manage team members, roles, and access.</p>
          </div>
          <button className="btn" onClick={() => setShowCreate(true)}>+ Create User</button>
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="hint">Loading users...</p>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className={!u.is_active ? "row-inactive" : ""}>
                      <td>
                        <strong>{u.username}</strong>
                        {isSelf && <span className="you-badge">You</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {canManageRoles ? (
                          <select
                            value={u.role}
                            disabled={isSelf || savingId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="role-select"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="role-label">{u.role[0].toUpperCase() + u.role.slice(1)}</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={`status-pill ${u.is_active ? "status-active" : "status-inactive"}`}
                          disabled={isSelf || savingId === u.id}
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          title={isSelf ? "You cannot deactivate your own account" : ""}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="muted">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Create User</h3>
              {createError && <p className="error">{createError}</p>}
              <form onSubmit={handleCreate}>
                <label>Username</label>
                <input
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  required
                />
                <label>Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
                <label>Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
                <label>Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)} disabled={creating}>
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={creating}>
                    {creating ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .users-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .users-table-wrap {
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
        }
        .users-table th {
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: #fafafa;
        }
        .users-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          font-size: 14px;
          vertical-align: middle;
        }
        .users-table tr:last-child td {
          border-bottom: none;
        }
        .row-inactive {
          opacity: 0.55;
        }
        .you-badge {
          margin-left: 8px;
          font-size: 10px;
          font-weight: 700;
          color: #5b3df5;
          background: #ede9fe;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .muted {
          color: #999;
        }
        .role-select {
          padding: 6px 8px;
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 13px;
        }
        .role-label {
          font-size: 13px;
          color: #333;
        }
        .status-pill {
          border: none;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .status-pill:disabled {
          cursor: not-allowed;
        }
        .status-active {
          background: #dcfce7;
          color: #166534;
        }
        .status-inactive {
          background: #fee2e2;
          color: #991b1b;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .modal-card {
          background: white;
          border-radius: 10px;
          padding: 24px;
          width: 360px;
          max-width: 90vw;
        }
        .modal-card h3 {
          margin: 0 0 16px 0;
        }
        .modal-card form {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .modal-card label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          margin-top: 8px;
        }
        .modal-card input,
        .modal-card select {
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
        }
      `}</style>
    </AppShell>
  );
}