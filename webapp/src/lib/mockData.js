// Demo data standing in for the FastAPI + PostgreSQL layer until those
// endpoints exist. Shapes are kept close to what the backend will likely
// return so wiring up real fetches later is a drop-in swap.

export const colleges = [
  {
    id: "srit",
    name: "SRIT Institute of Technology",
    status: "active",
    users: 42,
    storageUsedGB: 128,
    storageLimitGB: 200,
    dailyUsageGB: 6.4,
    expiry: "2026-12-31",
    contactEmail: "admin@srit.edu.in",
    events: 18,
  },
  {
    id: "nvce",
    name: "NVCE College of Engineering",
    status: "active",
    users: 27,
    storageUsedGB: 54,
    storageLimitGB: 100,
    dailyUsageGB: 2.1,
    expiry: "2026-09-15",
    contactEmail: "admin@nvce.edu.in",
    events: 9,
  },
  {
    id: "gpc",
    name: "Govt. Polytechnic College",
    status: "inactive",
    users: 11,
    storageUsedGB: 8,
    storageLimitGB: 50,
    dailyUsageGB: 0,
    expiry: "2026-03-01",
    contactEmail: "admin@gpc.edu.in",
    events: 2,
  },
  {
    id: "mvj",
    name: "MVJ Institute of Science",
    status: "active",
    users: 33,
    storageUsedGB: 91,
    storageLimitGB: 150,
    dailyUsageGB: 4.8,
    expiry: "2027-01-20",
    contactEmail: "admin@mvj.edu.in",
    events: 14,
  },
];

export const superAdminUserDetails = [
  { id: 1, name: "Priya Nair", email: "admin@srit.edu.in", college: "SRIT Institute of Technology", role: "College Admin", status: "active", lastActive: "2026-08-09 18:22" },
  { id: 2, name: "Karthik Rao", email: "admin@nvce.edu.in", college: "NVCE College of Engineering", role: "College Admin", status: "active", lastActive: "2026-08-10 09:05" },
  { id: 3, name: "Sunita Desai", email: "admin@gpc.edu.in", college: "Govt. Polytechnic College", role: "College Admin", status: "inactive", lastActive: "2026-06-11 14:40" },
  { id: 4, name: "Rohit Sharma", email: "admin@mvj.edu.in", college: "MVJ Institute of Science", role: "College Admin", status: "active", lastActive: "2026-08-08 20:15" },
  { id: 5, name: "Aarav Mehta", email: "superadmin@fdx.io", college: "-", role: "Super Admin", status: "active", lastActive: "2026-08-10 10:00" },
];

export const superAdminLogs = [
  { id: 1, timestamp: "2026-08-10 09:58", actor: "superadmin@fdx.io", action: "Updated expiry", details: "NVCE College of Engineering -> 2026-09-15", level: "info" },
  { id: 2, timestamp: "2026-08-09 21:14", actor: "admin@srit.edu.in", action: "Uploaded folder", details: "Annual Day 2026 (312 photos)", level: "info" },
  { id: 3, timestamp: "2026-08-09 18:20", actor: "system", action: "Storage threshold", details: "SRIT Institute of Technology reached 64% of quota", level: "warning" },
  { id: 4, timestamp: "2026-08-08 12:03", actor: "superadmin@fdx.io", action: "Deactivated college", details: "Govt. Polytechnic College", level: "danger" },
  { id: 5, timestamp: "2026-08-08 08:41", actor: "admin@mvj.edu.in", action: "Excel upload", details: "214 student records added", level: "info" },
  { id: 6, timestamp: "2026-08-07 16:55", actor: "system", action: "Backup", details: "Nightly snapshot completed", level: "info" },
];

export const events = [
  { id: 1, name: "Annual Day 2026", date: "2026-07-28", photos: 312, facesDetected: 891, matched: 640, status: "processed" },
  { id: 2, name: "Tech Fest - Innovate", date: "2026-08-02", photos: 187, facesDetected: 512, matched: 401, status: "processed" },
  { id: 3, name: "Sports Meet", date: "2026-08-09", photos: 96, facesDetected: 0, matched: 0, status: "processing" },
  { id: 4, name: "Convocation", date: "2026-06-14", photos: 420, facesDetected: 1180, matched: 990, status: "processed" },
];

export const students = [
  { id: 1, name: "Ananya Iyer", email: "ananya.iyer@srit.edu.in", uploadedAt: "2026-08-01", status: "matched" },
  { id: 2, name: "Vikram Singh", email: "vikram.singh@srit.edu.in", uploadedAt: "2026-08-01", status: "matched" },
  { id: 3, name: "Meera Pillai", email: "meera.pillai@srit.edu.in", uploadedAt: "2026-08-02", status: "pending" },
  { id: 4, name: "Devansh Gupta", email: "devansh.gupta@srit.edu.in", uploadedAt: "2026-08-02", status: "matched" },
  { id: 5, name: "Ishaan Kapoor", email: "ishaan.kapoor@srit.edu.in", uploadedAt: "2026-08-05", status: "no-face" },
];

export const faceDetectionData = [
  { id: 1, event: "Annual Day 2026", student: "Ananya Iyer", confidence: 0.94, photo: "IMG_0231.jpg", matchedAt: "2026-08-01 10:12" },
  { id: 2, event: "Annual Day 2026", student: "Vikram Singh", confidence: 0.89, photo: "IMG_0244.jpg", matchedAt: "2026-08-01 10:14" },
  { id: 3, event: "Tech Fest - Innovate", student: "Devansh Gupta", confidence: 0.91, photo: "IMG_0512.jpg", matchedAt: "2026-08-02 15:40" },
  { id: 4, event: "Convocation", student: "Meera Pillai", confidence: 0.76, photo: "IMG_0888.jpg", matchedAt: "2026-06-14 12:05" },
];

export const collegeLogs = [
  { id: 1, timestamp: "2026-08-09 21:14", actor: "admin@srit.edu.in", action: "Uploaded folder", details: "Annual Day 2026 (312 photos)", level: "info" },
  { id: 2, timestamp: "2026-08-05 11:02", actor: "admin@srit.edu.in", action: "Excel upload", details: "58 student records added", level: "info" },
  { id: 3, timestamp: "2026-08-02 15:40", actor: "system", action: "Face match", details: "Tech Fest - Innovate finished processing", level: "info" },
  { id: 4, timestamp: "2026-07-28 09:30", actor: "admin@srit.edu.in", action: "Event created", details: "Annual Day 2026", level: "info" },
];

export function collegeStorage(collegeId) {
  const college = colleges.find((c) => c.id === collegeId) || colleges[0];
  return {
    usedGB: college.storageUsedGB,
    limitGB: college.storageLimitGB,
    dailyUsageGB: college.dailyUsageGB,
  };
}
