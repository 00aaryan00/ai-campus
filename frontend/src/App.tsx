import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Landing from "./pages/LandingPage";
import TenantEntry from "./pages/TenantEntry";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PlatformLogin from "./pages/PlatformLogin";
import PlatformInstitutions from "./pages/PlatformInstitutions";
import PlatformCreateInstitution from "./pages/PlatformCreateInstitution";
import TenantAdminOnboarding from "./pages/TenantAdminOnboarding";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import HODDashboard from "./pages/HODDashboard";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import TakeTest from "./pages/TakeTest";
import ProtectedRoute from "./components/ProtectedRoute";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tenant-access" element={<TenantEntry />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/t/:tenantSlug/login" element={<Login />} />
        <Route path="/t/:tenantSlug/signup" element={<Signup />} />
        <Route path="/platform/login" element={<PlatformLogin />} />
        <Route path="/platform/institutions" element={<PlatformInstitutions />} />
        <Route path="/platform/institutions/new" element={<PlatformCreateInstitution />} />

        <Route
          path="/t/:tenantSlug/student"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/t/:tenantSlug/take-test"
          element={
            <ProtectedRoute role="student">
              <TakeTest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/t/:tenantSlug/faculty"
          element={
            <ProtectedRoute role="faculty">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/t/:tenantSlug/hod"
          element={
            <ProtectedRoute role="hod">
              <HODDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/t/:tenantSlug/admin"
          element={
            <ProtectedRoute role="institution_admin">
              <PrincipalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/t/:tenantSlug/admin/onboarding"
          element={
            <ProtectedRoute role="institution_admin">
              <TenantAdminOnboarding />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Navigate to="/tenant-access" replace />} />
        <Route path="/signup" element={<Navigate to="/tenant-access" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
