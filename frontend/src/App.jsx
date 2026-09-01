import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Issues from "./pages/Issues";
import IssueForm from "./pages/IssueForm";
import IssueDetail from "./pages/IssueDetail";
import Sprints from "./pages/Sprints";
import Profile from "./pages/Profile";

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function HomeRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
      <Route path="/issues" element={<PrivateRoute><Issues /></PrivateRoute>} />
      <Route path="/create-issue" element={<PrivateRoute><IssueForm /></PrivateRoute>} />
      <Route path="/issues/:id/report" element={<PrivateRoute><IssueDetail /></PrivateRoute>} />
      <Route path="/sprints" element={<PrivateRoute><Sprints /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

