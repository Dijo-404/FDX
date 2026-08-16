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
import EventDetail from "./pages/organization/EventDetail";
import Participants from "./pages/organization/Participants";
import Uploads from "./pages/organization/Uploads";
import Processing from "./pages/organization/Processing";
import Deliveries from "./pages/organization/Deliveries";
import OrganizationLogs from "./pages/organization/Logs";
import Settings from "./pages/organization/Settings";
import Team from "./pages/organization/Team";
import EmailOutbox from "./pages/organization/EmailOutbox";
import AcceptInvite from "./pages/public/AcceptInvite";
import Enrollment from "./pages/public/Enrollment";
import Gallery from "./pages/public/Gallery";
import ForgotPassword from "./pages/public/ForgotPassword";
import ResetPassword from "./pages/public/ResetPassword";
import CollaboratorOrganizations from "./pages/collaborator/Organizations";
import CollaboratorEvents from "./pages/collaborator/Events";

const SUPER_ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: "dashboard", end: true },
  { to: "/admin/organizations", label: "Organizations", icon: "organization" },
  { to: "/admin/users", label: "Users & collaborators", icon: "users" },
  { to: "/admin/system", label: "System health", icon: "health" },
  { to: "/admin/logs", label: "Audit logs", icon: "logs" },
];

const ORGANIZATION_NAV = [
  { to: "/organization", label: "Overview", icon: "dashboard", end: true },
  { to: "/organization/events", label: "Events", icon: "events" },
  { to: "/organization/uploads", label: "Uploads", icon: "upload" },
  { to: "/organization/participants", label: "Participants", icon: "students" },
  {
    to: "/organization/processing",
    label: "Processing & matches",
    icon: "processing",
  },
  { to: "/organization/deliveries", label: "Deliveries", icon: "delivery" },
  {
    to: "/organization/emails",
    label: "Email delivery",
    icon: "mail",
    roles: ["org_admin"],
  },
  {
    to: "/organization/team",
    label: "Team",
    icon: "users",
    roles: ["org_admin"],
  },
  { to: "/organization/logs", label: "Audit logs", icon: "logs" },
  {
    to: "/organization/settings",
    label: "Settings",
    icon: "settings",
    roles: ["org_admin"],
  },
];

const COLLABORATOR_NAV = [
  {
    to: "/collaborator",
    label: "Organizations",
    icon: "organization",
    end: true,
  },
  { to: "/collaborator/events", label: "Events", icon: "events" },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/enroll/:token" element={<Enrollment />} />
      <Route path="/gallery/:token" element={<Gallery />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="super_admin">
            <DashboardShell
              navItems={SUPER_ADMIN_NAV}
              roleLabel="Super Admin"
              title="FDX Control Center"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperAdminOverview />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="users" element={<OrganizationUsers />} />
        <Route path="system" element={<SystemHealth />} />
        <Route path="logs" element={<SuperAdminLogs />} />
        <Route
          path="colleges"
          element={<Navigate to="/admin/organizations" replace />}
        />
      </Route>

      <Route
        path="/collaborator"
        element={
          <ProtectedRoute role="collaborator">
            <DashboardShell
              navItems={COLLABORATOR_NAV}
              roleLabel="Collaborator"
              title="Collaborator Workspace"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<CollaboratorOrganizations />} />
        <Route path="events" element={<CollaboratorEvents />} />
      </Route>

      <Route
        path="/organization"
        element={
          <ProtectedRoute roles={["org_admin", "staff"]}>
            <DashboardShell
              navItems={ORGANIZATION_NAV}
              roleLabel="Organization"
              title="Organization Workspace"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<OrganizationOverview />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:eventId" element={<EventDetail />} />
        <Route path="participants" element={<Participants />} />
        <Route path="uploads" element={<Uploads />} />
        <Route path="processing" element={<Processing />} />
        <Route
          path="matches"
          element={<Navigate to="/organization/processing" replace />}
        />
        <Route path="deliveries" element={<Deliveries />} />
        <Route
          path="emails"
          element={
            <ProtectedRoute role="org_admin">
              <EmailOutbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="team"
          element={
            <ProtectedRoute role="org_admin">
              <Team />
            </ProtectedRoute>
          }
        />
        <Route path="logs" element={<OrganizationLogs />} />
        <Route
          path="settings"
          element={
            <ProtectedRoute role="org_admin">
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/college/*"
        element={<Navigate to="/organization" replace />}
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
