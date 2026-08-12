/* oxlint-disable react/only-export-components -- Provider and hook form one public context API. */
import { createContext, useContext, useMemo, useState } from "react";
import { initialEvents, initialOrganizationUsers, initialOrganizations, initialParticipants } from "../lib/mockData";

const PlatformContext = createContext(null);

export function PlatformProvider({ children }) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [organizationUsers, setOrganizationUsers] = useState(initialOrganizationUsers);
  const [events, setEvents] = useState(initialEvents);
  const [participants, setParticipants] = useState(initialParticipants);

  const value = useMemo(() => ({
    organizations,
    organizationUsers,
    events,
    participants,
    addOrganization(input) {
      const id = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-4)}`;
      setOrganizations((items) => [{ ...input, id, status: "active", users: 0, storageUsedGB: 0, events: 0, nextDataExpiry: "—" }, ...items]);
      return id;
    },
    updateOrganization(id, patch) {
      setOrganizations((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    },
    addOrganizationUser(input) {
      const organization = organizations.find((item) => item.id === input.organizationId);
      setOrganizationUsers((items) => [{ ...input, id: Date.now(), organization: organization?.name ?? "Unknown", role: "org_admin", status: "active", invite: "pending", lastActive: "Invite pending" }, ...items]);
    },
    addEvent(input) {
      setEvents((items) => [{ ...input, id: Date.now(), photos: 0, facesDetected: 0, participants: 0, enrolled: 0, matched: 0, delivered: 0, status: "preparing" }, ...items]);
    },
    addParticipants(rows) {
      setParticipants((items) => [...rows.map((row, index) => ({ ...row, id: Date.now() + index, enrollment: "invited", delivery: "pending", matches: 0, uploadedAt: "Just now" })), ...items]);
    },
  }), [events, organizationUsers, organizations, participants]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used inside PlatformProvider");
  return context;
}
