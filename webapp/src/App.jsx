import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardShell from "./components/DashboardShell";
import Login from "./pages/Login";

import SuperAdminOverview from "./pages/superadmin/Overview";
import Colleges from "./pages/superadmin/Colleges";
import UserDetails from "./pages/superadmin/UserDetails";
import SuperAdminLogs from "./pages/superadmin/Logs";

import CollegeOverview from "./pages/college/Overview";
import Uploads from "./pages/college/Uploads";
import Students from "./pages/college/Students";
import Events from "./pages/college/Events";
import FaceData from "./pages/college/FaceData";
import CollegeLogs from "./pages/college/Logs";

const SUPER_ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/admin/colleges", label: "College maintenance", icon: "colleges" },
  { to: "/admin/users", label: "User details", icon: "users" },
  { to: "/admin/logs", label: "Logs", icon: "logs" },
];

const COLLEGE_NAV = [
  { to: "/college", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/college/uploads", label: "Upload data", icon: "upload" },
  { to: "/college/students", label: "Students", icon: "students" },
  { to: "/college/events", label: "Events", icon: "events" },
  { to: "/college/face-data", label: "Face detection data", icon: "face" },
  { to: "/college/logs", label: "Logs", icon: "logs" },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="super_admin">
            <DashboardShell navItems={SUPER_ADMIN_NAV} roleLabel="Super Admin" title="Super Admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperAdminOverview />} />
        <Route path="colleges" element={<Colleges />} />
        <Route path="users" element={<UserDetails />} />
        <Route path="logs" element={<SuperAdminLogs />} />
      </Route>

      <Route
        path="/college"
        element={
          <ProtectedRoute role="college">
            <DashboardShell navItems={COLLEGE_NAV} roleLabel="College Admin" title="College Dashboard" />
          </ProtectedRoute>
        }
      >
        <Route index element={<CollegeOverview />} />
        <Route path="uploads" element={<Uploads />} />
        <Route path="students" element={<Students />} />
        <Route path="events" element={<Events />} />
        <Route path="face-data" element={<FaceData />} />
        <Route path="logs" element={<CollegeLogs />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
