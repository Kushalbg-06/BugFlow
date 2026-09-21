import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * <ProtectedRoute permission="MANAGE_USERS"><Users /></ProtectedRoute>
 * <ProtectedRoute role="admin"><Users /></ProtectedRoute>       // role-based alt
 * <ProtectedRoute permission="MANAGE_USERS" role="admin">...    // both checked
 */
export default function ProtectedRoute({ children, permission, role }) {
  const { isAuthenticated, hasPermission, hasRole, loading } = useAuth();

  if (loading) return null; // avoid flashing a redirect while auth state hydrates

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (role && !hasRole(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}