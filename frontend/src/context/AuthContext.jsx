import { createContext, useContext, useState, useEffect } from "react";
import { hasPermission as checkPermission, hasRole as checkRole } from "../auth/permissions";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedRole = localStorage.getItem("userRole");

    if (savedUser && savedRole) {
      try {
        setUser(JSON.parse(savedUser));
        setRole(savedRole);
      } catch (error) {
        console.error("Error parsing saved user:", error);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    setRole(userData.role);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("userRole", userData.role);
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("bugflow_token");
  };

  const updateUser = (updatedUserData) => {
    const newUser = { ...user, ...updatedUserData };
    setUser(newUser);
    setRole(newUser.role);
    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("userRole", newUser.role);
  };

  const updateUserRole = (newRole) => {
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      setRole(newRole);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("userRole", newRole);
    }
  };

  const isAuthenticated = !!user;

  // NEW: permission helpers, bound to the current role
  const hasPermission = (permission) => checkPermission(role, permission);
  const hasRole = (...roles) => checkRole(role, ...roles);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        login,
        logout,
        loading,
        updateUserRole,
        setUser: updateUser,
        isAuthenticated,
        hasPermission, // NEW
        hasRole,        // NEW
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};