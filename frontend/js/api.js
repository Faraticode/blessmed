// Centralised API helper — every page uses this instead of raw fetch calls.
const API_BASE = '/api';

const Auth = {
  getToken() {
    return localStorage.getItem('blessmed_token');
  },
  getUser() {
    const raw = localStorage.getItem('blessmed_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('blessmed_token', token);
    localStorage.setItem('blessmed_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('blessmed_token');
    localStorage.removeItem('blessmed_user');
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  logout() {
    this.clearSession();
    window.location.href = 'login.html';
  },
  // Call at the top of every protected page
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  }
};

async function apiRequest(path, { method = 'GET', body = null, isFormData = false } = {}) {
  const headers = {};
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.status === 401) {
    Auth.clearSession();
    window.location.href = 'login.html';
    throw new Error('Session expired.');
  }

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }

  return data;
}
