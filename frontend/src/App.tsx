import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/select-role" element={<Navigate to="/login" replace />} />

        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/take-test"
          element={
            <ProtectedRoute role="student">
              <TakeTest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/faculty"
          element={
            <ProtectedRoute role="faculty">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/teacher" element={<Navigate to="/faculty" replace />} />

        <Route
          path="/hod"
          element={
            <ProtectedRoute role="hod">
              <HODDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/principal"
          element={
            <ProtectedRoute role="principal">
              <PrincipalDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
