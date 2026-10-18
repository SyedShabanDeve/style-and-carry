/**
 * Thin fetch wrapper for the Style & Carry API.
 *
 * The auth token is read through a getter that the store installs at start-up,
 * so this module never imports the store and there is no import cycle.
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

let getToken = () => null;
let onExpired = () => {};

/** Called once from the store so requests can carry the admin token. */
export function attachAuth({ tokenGetter, expiredHandler }) {
  if (tokenGetter) getToken = tokenGetter;
  if (expiredHandler) onExpired = expiredHandler;
}

/** Error carrying the HTTP status and the server's machine-readable code. */
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, auth = false, signal, raw } = {}) {
  const headers = {};
  if (body && !raw) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getToken();
    if (!token) {
      onExpired();
      throw new ApiError('Your session has ended. Please sign in again.', 401, 'NO_TOKEN');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      signal,
      body: raw ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(
      'Could not reach the server. Check your internet connection.',
      0,
      'NETWORK'
    );
  }

  // 204 and other empty bodies.
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const code = data?.code;
    // An expired or invalid token means the session is over: tell the store so
    // it can clear the login and send the owner back to the sign-in screen.
    if (res.status === 401 && auth) onExpired(code);
    throw new ApiError(
      data?.error || `Request failed (${res.status})`,
      res.status,
      code
    );
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),

  /** Multipart upload; the browser sets its own Content-Type boundary. */
  upload: (path, formData) =>
    request(path, { method: 'POST', body: formData, auth: true, raw: true }),
};

export default api;
