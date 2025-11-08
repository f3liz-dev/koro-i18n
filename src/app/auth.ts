import { createSignal, createResource } from 'solid-js';

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

const API = '/api';

const [userSignal, setUser] = createSignal<User | null>(null);
const [error, setError] = createSignal<string | null>(null);

const fetchUser = async () => {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data.user;
  } catch {
    return null;
  }
};

const [initialUser] = createResource(fetchUser);

// Export user signal for components
export const user = () => userSignal() || initialUser();

export const auth = {
  get user() { return userSignal() || initialUser(); },
  get isAuthenticated() { return !!this.user; },
  get error() { return error(); },

  async login() {
    window.location.href = `${API}/auth/github`;
  },

  async logout() {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      setError('Logout failed');
    }
  },

  async refresh() {
    try {
      const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data: any = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  },

  clearError() {
    setError(null);
  },
};
