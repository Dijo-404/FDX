// Frontend fixtures mirror the API resources described in docs/workflow.txt.
// The data context owns mutations until the FastAPI endpoints are available.

export const initialOrganizations = [
  { id: "srit", name: "SRIT Institute of Technology", type: "COLLEGE", status: "active", users: 42, storageUsedGB: 128, storageLimitGB: 200, retentionDays: 90, expiry: "2026-12-31", nextDataExpiry: "2026-08-24", contactName: "Priya Nair", contactEmail: "admin@srit.edu.in", phone: "+91 98765 43210", events: 18 },
  { id: "nova", name: "Nova Systems Pvt. Ltd.", type: "COMPANY", status: "active", users: 27, storageUsedGB: 54, storageLimitGB: 100, retentionDays: 60, expiry: "2027-03-15", nextDataExpiry: "2026-09-02", contactName: "Karthik Rao", contactEmail: "admin@nova.io", phone: "+91 98450 22881", events: 9 },
  { id: "gpc", name: "Government Polytechnic College", type: "COLLEGE", status: "suspended", users: 11, storageUsedGB: 8, storageLimitGB: 50, retentionDays: 30, expiry: "2026-09-01", nextDataExpiry: "2026-08-17", contactName: "Sunita Desai", contactEmail: "admin@gpc.edu.in", phone: "+91 97777 13131", events: 2 },
  { id: "mvj", name: "MVJ Institute of Science", type: "COLLEGE", status: "active", users: 33, storageUsedGB: 91, storageLimitGB: 150, retentionDays: 180, expiry: "2027-01-20", nextDataExpiry: "2026-10-11", contactName: "Rohit Sharma", contactEmail: "admin@mvj.edu.in", phone: "+91 96666 54545", events: 14 },
];

export const initialOrganizationUsers = [
  { id: 1, name: "Priya Nair", email: "admin@srit.edu.in", organizationId: "srit", organization: "SRIT Institute of Technology", role: "org_admin", status: "active", invite: "accepted", lastActive: "12 Aug, 09:42" },
  { id: 2, name: "Karthik Rao", email: "admin@nova.io", organizationId: "nova", organization: "Nova Systems Pvt. Ltd.", role: "org_admin", status: "active", invite: "accepted", lastActive: "12 Aug, 08:15" },
  { id: 3, name: "Sunita Desai", email: "admin@gpc.edu.in", organizationId: "gpc", organization: "Government Polytechnic College", role: "org_admin", status: "inactive", invite: "accepted", lastActive: "11 Jun, 14:40" },
  { id: 4, name: "Rohit Sharma", email: "admin@mvj.edu.in", organizationId: "mvj", organization: "MVJ Institute of Science", role: "org_admin", status: "active", invite: "pending", lastActive: "Invite pending" },
];

export const superAdminLogs = [
  { id: 1, timestamp: "12 Aug 2026, 09:58", actor: "superadmin@fdx.io", action: "Retention updated", details: "Nova Systems · 60 day policy", level: "info" },
  { id: 2, timestamp: "12 Aug 2026, 09:14", actor: "admin@srit.edu.in", action: "Photo batch uploaded", details: "GDG DevFest 2026 · 342 files", level: "info" },
  { id: 3, timestamp: "12 Aug 2026, 08:20", actor: "system", action: "Storage threshold", details: "SRIT reached 64% of quota", level: "warning" },
  { id: 4, timestamp: "11 Aug 2026, 17:03", actor: "superadmin@fdx.io", action: "Organization suspended", details: "Government Polytechnic College", level: "danger" },
  { id: 5, timestamp: "11 Aug 2026, 08:41", actor: "admin@mvj.edu.in", action: "Participants imported", details: "214 valid records · 3 duplicates", level: "info" },
  { id: 6, timestamp: "11 Aug 2026, 03:00", actor: "system", action: "Retention cleanup", details: "1,284 expired photos removed", level: "info" },
];

export const initialEvents = [
  { id: 1, name: "GDG DevFest 2026", description: "Annual developer conference", date: "2026-08-12", location: "Chennai Trade Centre", retentionDays: 90, expiresAt: "2026-11-10", photos: 3482, facesDetected: 8920, participants: 672, enrolled: 601, matched: 574, delivered: 548, status: "ready" },
  { id: 2, name: "Tech Fest · Innovate", description: "Student technology showcase", date: "2026-08-02", location: "Main Auditorium", retentionDays: 90, expiresAt: "2026-10-31", photos: 187, facesDetected: 512, participants: 180, enrolled: 162, matched: 143, delivered: 139, status: "delivered" },
  { id: 3, name: "Sports Meet", description: "Inter-college athletics", date: "2026-08-09", location: "SRIT Sports Ground", retentionDays: 60, expiresAt: "2026-10-08", photos: 96, facesDetected: 218, participants: 224, enrolled: 188, matched: 26, delivered: 0, status: "processing" },
  { id: 4, name: "Convocation 2026", description: "Graduation ceremony", date: "2026-06-14", location: "Convention Hall", retentionDays: 180, expiresAt: "2026-12-11", photos: 420, facesDetected: 1180, participants: 310, enrolled: 298, matched: 290, delivered: 286, status: "delivered" },
];

