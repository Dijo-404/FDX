/* oxlint-disable react/only-export-components -- Provider and hook form one public context API. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const PlatformContext = createContext(null);
const initialState = {
  organizations: [],
  organizationUsers: [],
  events: [],
  participants: [],
  matches: [],
  deliveries: [],
  logs: [],
  services: [],
  uploads: [],
  jobs: [],
  team: [],
  emails: [],
  dashboard: null,
  organization: null,
  system: null,
};

export function PlatformProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setData(initialState);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (user.role === "super_admin") {
        const [dashboard, organizations, users, logs, system] =
          await Promise.all([
            api("/admin/dashboard"),
            api("/admin/organizations"),
            api("/admin/users"),
            api("/admin/logs"),
            api("/admin/system"),
          ]);
        setData({
          ...initialState,
          dashboard,
          organizations: organizations.items,
          organizationUsers: users.items,
          logs: logs.items,
          services: system.services,
          system,
        });
      } else {
        const adminRequests =
          user.role === "org_admin"
            ? [api("/organization/team"), api("/organization/emails")]
            : [Promise.resolve({ items: [] }), Promise.resolve({ items: [] })];
        const [
          dashboard,
          events,
          participants,
          uploads,
          processing,
          matches,
          deliveries,
          logs,
          organization,
          team,
          emails,
        ] = await Promise.all([
          api("/organization/dashboard"),
          api("/organization/events"),
          api("/organization/participants"),
          api("/organization/uploads"),
          api("/organization/processing"),
          api("/organization/matches"),
          api("/organization/deliveries"),
          api("/organization/logs"),
          api("/organization/settings"),
          ...adminRequests,
        ]);
        setData({
          ...initialState,
          dashboard,
          organization,
          events: events.items,
          participants: participants.items,
          uploads: uploads.items,
          jobs: processing.items,
          processingStats: processing.stats,
          matches: matches.items,
          matchStats: matches.stats,
          deliveries: deliveries.items,
          deliveryStats: deliveries.stats,
          logs: logs.items,
          team: team.items,
          emails: emails.items,
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mutate = useCallback(
    async (path, options) => {
      const result = await api(path, options);
      await refresh();
      return result;
    },
    [refresh],
  );
  const value = useMemo(
    () => ({
      ...data,
      loading,
      error,
      refresh,
      addOrganization: (input) =>
        mutate("/admin/organizations", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      updateOrganization: (id, input) =>
        mutate(`/admin/organizations/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      addOrganizationUser: (input) =>
        mutate("/admin/users", { method: "POST", body: JSON.stringify(input) }),
      addEvent: (input) =>
        mutate("/organization/events", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      deleteEvent: (id) =>
        mutate(`/organization/events/${id}`, { method: "DELETE" }),
      inviteStaff: (input) =>
        mutate("/organization/team", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      retryEmail: (id) =>
        mutate(`/organization/emails/${id}/retry`, { method: "POST" }),
      adminRetryEmail: (id) =>
        mutate(`/admin/emails/${id}/retry`, { method: "POST" }),
      importParticipants: (eventId, file) => {
        const body = new FormData();
        body.append("event_id", eventId);
        body.append("file", file);
        return mutate("/organization/participants/import", {
          method: "POST",
          body,
        });
      },
      uploadPhotos: (eventId, files) => {
        const body = new FormData();
        body.append("event_id", eventId);
        files.forEach((file) => body.append("files", file));
        return mutate("/organization/photos", { method: "POST", body });
      },
      reviewMatch: (id, decision) =>
        mutate(`/organization/matches/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ decision }),
        }),
      sendDelivery: (participantId) =>
        mutate(`/organization/deliveries/${participantId}/send`, {
          method: "POST",
        }),
      updateSettings: (input) =>
        mutate("/organization/settings", {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
    }),
    [data, error, loading, mutate, refresh],
  );
  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context)
    throw new Error("usePlatform must be used inside PlatformProvider");
  return context;
}
