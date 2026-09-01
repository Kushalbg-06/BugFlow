import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthSide from "../components/AuthSide";
import api from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
  
    try {
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);
  
      const res = await api.post("/auth/login", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
  
      localStorage.setItem(
        "bugflow_token",
        res.data.access_token
      );
  
      const userRes = await api.get("/users/me");
  
      login(userRes.data);
  
      navigate("/dashboard");
  
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Login failed"
      );
    }
  };

  // ...rest of component unchanged

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
            <div className="eyebrow">WELCOME BACK</div>
            <h2>Sign in to your workspace</h2>
            <p className="sub">Enter your account details to continue.</p>
            {error && <p className="error">{error}</p>}
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{ position: "absolute", right: 10, top: 12, background: "none", border: "none", fontSize: 12, color: "var(--maroon)", cursor: "pointer", fontWeight: 600 }}
              >
               
              </button>
            </div>
            <button className="btn" type="submit">Sign In</button>
            <p className="hint" style={{ textAlign: "center", marginTop: 10 }}>
              Don't have an account? <Link to="/register">Create account</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}