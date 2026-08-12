const base = process.env.FDX_BASE_URL || "http://127.0.0.1:8080/api";
const superAdminEmail = process.env.FDX_SUPER_ADMIN_EMAIL || "superadmin@fdx.io";
const superAdminPassword = process.env.FDX_SUPER_ADMIN_PASSWORD || "SuperAdmin@123";

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(payload)}`);
  return payload;
}

const login = await request("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: superAdminEmail, password: superAdminPassword }) });
const adminHeaders = { "content-type": "application/json", authorization: `Bearer ${login.token}` };
const suffix = Date.now().toString();
const future = new Date(); future.setFullYear(future.getFullYear() + 1);
const organization = await request("/admin/organizations", { method: "POST", headers: adminHeaders, body: JSON.stringify({ name: `FDX verification ${suffix}`, type: "COMPANY", contactName: "Verification Owner", contactEmail: `owner-${suffix}@example.com`, storageLimitGB: 10, retentionDays: 30, expiry: future.toISOString().slice(0, 10) }) });
const invitation = await request("/admin/users", { method: "POST", headers: adminHeaders, body: JSON.stringify({ name: "Verification Admin", email: `admin-${suffix}@example.com`, organizationId: organization.id }) });
if (!invitation.developmentInviteUrl) throw new Error("Development invitation URL was not returned");
const accepted = await request(`/auth/invitations/${invitation.developmentInviteUrl.split("/").pop()}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "VerificationPass@123" }) });
const orgHeaders = { "content-type": "application/json", authorization: `Bearer ${accepted.token}` };
const eventDate = new Date().toISOString().slice(0, 10);
const event = await request("/organization/events", { method: "POST", headers: orgHeaders, body: JSON.stringify({ name: `Verification event ${suffix}`, description: "Automated API verification", date: eventDate, location: "Automated test", retentionDays: 30 }) });
const form = new FormData();
form.append("event_id", event.id);
form.append("file", new Blob([`Name,Email\nValid Participant,participant-${suffix}@example.com\nInvalid Participant,not-an-email\n`], { type: "text/csv" }), "participants.csv");
const imported = await request("/organization/participants/import", { method: "POST", headers: { authorization: `Bearer ${accepted.token}` }, body: form });
const dashboard = await request("/organization/dashboard", { headers: { authorization: `Bearer ${accepted.token}` } });
const forbidden = await fetch(`${base}/admin/organizations`, { headers: { authorization: `Bearer ${accepted.token}` } });

if (imported.imported !== 1 || imported.invalid !== 1) throw new Error(`Participant validation failed: ${JSON.stringify(imported)}`);
if (dashboard.stats.events !== 1 || dashboard.stats.participants !== 1) throw new Error(`Persistence check failed: ${JSON.stringify(dashboard.stats)}`);
if (forbidden.status !== 403) throw new Error(`Tenant role boundary failed with HTTP ${forbidden.status}`);
console.log(JSON.stringify({ status: "passed", organization: organization.name, event: event.name, imported: imported.imported, invalid: imported.invalid, tenantBoundaryStatus: forbidden.status }, null, 2));
