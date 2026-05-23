import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export default function RoleBasedRoute({
  children,
  allowedRole,
}: {
  children: ReactNode;
  allowedRole: string;
}) {
  const { role } = useAuth();

  if (role !== allowedRole) {
    return <Navigate to="/select-role" replace />;
  }

  return <>{children}</>;
}