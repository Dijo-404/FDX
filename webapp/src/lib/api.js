const USER_KEY = "fdx.user";
let accessToken = null;
let refreshPromise = null;

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    organizationId: user.organizationId ?? user.organization_id ?? null,
    organizationName: user.organizationName ?? user.organization_name ?? null,
  };
}

function rememberUser(user) {
  if (user)
    sessionStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)));
  else sessionStorage.removeItem(USER_KEY);
}

function cachedUser() {
  try {
    return normalizeUser(JSON.parse(sessionStorage.getItem(USER_KEY)));
  } catch {
    return null;
  }
}

function normalizeV2Session(payload) {
  const data = payload?.data ?? payload;
  return {
    token: data?.access_token ?? data?.token ?? null,
    expiresIn: data?.expires_in,
    user: normalizeUser(data?.user),
  };
}

export function getStoredSession() {
  const user = cachedUser();
  return user && accessToken ? { token: accessToken, user } : null;
}

export function storeSession(rawSession) {
  const session = normalizeV2Session(rawSession);
  accessToken = session.token;
  rememberUser(session.user);
  return session;
}

export function clearSession() {
  accessToken = null;
  rememberUser(null);
  window.dispatchEvent(new Event("fdx:session-cleared"));
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/v2/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session expired");
        const session = storeSession(await response.json());
        window.dispatchEvent(
          new CustomEvent("fdx:session-refreshed", { detail: session }),
        );
        return session;
      })
      .catch((error) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function initializeSession() {
  try {
    return await refreshSession();
  } catch {
    return null;
  }
}

async function request(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });
  if (response.status === 401 && retry && !path.endsWith("/auth/refresh")) {
    await refreshSession();
    return request(path, options, false);
  }
  const payload = await parseResponsePayload(response);
  if (!response.ok) {
    const validation = payload?.error?.details?.errors ?? payload?.detail;
    const detail = Array.isArray(validation)
      ? validation.map((item) => item.msg).join(" · ")
      : (payload?.error?.message ?? validation);
    throw new Error(
      detail || payload?.message || `Request failed (${response.status})`,
    );
  }
  return payload;
}

export async function parseResponsePayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid JSON (${response.status})`);
  }
}

export function api(path, options = {}) {
  return request(`/api${path}`, options);
}

export async function directUpload(url, file, headers = {}) {
  if (url.startsWith("/")) {
    return request(url, { method: "PUT", headers, body: file }, false);
  }

  // Presigned object-storage URLs authenticate through their signature. Sending
  // application cookies or the API bearer token would unnecessarily widen the
  // browser CORS contract and can cause S3 to reject an otherwise valid PUT.
  const response = await fetch(url, { method: "PUT", headers, body: file });
  if (!response.ok)
    throw new Error(`Direct upload failed (${response.status})`);
  return null;
}

export async function directUploadPart(url, bytes) {
  const response = await fetch(url, { method: "PUT", body: bytes });
  if (!response.ok)
    throw new Error(`Multipart upload failed (${response.status})`);
  const etag = response.headers.get("etag");
  if (!etag)
    throw new Error("Object storage did not expose the multipart ETag header");
  return etag;
}

export async function loginRequest(email, password) {
  const payload = await request(
    "/api/v2/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );
  return storeSession(payload);
}

export async function logoutRequest() {
  try {
    await request("/api/v2/auth/logout", { method: "POST" }, false);
  } catch {
    // Local session state must still be cleared if the network is unavailable.
  } finally {
    clearSession();
  }
}
