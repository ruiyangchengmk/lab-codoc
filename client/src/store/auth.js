import { create } from 'zustand';

const API='***'

export const useAuth = create((set, get) => ({
  user: null,
  loaded: false,

  // Bootstrap: try /me to see if cookie is valid
  load: async () => {
    try {
      const r = await fetch(API + '/me', { credentials: 'include' });
      const d = await r.json();
      if (d.success) set({ user: d.data, loaded: true });
      else set({ user: null, loaded: true });
    } catch (e) {
      set({ user: null, loaded: true });
    }
  },

  login: async (username, password) => {
    const r = await fetch(API + '/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'login failed');
    set({ user: d.data });
    return d.data;
  },

  register: async (username, password, email) => {
    const r = await fetch(API + '/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'register failed');
    return d.data;
  },

  logout: async () => {
    await fetch(API + '/logout', { method: 'POST', credentials: 'include' });
    set({ user: null });
  },

  isAdmin: () => !!get().user && !!get().user.is_admin,
}));

// Tiny fetch wrapper that always sends cookies.
export const api = async (path, opts = {}) => {
  const r = await fetch(API + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.error || ('HTTP ' + r.status));
  return d.data;
};
