import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthSide from "../components/AuthSide";

const ROLES = ["reporter", "qa", "developer", "admin"];

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "reporter" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(form.username, form.email, form.password, form.role);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
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
            {error && <p className="error">{error}</p>}
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
                <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
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