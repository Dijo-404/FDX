import { readFileSync } from "node:fs";

const base = process.env.FDX_BASE_URL || "http://127.0.0.1:8080/api";
const superAdminEmail =
  process.env.FDX_SUPER_ADMIN_EMAIL || "superadmin@fdx.io";
const superAdminPassword =
  process.env.FDX_SUPER_ADMIN_PASSWORD || "SuperAdmin@123";

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const body = response.status === 204 ? "" : await response.text();
  let payload = null;
  try {
    payload = body ? JSON.parse(body) : null;
  } catch {
    payload = body;
  }
  if (!response.ok)
    throw new Error(`${response.status} ${path}: ${JSON.stringify(payload)}`);
  return payload;
}

const login = await request("/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: superAdminEmail,
    password: superAdminPassword,
  }),
});
const adminHeaders = {
  "content-type": "application/json",
  authorization: `Bearer ${login.token}`,
};
const suffix = Date.now().toString();
const future = new Date();
future.setFullYear(future.getFullYear() + 1);
const organization = await request("/admin/organizations", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    name: `FDX verification ${suffix}`,
    type: "COMPANY",
    contactName: "Verification Owner",
    contactEmail: `owner-${suffix}@example.com`,
    storageLimitGB: 10,
    retentionDays: 30,
    expiry: future.toISOString().slice(0, 10),
  }),
});
const invitation = await request("/admin/users", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    name: "Verification Admin",
    email: `admin-${suffix}@example.com`,
    organizationId: organization.id,
  }),
});
if (!invitation.developmentInviteUrl)
  throw new Error("Development invitation URL was not returned");
const accepted = await request(
  `/auth/invitations/${invitation.developmentInviteUrl.split("/").pop()}`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "VerificationPass@123" }),
  },
);
const orgHeaders = {
  "content-type": "application/json",
  authorization: `Bearer ${accepted.token}`,
};

const staffInvitation = await request("/organization/team", {
  method: "POST",
  headers: orgHeaders,
  body: JSON.stringify({
    name: "Verification Staff",
    email: `staff-${suffix}@example.com`,
  }),
});
if (!staffInvitation.developmentInviteUrl)
  throw new Error("Development staff invitation URL was not returned");
const staffSession = await request(
  `/auth/invitations/${staffInvitation.developmentInviteUrl.split("/").pop()}`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "VerificationPass@123" }),
  },
);
const staffHeaders = { authorization: `Bearer ${staffSession.token}` };

const eventDate = new Date().toISOString().slice(0, 10);
const event = await request("/organization/events", {
  method: "POST",
  headers: orgHeaders,
  body: JSON.stringify({
    name: `Verification event ${suffix}`,
    description: "Automated API verification",
    date: eventDate,
    location: "Automated test",
    retentionDays: 30,
  }),
});
const staffCreateEvent = await fetch(`${base}/organization/events`, {
  method: "POST",
  headers: { ...staffHeaders, "content-type": "application/json" },
  body: JSON.stringify({ name: "Forbidden staff event", date: eventDate }),
});

const form = new FormData();
form.append("event_id", event.id);
form.append(
  "file",
  new Blob(
    [
      `Name,Email\nValid Participant,participant-${suffix}@example.com\nInvalid Participant,not-an-email\n`,
    ],
    { type: "text/csv" },
  ),
  "participants.csv",
);
const imported = await request("/organization/participants/import", {
  method: "POST",
  headers: staffHeaders,
  body: form,
});

let legacyImported = null;
if (process.env.FDX_VERIFY_XLS) {
  const legacyForm = new FormData();
  legacyForm.append("event_id", event.id);
  legacyForm.append(
    "file",
    new Blob([readFileSync(process.env.FDX_VERIFY_XLS)], {
      type: "application/vnd.ms-excel",
    }),
    "participants.xls",
  );
  legacyImported = await request("/organization/participants/import", {
    method: "POST",
    headers: staffHeaders,
    body: legacyForm,
  });
}

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAIAAAAC64paAAAAHUlEQVR4nGMUqTjBQC5gIlvnqOZRzaOaRzVTRTMAtWIBfJeXqQAAAAAASUVORK5CYII=",
  "base64",
);
const faceImage = process.env.FDX_VERIFY_FACE_IMAGE
  ? readFileSync(process.env.FDX_VERIFY_FACE_IMAGE)
  : null;
if (faceImage) {
  const enrollmentToken = imported.developmentEnrollmentUrls?.[0]
    ?.split("/")
    .pop();
  if (!enrollmentToken)
    throw new Error("Development enrollment URL was not returned");
  const enrollmentForm = new FormData();
  enrollmentForm.append("consent", "true");
  enrollmentForm.append(
    "selfie",
    new Blob([faceImage], { type: "image/jpeg" }),
    "verification-selfie.jpeg",
  );
  await request(`/public/enroll/${enrollmentToken}`, {
    method: "POST",
    body: enrollmentForm,
  });
}
const photoBytes = faceImage || onePixelPng;
const photoType = faceImage ? "image/jpeg" : "image/png";
const photoName = faceImage ? "verification.jpeg" : "verification.png";
const photoForm = new FormData();
photoForm.append("event_id", event.id);
photoForm.append(
  "files",
  new Blob([photoBytes], { type: photoType }),
  `folder/subfolder/${photoName}`,
);
photoForm.append(
  "files",
  new Blob([photoBytes], { type: photoType }),
  `folder/subfolder/duplicate-${photoName}`,
);
photoForm.append(
  "files",
  new Blob(["not an image"], { type: "image/png" }),
  "folder/subfolder/broken.png",
);
const uploaded = await request("/organization/photos", {
  method: "POST",
  headers: staffHeaders,
  body: photoForm,
});
if (uploaded.uploaded.length !== 1 || uploaded.skipped.length !== 2)
  throw new Error(
    `Photo validation or duplicate handling failed: ${JSON.stringify(uploaded)}`,
  );
