/**
 * Thin fetch wrapper for the LMS API.
 *   • Base URL    → VITE_API_URL or `/api` (Vite proxies /api → the Express backend in dev).
 *   • Tenant      → every request carries `X-Tenant-Code` (the backend resolves branding/users by it).
 *   • Auth        → attaches `Authorization: Bearer <token>` unless `{ auth: false }`.
 *   • Errors      → non-2xx responses throw an Error carrying the server's `error` message + status.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'uc.token';
const TENANT_KEY = 'uc.tenant';
const DEFAULT_TENANT = import.meta.env.VITE_TENANT_CODE || 'calcite';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

export const getTenantCode = () => {
  try {
    return localStorage.getItem(TENANT_KEY) || DEFAULT_TENANT;
  } catch {
    return DEFAULT_TENANT;
  }
};
export const setTenantCode = (code) => {
  try {
    localStorage.setItem(TENANT_KEY, code);
  } catch {
    /* ignore */
  }
};

function buildHeaders({ auth = true, json = true } = {}) {
  const headers = { 'X-Tenant-Code': getTenantCode() };
  if (json) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function handle(res) {
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
  if (!res.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      (typeof payload === 'string' && payload) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  // The course (MongoDB) API wraps responses as { success, data }; unwrap so callers receive `data`.
  // Branding endpoints return flat objects (no `success` key) and pass through unchanged.
  if (payload && typeof payload === 'object' && typeof payload.success === 'boolean') {
    if (!payload.success) {
      const err = new Error(payload.message || `Request failed (${res.status})`);
      err.status = res.status;
      err.payload = payload;
      throw err;
    }
    return payload.data;
  }
  return payload;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders({ auth }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

export const apiGet = (path, opts = {}) => request(path, { method: 'GET', ...opts });
export const apiPost = (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts });
export const apiPut = (path, body, opts = {}) => request(path, { method: 'PUT', body, ...opts });
export const apiPatch = (path, body, opts = {}) => request(path, { method: 'PATCH', body, ...opts });
export const apiDelete = (path, opts = {}) => request(path, { method: 'DELETE', ...opts });

/** Multipart upload — pass a FormData; the browser sets the multipart boundary itself. */
export async function apiUpload(path, formData, { auth = true, method = 'POST' } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders({ auth, json: false }),
    body: formData,
  });
  return handle(res);
}
