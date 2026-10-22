const TOKEN_KEY = 'reminders.token';

let token = localStorage.getItem(TOKEN_KEY);
let onUnauthorized = () => {};

export const getToken = () => token;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
export function setToken(value) {
  token = value;
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

function messageFrom(detail, fallback) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    // FastAPI validation errors: [{ loc, msg }]
    return detail.map((d) => String(d.msg).replace(/^Value error, /, '')).join('. ');
  }
  return fallback;
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // A 401 on a protected call means the session ended; login failures stay on the form.
    if (res.status === 401 && token) onUnauthorized();
    throw new Error(messageFrom(data?.detail, 'Something went wrong. Try again.'));
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
