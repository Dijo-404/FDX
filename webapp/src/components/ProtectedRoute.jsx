import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role, roles, children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if ((role && user.role !== role) || (roles && !roles.includes(user.role))) {
    const home =
      user.role === "super_admin"
        ? "/admin"
        : user.role === "collaborator"
          ? "/collaborator"
          : "/organization";
    return <Navigate to={home} replace />;
  }

  return children;
}
