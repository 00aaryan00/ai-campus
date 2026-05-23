import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode;
  role: "student" | "faculty" | "hod" | "principal";
}) {
  const { isAuthenticated, role: userRole } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (userRole !== role) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