export const initialParticipants = [
  { id: 1, eventId: 1, name: "Ananya Iyer", email: "ananya.iyer@example.com", enrollment: "verified", delivery: "delivered", matches: 12, uploadedAt: "12 Aug, 08:20" },
  { id: 2, eventId: 1, name: "Vikram Singh", email: "vikram.singh@example.com", enrollment: "verified", delivery: "delivered", matches: 8, uploadedAt: "12 Aug, 08:20" },
  { id: 3, eventId: 1, name: "Meera Pillai", email: "meera.pillai@example.com", enrollment: "invited", delivery: "pending", matches: 0, uploadedAt: "12 Aug, 08:20" },
  { id: 4, eventId: 1, name: "Devansh Gupta", email: "devansh.gupta@example.com", enrollment: "verified", delivery: "ready", matches: 15, uploadedAt: "12 Aug, 08:20" },
  { id: 5, eventId: 3, name: "Ishaan Kapoor", email: "ishaan.kapoor@example.com", enrollment: "expired", delivery: "pending", matches: 0, uploadedAt: "9 Aug, 10:05" },
  { id: 6, eventId: 2, name: "Sara Thomas", email: "sara.thomas@example.com", enrollment: "verified", delivery: "delivered", matches: 6, uploadedAt: "2 Aug, 09:10" },
];

export const faceMatches = [
  { id: 1, event: "GDG DevFest 2026", participant: "Ananya Iyer", confidence: 0.94, photo: "IMG_0231.jpg", state: "high", matchedAt: "12 Aug, 10:12" },
  { id: 2, event: "GDG DevFest 2026", participant: "Vikram Singh", confidence: 0.89, photo: "IMG_0244.jpg", state: "high", matchedAt: "12 Aug, 10:14" },
  { id: 3, event: "Tech Fest · Innovate", participant: "Sara Thomas", confidence: 0.78, photo: "IMG_0512.jpg", state: "review", matchedAt: "2 Aug, 15:40" },
  { id: 4, event: "Convocation 2026", participant: "Meera Pillai", confidence: 0.52, photo: "IMG_0888.jpg", state: "low", matchedAt: "14 Jun, 12:05" },
];

export const deliveryRows = [
  { id: 1, participant: "Ananya Iyer", event: "GDG DevFest 2026", photos: 12, status: "delivered", expires: "10 Nov 2026", sentAt: "12 Aug, 11:32" },
  { id: 2, participant: "Vikram Singh", event: "GDG DevFest 2026", photos: 8, status: "delivered", expires: "10 Nov 2026", sentAt: "12 Aug, 11:34" },
  { id: 3, participant: "Devansh Gupta", event: "GDG DevFest 2026", photos: 15, status: "ready", expires: "10 Nov 2026", sentAt: "—" },
  { id: 4, participant: "Sara Thomas", event: "Tech Fest · Innovate", photos: 6, status: "failed", expires: "31 Oct 2026", sentAt: "2 Aug, 16:10" },
];

export const organizationLogs = [
  { id: 1, timestamp: "12 Aug 2026, 11:34", actor: "system", action: "Gallery delivered", details: "GDG DevFest · Vikram Singh · 8 photos", level: "info" },
  { id: 2, timestamp: "12 Aug 2026, 10:12", actor: "ml-worker-03", action: "High-confidence match", details: "IMG_0231.jpg · 94% similarity", level: "info" },
  { id: 3, timestamp: "12 Aug 2026, 09:14", actor: "admin@srit.edu.in", action: "Photo batch uploaded", details: "GDG DevFest 2026 · 342 files", level: "info" },
  { id: 4, timestamp: "12 Aug 2026, 08:20", actor: "admin@srit.edu.in", action: "Participants imported", details: "672 valid · 4 duplicates skipped", level: "warning" },
];

export const systemServices = [
  { name: "API Gateway", detail: "NGINX · 42 ms", status: "healthy" },
  { name: "FastAPI", detail: "8 instances · 31% load", status: "healthy" },
  { name: "PostgreSQL", detail: "12 ms · 36 connections", status: "healthy" },
  { name: "Redis", detail: "1.8 GB · 97% hit rate", status: "healthy" },
  { name: "Kafka", detail: "26 jobs queued", status: "degraded" },
  { name: "ML Workers", detail: "6 / 6 online", status: "healthy" },
];

export const processingStages = [
  { label: "Uploaded", value: 3482, complete: 3482 },
  { label: "Face detection", value: 3482, complete: 3482 },
  { label: "Embeddings", value: 8920, complete: 8920 },
  { label: "Matching", value: 8920, complete: 8474 },
  { label: "Galleries", value: 574, complete: 548 },
];

export function organizationStorage(organizationId) {
  const organization = initialOrganizations.find((item) => item.id === organizationId) || initialOrganizations[0];
  return { usedGB: organization.storageUsedGB, limitGB: organization.storageLimitGB };
}
