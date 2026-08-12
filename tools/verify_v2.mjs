import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const origin = process.env.FDX_ORIGIN || "http://127.0.0.1:8080";
const base = `${origin}/api/v2`;
const facePath = process.env.FDX_VERIFY_FACE_IMAGE;
if (!facePath) throw new Error("FDX_VERIFY_FACE_IMAGE must point to a clear JPEG face image");
const face = readFileSync(facePath);

function cookie(response) {
  return response.headers.get("set-cookie")?.split(";", 1)[0] || "";
}

async function call(path, { token, cookie: sessionCookie, expected = 200, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (sessionCookie) headers.set("cookie", sessionCookie);
  if (options.body && typeof options.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const text = response.status === 204 ? "" : await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (response.status !== expected) {
    throw new Error(`${options.method || "GET"} ${path}: expected ${expected}, received ${response.status}: ${text}`);
  }
  return { response, payload, data: payload?.data };
}

const suffix = Date.now();
const login = await call("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: process.env.FDX_SUPER_ADMIN_EMAIL || "superadmin@fdx.io", password: process.env.FDX_SUPER_ADMIN_PASSWORD || "SuperAdmin@123" }),
});
const firstAccess = login.data.access_token;
const firstRefresh = cookie(login.response);
const rotated = await call("/auth/refresh", { method: "POST", cookie: firstRefresh });
const adminToken = rotated.data.access_token;
const adminRefresh = cookie(rotated.response);
await call("/auth/me", { token: firstAccess, expected: 401 });
await call("/auth/refresh", { method: "POST", cookie: firstRefresh, expected: 401 });

async function createOrganization(label) {
  const organization = await call("/admin/organizations", {
    method: "POST",
    token: adminToken,
    body: JSON.stringify({
      name: `FDX V2 ${label} ${suffix}`,
      organization_type: "COMPANY",
      primary_email: `${label.toLowerCase()}-${suffix}@example.com`,
      contact_name: `${label} Owner`,
      storage_limit_bytes: 10 * 1024 * 1024,
      default_retention_days: 30,
    }),
    expected: 201,
  });
  const invitation = await call(`/admin/organizations/${organization.data.id}/users`, {
    method: "POST",
    token: adminToken,
    body: JSON.stringify({ name: `${label} Admin`, email: `${label.toLowerCase()}-admin-${suffix}@example.com` }),
    expected: 201,
  });
  const invitationToken = invitation.data.development_invitation_url.split("/").pop();
  const accepted = await call(`/auth/invitations/${invitationToken}/accept`, {
    method: "POST",
    body: JSON.stringify({ password: "VerificationPass@123" }),
  });
  await call(`/auth/invitations/${invitationToken}/accept`, {
    method: "POST",
    body: JSON.stringify({ password: "VerificationPass@123" }),
    expected: 404,
  });
  return { organization: organization.data, token: accepted.data.access_token, refresh: cookie(accepted.response) };
}

const tenantA = await createOrganization("Alpha");
const tenantB = await createOrganization("Beta");
const startsAt = new Date(Date.now() + 86_400_000).toISOString();
const event = await call("/events", {
  method: "POST",
  token: tenantA.token,
  body: JSON.stringify({ name: `V2 verification ${suffix}`, description: "Automated V2 acceptance flow", starts_at: startsAt, retention_days: 30 }),
  expected: 201,
});
const eventId = event.data.id;
for (const probe of [
  ["GET", `/events/${eventId}`],
  ["PATCH", `/events/${eventId}`],
  ["POST", `/events/${eventId}/upload-batches`],
]) {
  const body = probe[0] === "PATCH" ? JSON.stringify({ name: "Cross-tenant mutation" }) : probe[0] === "POST" ? JSON.stringify({ expected_files: 1, reserved_bytes: face.length }) : undefined;
  await call(probe[1], { method: probe[0], token: tenantB.token, body, expected: 404 });
}

await call(`/events/${eventId}/open-enrollment`, { method: "POST", token: tenantA.token });
const participantFile = new FormData();
participantFile.append("file", new Blob([`Name,Email\nV2 Participant,participant-${suffix}@example.com\nBroken,invalid-email\n`], { type: "text/csv" }), "participants.csv");
const preview = await call(`/events/${eventId}/participant-imports`, { method: "POST", token: tenantA.token, body: participantFile, expected: 201 });
if (preview.data.valid_rows !== 1 || preview.data.invalid_rows !== 1) throw new Error("Participant preview validation did not classify rows correctly");
const importKey = randomUUID();
const confirmed = await call(`/events/${eventId}/participant-imports/${preview.data.id}/confirm`, { method: "POST", token: tenantA.token, headers: { "idempotency-key": importKey }, expected: 201 });
const repeatedConfirm = await call(`/events/${eventId}/participant-imports/${preview.data.id}/confirm`, { method: "POST", token: tenantA.token, headers: { "idempotency-key": importKey }, expected: 201 });
if (confirmed.data.participants_created !== 1 || repeatedConfirm.data.participants_created !== 1) throw new Error("Import confirmation idempotency failed");
const enrollmentToken = confirmed.data.development_invitations[0].url.split("/").pop();
await call(`/public/enrollment/${enrollmentToken}`);
const consent = new FormData();
consent.append("accepted", "true");
await call(`/public/enrollment/${enrollmentToken}/consent`, { method: "POST", body: consent, expected: 201 });
const selfie = new FormData();
selfie.append("selfie", new Blob([face], { type: "image/jpeg" }), "face.jpg");
const enrollment = await call(`/public/enrollment/${enrollmentToken}/complete`, { method: "POST", body: selfie });
if (enrollment.data.embedding_dimension !== 512) throw new Error("Enrollment embedding was not 512-dimensional");
await call(`/public/enrollment/${enrollmentToken}`, { expected: 404 });

await call(`/events/${eventId}/close-enrollment`, { method: "POST", token: tenantA.token });
const batch = await call(`/events/${eventId}/upload-batches`, {
  method: "POST",
  token: tenantA.token,
  body: JSON.stringify({ expected_files: 1, reserved_bytes: face.length }),
  expected: 201,
});
const digest = createHash("sha256").update(face).digest("hex");
const presigned = await call(`/events/${eventId}/upload-batches/${batch.data.id}/presign`, {
  method: "POST",
  token: tenantA.token,
  body: JSON.stringify({ files: [{ filename: "folder/face.jpg", content_type: "image/jpeg", size_bytes: face.length, sha256: digest }] }),
});
const upload = presigned.data.files[0];
const uploadResponse = await fetch(upload.upload_url.startsWith("http") ? upload.upload_url : `${origin}${upload.upload_url}`, {
  method: "PUT",
  headers: { ...upload.headers, authorization: `Bearer ${tenantA.token}` },
  body: face,
});
if (!uploadResponse.ok) throw new Error(`Direct upload failed: ${uploadResponse.status}`);
const completeKey = randomUUID();
const complete = await call(`/events/${eventId}/upload-batches/${batch.data.id}/complete`, { method: "POST", token: tenantA.token, headers: { "idempotency-key": completeKey }, expected: 202 });
const completeAgain = await call(`/events/${eventId}/upload-batches/${batch.data.id}/complete`, { method: "POST", token: tenantA.token, headers: { "idempotency-key": completeKey }, expected: 202 });
if (complete.data.jobs[0] !== completeAgain.data.jobs[0]) throw new Error("Upload completion idempotency failed");

let processing;
for (let attempt = 0; attempt < 60; attempt += 1) {
  processing = await call(`/events/${eventId}/processing`, { token: tenantA.token });
  if (processing.data.progress_percent === 100) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (processing.data.progress_percent !== 100) throw new Error(`ML processing did not finish: ${JSON.stringify(processing.data)}`);
const matches = await call(`/events/${eventId}/matches`, { token: tenantA.token });
if (!matches.data.some((item) => ["high", "approved"].includes(item.decision))) throw new Error("Identical enrollment/event image did not produce an accepted match");
const galleryBuild = await call(`/events/${eventId}/galleries/build`, { method: "POST", token: tenantA.token, headers: { "idempotency-key": randomUUID() }, expected: 202 });
if (galleryBuild.data.galleries_ready !== 1) throw new Error("Gallery was not built");
const delivery = await call(`/events/${eventId}/deliveries/send`, { method: "POST", token: tenantA.token, headers: { "idempotency-key": randomUUID() }, expected: 202 });
const galleryToken = delivery.data.development_gallery_urls[0].url.split("/").pop();
const gallery = await call(`/public/gallery/${galleryToken}`);
if (gallery.data.photos.length !== 1) throw new Error("Private gallery did not contain exactly the matched media");
const download = await call(`/public/gallery/${galleryToken}/download-url`, { method: "POST", body: JSON.stringify({ media_id: gallery.data.photos[0].id }) });
if (!download.data.url) throw new Error("Authorized gallery download URL was not issued");
const exportRequest = await call(`/public/gallery/${galleryToken}/exports`, { method: "POST", expected: 202 });
let exportStatus;
for (let attempt = 0; attempt < 30; attempt += 1) {
  exportStatus = await call(`/public/gallery/${galleryToken}/exports/${exportRequest.data.export_id}`);
  if (exportStatus.data.status === "READY") break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (exportStatus.data.status !== "READY") throw new Error(`Gallery ZIP export did not finish: ${JSON.stringify(exportStatus.data)}`);
const exportDownload = await fetch(exportStatus.data.download_url.startsWith("http") ? exportStatus.data.download_url : `${origin}${exportStatus.data.download_url}`);
const exportBytes = Buffer.from(await exportDownload.arrayBuffer());
if (!exportDownload.ok || exportBytes.subarray(0, 2).toString() !== "PK") throw new Error("Gallery ZIP download was invalid");

await call(`/events/${eventId}`, { method: "DELETE", token: tenantA.token, expected: 202 });
await call("/auth/logout", { method: "POST", token: tenantA.token, cookie: tenantA.refresh, expected: 204 });
await call("/auth/me", { token: tenantA.token, expected: 401 });
await call(`/admin/organizations/${tenantA.organization.id}/schedule-deletion`, { method: "POST", token: adminToken, expected: 202 });
await call(`/admin/organizations/${tenantB.organization.id}/schedule-deletion`, { method: "POST", token: adminToken, expected: 202 });
await call("/auth/logout", { method: "POST", token: adminToken, cookie: adminRefresh, expected: 204 });

console.log(JSON.stringify({
  status: "passed",
  refresh_rotation: true,
  single_use_invitation: true,
  tenant_isolation_statuses: [404, 404, 404],
  import_preview: { valid: preview.data.valid_rows, invalid: preview.data.invalid_rows },
  idempotency: true,
  embedding_dimension: enrollment.data.embedding_dimension,
  processing: processing.data,
  gallery_photos: gallery.data.photos.length,
  gallery_export_bytes: exportBytes.length,
  deletion_scheduled: true,
  verification_tenants_scheduled_for_deletion: true,
  logout_revocation: true,
}, null, 2));
