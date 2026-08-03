import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("bugflow_token"));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    api.get("/users/me").then((res) => setUser(res.data)).catch(() => setUser(null));
  }, [token]);

  const login = async (username, password) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    const res = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("bugflow_token", res.data.access_token);
    setToken(res.data.access_token);
  };

  const register = async (username, email, password, role) => {
    await api.post("/auth/register", { username, email, password, role });
  };

  const logout = () => {
    localStorage.removeItem("bugflow_token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
