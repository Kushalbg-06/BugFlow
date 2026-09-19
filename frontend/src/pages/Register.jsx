import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthSide from "../components/AuthSide";
import api from "../api";

const ROLES = ["reporter", "qa", "developer", "manager", "admin"];

const errorBoxStyle = {
  padding: "12px 16px",
  marginBottom: "16px",
  backgroundColor: "#fee2e2",
  borderLeft: "4px solid #ef4444",
  borderRadius: "4px",
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "500",
};

const roleLabel = (role) => (role === "qa" ? "QA" : role[0].toUpperCase() + role.slice(1));

const apiMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join(". ");
  }
  return fallback;
};

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "reporter" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(apiMessage(err, "Registration failed"));
    }
  };

  return (
    <div className="auth-shell">
      <AuthSide />
      <div className="auth-form-side">
      <div className="auth-form-card">
          <div className="auth-form-brand">
          <div className="sidebar-logo">
          <img src="/bugflow-logo.png" alt="BugFlow Logo" />
          </div>
            BugFlow
          </div>
          <form onSubmit={handleSubmit}>
            <div className="eyebrow">GET STARTED</div>
            <h2>Create your workspace account</h2>
            <p className="sub">Fill in your details to continue.</p>
            {error && (
              <div style={errorBoxStyle}>
                ⚠️ {error}
              </div>
            )}
            {success && <p className="success">Account created! Redirecting to login...</p>}
            <label>Username</label>
            <input value={form.username} onChange={update("username")} required />
            <label>Email address</label>
            <input type="email" value={form.email} onChange={update("email")} required />
            <label>Password</label>
            <input type="password" value={form.password} onChange={update("password")} required />
            <label>Role</label>
            <select value={form.role} onChange={update("role")}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
            <button className="btn" type="submit">Create account</button>
            <p className="hint" style={{ textAlign: "center", marginTop: 10 }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
