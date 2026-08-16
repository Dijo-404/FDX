/* oxlint-disable react/only-export-components -- Provider and hook form one public context API. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, directUpload, directUploadPart } from "../lib/api";
import { useAuth } from "./AuthContext";

const PlatformContext = createContext(null);
const uuid = () => crypto.randomUUID();

async function checksum(file) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function imageContentType(file) {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file.type;
  }
  const extension = file.name.toLowerCase().split(".").pop();
  return {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  }[extension];
}

async function runBounded(tasks, concurrency = 6) {
  let next = 0;
  let failure = null;
  async function worker() {
    while (!failure && next < tasks.length) {
      const index = next;
      next += 1;
      try {
        await tasks[index]();
      } catch (error) {
        failure ||= error;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
  );
  if (failure) throw failure;
}

async function uploadTarget(target, file) {
  if (!target.multipart) {
    await directUpload(target.upload_url, file, target.headers);
    return;
  }
  const completed = [];
  await runBounded(
    target.parts.map((part) => async () => {
      const start = (part.part_number - 1) * target.part_size;
      const bytes = file.slice(
        start,
        Math.min(file.size, start + target.part_size),
      );
      const etag = await directUploadPart(part.upload_url, bytes);
      completed.push({ part_number: part.part_number, etag });
    }),
  );
  await api(target.complete_url, {
    method: "POST",
    body: JSON.stringify({
      upload_id: target.multipart_upload_id,
      parts: completed,
    }),
  });
}
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
      } else if (user.role === "collaborator") {
        const [organizations, events] = await Promise.all([
          api("/collaborator/organizations"),
          api("/collaborator/events"),
        ]);
        setData({
          ...initialState,
          organizations: organizations.items,
          events: events.items,
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
        mutate(
          user?.role === "collaborator"
            ? "/collaborator/organizations"
            : "/admin/organizations",
          {
            method: "POST",
            body: JSON.stringify(input),
          },
        ),
      addCollaboratorEvent: (input) =>
        mutate("/collaborator/events", {
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
      validateParticipantImport: async (eventId, file) => {
        const body = new FormData();
        body.append("file", file);
        const response = await api(
          `/v2/events/${eventId}/participant-imports`,
          {
            method: "POST",
            body,
          },
        );
        return response.data;
      },
      confirmParticipantImport: async (eventId, importId) => {
        const response = await api(
          `/v2/events/${eventId}/participant-imports/${importId}/confirm`,
          {
            method: "POST",
            headers: { "Idempotency-Key": uuid() },
          },
        );
        await refresh();
        return response.data;
      },
      uploadPhotos: async (eventId, files, onProgress = () => {}) => {
        if (files.some((file) => file.name.toLowerCase().endsWith(".zip"))) {
          onProgress({
            phase: "uploading",
            completed: 0,
            total: files.length,
            percent: 10,
            message: "Uploading archive…",
          });
          const body = new FormData();
          body.append("event_id", eventId);
          files.forEach((file) => body.append("files", file));
          const result = await mutate("/organization/photos", {
            method: "POST",
            body,
          });
          onProgress({
            phase: "complete",
            completed: files.length,
            total: files.length,
            percent: 100,
            message: "Upload complete",
          });
          return result;
        }
        let prepared = 0;
        onProgress({
          phase: "preparing",
          completed: 0,
          total: files.length,
          percent: 0,
          message: `Preparing ${files.length} ${files.length === 1 ? "photo" : "photos"}…`,
        });
        const manifest = await Promise.all(
          files.map(async (file) => {
            const contentType = imageContentType(file);
            if (!contentType) {
              throw new Error(`${file.name} is not a supported image file`);
            }
            const item = {
              filename: file.webkitRelativePath || file.name,
              content_type: contentType,
              size_bytes: file.size,
              sha256: await checksum(file),
            };
            prepared += 1;
            onProgress({
              phase: "preparing",
              completed: prepared,
              total: files.length,
              percent: Math.round((prepared / files.length) * 20),
              message: `Preparing photos (${prepared}/${files.length})…`,
            });
            return item;
          }),
        );
        onProgress({
          phase: "reserving",
          completed: 0,
          total: files.length,
          percent: 22,
          message: "Reserving storage…",
        });
        const reservation = await api(`/v2/events/${eventId}/upload-batches`, {
          method: "POST",
          body: JSON.stringify({
            expected_files: files.length,
            reserved_bytes: files.reduce((sum, file) => sum + file.size, 0),
          }),
        });
        const batchId = reservation.data.id;
        try {
          let uploaded = 0;
          for (let offset = 0; offset < files.length; offset += 500) {
            const chunkFiles = files.slice(offset, offset + 500);
            const presigned = await api(
              `/v2/events/${eventId}/upload-batches/${batchId}/presign`,
              {
                method: "POST",
                body: JSON.stringify({
                  files: manifest.slice(offset, offset + 500),
                }),
              },
            );
            onProgress({
              phase: "uploading",
              completed: uploaded,
              total: files.length,
              percent: 25 + Math.round((uploaded / files.length) * 65),
              message: `Uploading photos (${uploaded}/${files.length})…`,
            });
            await runBounded(
              presigned.data.files.map((target, index) => async () => {
                await uploadTarget(target, chunkFiles[index]);
                uploaded += 1;
                onProgress({
                  phase: "uploading",
                  completed: uploaded,
                  total: files.length,
                  percent: 25 + Math.round((uploaded / files.length) * 65),
                  message: `Uploading photos (${uploaded}/${files.length})…`,
                });
              }),
            );
          }
          onProgress({
            phase: "finalizing",
            completed: files.length,
            total: files.length,
            percent: 94,
            message: "Verifying uploads and creating processing jobs…",
          });
          const completed = await api(
            `/v2/events/${eventId}/upload-batches/${batchId}/complete`,
            {
              method: "POST",
              headers: { "Idempotency-Key": uuid() },
            },
          );
          await refresh();
          onProgress({
            phase: "complete",
            completed: files.length,
            total: files.length,
            percent: 100,
            message: "Upload complete",
          });
          return {
            uploaded: completed.data.jobs,
            jobsPublished: completed.data.jobs.length,
            skipped: [],
          };
        } catch (uploadError) {
          // Release the reservation and remove partial objects when a batch
          // fails. The original error is the useful message for the user.
          try {
            await api(
              `/v2/events/${eventId}/upload-batches/${batchId}/cancel`,
              { method: "POST" },
            );
          } catch {
            // Server-side expiry remains a fallback if cleanup is unavailable.
          }
          throw uploadError;
        }
      },
      uploadPhotosLegacy: (eventId, files) => {
        const body = new FormData();
        body.append("event_id", eventId);
        files.forEach((file) => body.append("files", file));
        return mutate("/organization/photos", { method: "POST", body });
      },
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
    [data, error, loading, mutate, refresh, user?.role],
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