const photoId = uploaded.uploaded[0].id;
const thumbnail = await fetch(`${base}/media/${photoId}/thumbnail`, {
  headers: staffHeaders,
});
const thumbnailBytes = await thumbnail.arrayBuffer();

let detail;
for (let attempt = 0; attempt < (faceImage ? 60 : 1); attempt += 1) {
  detail = await request(`/organization/events/${event.id}`, {
    headers: staffHeaders,
  });
  if (!faceImage || detail.status === "ready") break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (faceImage && detail.status !== "ready")
  throw new Error(`Face-processing job did not finish: ${detail.status}`);

let galleryThumbnailBytes = null;
if (faceImage) {
  const participant = detail.participantsList.find(
    (item) => item.email === `participant-${suffix}@example.com`,
  );
  const delivery = await request(
    `/organization/deliveries/${participant.id}/send`,
    { method: "POST", headers: orgHeaders },
  );
  const galleryToken = delivery.developmentGalleryUrl?.split("/").pop();
  if (!galleryToken)
    throw new Error("Development gallery URL was not returned");
  const gallery = await request(`/public/gallery/${galleryToken}`);
  if (gallery.photos.length !== 1)
    throw new Error(`Private gallery mismatch: ${JSON.stringify(gallery)}`);
  const publicThumbnail = await fetch(
    `http://127.0.0.1:8080${gallery.photos[0].thumbnailUrl}`,
  );
  galleryThumbnailBytes = (await publicThumbnail.arrayBuffer()).byteLength;
  if (!publicThumbnail.ok || galleryThumbnailBytes === 0)
    throw new Error("Private gallery thumbnail could not be fetched");
}
const emails = await request("/organization/emails", { headers: orgHeaders });
const retryCandidate = emails.items.find((item) => item.status === "sent");
if (retryCandidate)
  await request(`/organization/emails/${retryCandidate.id}/retry`, {
    method: "POST",
    headers: orgHeaders,
  });

const dashboard = await request("/organization/dashboard", {
  headers: staffHeaders,
});
const forbiddenAdmin = await fetch(`${base}/admin/organizations`, {
  headers: staffHeaders,
});
const forbiddenDelete = await fetch(`${base}/organization/events/${event.id}`, {
  method: "DELETE",
  headers: staffHeaders,
});

if (imported.imported !== 1 || imported.invalid !== 1)
  throw new Error(`Participant validation failed: ${JSON.stringify(imported)}`);
if (legacyImported && legacyImported.imported !== 1)
  throw new Error(
    `Legacy XLS import failed: ${JSON.stringify(legacyImported)}`,
  );
if (
  dashboard.stats.events !== 1 ||
  dashboard.stats.participants !== 1 + (legacyImported?.imported || 0)
)
  throw new Error(
    `Persistence check failed: ${JSON.stringify(dashboard.stats)}`,
  );
if (
  staffCreateEvent.status !== 403 ||
  forbiddenAdmin.status !== 403 ||
  forbiddenDelete.status !== 403
)
  throw new Error("Staff permission boundary failed");
if (
  !thumbnail.ok ||
  thumbnail.headers.get("content-type") !== "image/jpeg" ||
  thumbnailBytes.byteLength === 0
)
  throw new Error("Generated thumbnail could not be fetched securely");
if (
  detail.id !== event.id ||
  detail.photosList.length !== 1 ||
  detail.participantsList.length !== 1 + (legacyImported?.imported || 0)
)
  throw new Error("Event detail aggregation failed");
if (emails.items.length < 3)
  throw new Error(
    "Email outbox did not expose invitation and enrollment delivery state",
  );

await request(`/organization/events/${event.id}`, {
  method: "DELETE",
  headers: orgHeaders,
});
const deleted = await fetch(`${base}/organization/events/${event.id}`, {
  headers: orgHeaders,
});
if (deleted.status !== 404)
  throw new Error(
    `Event deletion verification failed with HTTP ${deleted.status}`,
  );
const storageAfterDelete = await request("/organization/settings", {
  headers: orgHeaders,
});
if (storageAfterDelete.storageUsedBytes !== 0)
  throw new Error(
    `Event deletion did not release storage: ${storageAfterDelete.storageUsedBytes} bytes remain`,
  );

console.log(
  JSON.stringify(
    {
      status: "passed",
      organization: organization.name,
      event: event.name,
      imported: imported.imported,
      legacyXlsImported: legacyImported?.imported ?? "not requested",
      thumbnailBytes: thumbnailBytes.byteLength,
      galleryThumbnailBytes: galleryThumbnailBytes ?? "not requested",
      emailRecords: emails.items.length,
      eventDetail: true,
      eventDeleted: true,
      storageReleased: true,
      staffReadAndUpload: true,
      staffRestrictedStatuses: [
        staffCreateEvent.status,
        forbiddenAdmin.status,
        forbiddenDelete.status,
      ],
    },
    null,
    2,
  ),
);
