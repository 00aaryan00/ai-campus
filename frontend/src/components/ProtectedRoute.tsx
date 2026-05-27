import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type AllowedRole = "student" | "faculty" | "hod" | "institution_admin";

export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode;
  role: AllowedRole;
}) {
  const { isAuthenticated, role: userRole, tenantSlug, token } = useAuth();
  const params = useParams<{ tenantSlug: string }>();
  const routeTenant = params.tenantSlug;

  if (!routeTenant) return <Navigate to="/" replace />;

  if (!isAuthenticated || !token) {
    return <Navigate to={`/t/${routeTenant}/login`} replace />;
  }

  if (tenantSlug && routeTenant !== tenantSlug) {
    return <Navigate to={`/t/${tenantSlug}/login`} replace />;
  }

  if (userRole !== role) return <Navigate to={`/t/${routeTenant}/login`} replace />;

  return <>{children}</>;
}
