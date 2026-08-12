import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardShell from "./components/DashboardShell";
import Login from "./pages/Login";

import SuperAdminOverview from "./pages/superadmin/Overview";
import Organizations from "./pages/superadmin/Organizations";
import OrganizationUsers from "./pages/superadmin/OrganizationUsers";
import SystemHealth from "./pages/superadmin/SystemHealth";
import SuperAdminLogs from "./pages/superadmin/Logs";

import OrganizationOverview from "./pages/organization/Overview";
import Events from "./pages/organization/Events";
import Participants from "./pages/organization/Participants";
import Uploads from "./pages/organization/Uploads";
import Processing from "./pages/organization/Processing";
import FaceMatches from "./pages/organization/FaceMatches";
import Deliveries from "./pages/organization/Deliveries";
import OrganizationLogs from "./pages/organization/Logs";
import Settings from "./pages/organization/Settings";

const SUPER_ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: "dashboard", end: true },
  { to: "/admin/organizations", label: "Organizations", icon: "organization" },
  { to: "/admin/users", label: "Organization users", icon: "users" },
  { to: "/admin/system", label: "System health", icon: "health" },
  { to: "/admin/logs", label: "Audit logs", icon: "logs" },
];

const ORGANIZATION_NAV = [
  { to: "/organization", label: "Overview", icon: "dashboard", end: true },
  { to: "/organization/events", label: "Events", icon: "events" },
  { to: "/organization/participants", label: "Participants", icon: "students" },
  { to: "/organization/uploads", label: "Uploads", icon: "upload" },
  { to: "/organization/processing", label: "Processing", icon: "processing" },
  { to: "/organization/matches", label: "Face matches", icon: "face" },
  { to: "/organization/deliveries", label: "Deliveries", icon: "delivery" },
  { to: "/organization/logs", label: "Audit logs", icon: "logs" },
  { to: "/organization/settings", label: "Settings", icon: "settings" },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/admin" element={<ProtectedRoute role="super_admin"><DashboardShell navItems={SUPER_ADMIN_NAV} roleLabel="Super Admin" title="FDX Control Center" /></ProtectedRoute>}>
        <Route index element={<SuperAdminOverview />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="users" element={<OrganizationUsers />} />
        <Route path="system" element={<SystemHealth />} />
        <Route path="logs" element={<SuperAdminLogs />} />
        <Route path="colleges" element={<Navigate to="/admin/organizations" replace />} />
      </Route>

      <Route path="/organization" element={<ProtectedRoute role="org_admin"><DashboardShell navItems={ORGANIZATION_NAV} roleLabel="Organization Admin" title="Organization Workspace" /></ProtectedRoute>}>
        <Route index element={<OrganizationOverview />} />
        <Route path="events" element={<Events />} />
        <Route path="participants" element={<Participants />} />
        <Route path="uploads" element={<Uploads />} />
        <Route path="processing" element={<Processing />} />
        <Route path="matches" element={<FaceMatches />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="logs" element={<OrganizationLogs />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/college/*" element={<Navigate to="/organization" replace />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
