const SESSION_KEY = "fdx.session";

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function storeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("fdx:session-cleared"));
}

export async function api(path, options = {}) {
  const session = getStoredSession();
  const headers = new Headers(options.headers || {});
  if (session?.token) headers.set("Authorization", `Bearer ${session.token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 401) clearSession();
  const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    const detail = Array.isArray(payload?.detail) ? payload.detail.map((item) => item.msg).join(" · ") : payload?.detail;
    throw new Error(detail || payload?.message || `Request failed (${response.status})`);
  }
  return payload;
}

export function loginRequest(email, password) {
  return api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}
