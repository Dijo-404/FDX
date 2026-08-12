import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role, roles, children }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if ((role && user.role !== role) || (roles && !roles.includes(user.role))) {
    return (
      <Navigate
        to={user.role === "super_admin" ? "/admin" : "/organization"}
        replace
      />
    );
  }

  return children;
}
