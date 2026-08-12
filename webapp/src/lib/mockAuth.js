// Stand-in for the JWT session-auth service in the architecture diagram
// (Frontend -> Middleware [NGINX] -> Backend [FastAPI] -> Auth). There is no
// auth endpoint in the backend yet, so login is resolved against this table.
// Swap `login()` below for a real `POST /api/auth/login` call once it exists.

const DEMO_USERS = [
  {
    email: "superadmin@fdx.io",
    password: "SuperAdmin@123",
    role: "super_admin",
    name: "Aarav Mehta",
  },
  {
    email: "admin@srit.edu.in",
    password: "College@123",
    role: "org_admin",
    name: "Priya Nair",
    organizationId: "srit",
    organizationName: "SRIT Institute of Technology",
    organizationType: "COLLEGE",
  },
  {
    email: "admin@nova.io",
    password: "College@123",
    role: "org_admin",
    name: "Karthik Rao",
    organizationId: "nova",
    organizationName: "Nova Systems Pvt. Ltd.",
    organizationType: "COMPANY",
  },
];

const SESSION_KEY = "fdx.session";

function fakeJwt(email, role) {
  const payload = btoa(JSON.stringify({ email, role, iat: Date.now() }));
  return `demo.${payload}.token`;
}

export function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const match = DEMO_USERS.find((user) => user.email === normalizedEmail);

  if (!match || match.password !== password) {
    return Promise.reject(new Error("Invalid email or password."));
  }

  const { password: _password, ...user } = match;
  const session = { user, token: fakeJwt(user.email, user.role) };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return Promise.resolve(session);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
