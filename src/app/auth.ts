import { createSignal, createResource, onMount } from 'solid-js';
import { tryGetCached } from './utils/cachedFetch';

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

const API = '/api';

const [userSignal, setUser] = createSignal<User | null>(null);
const [error, setError] = createSignal<string | null>(null);

// Check for cached user data at module load time
const cachedUserPromise = (async () => {
  try {
    const cached = await tryGetCached(`${API}/auth/me`, { credentials: 'include' });
    if (cached) {
      const data: any = await cached.json();
      return data.user;
    }
  } catch {
    // Cache miss is expected, continue with normal flow
  }
  return null;
})();

const fetchUser = async () => {
  try {
    const res = await fetch(`${API}/auth/me`, { 
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const userData = data.user;
    setUser(userData); // Update the signal when resource loads
    return userData;
  } catch {
    setUser(null);
    return null;
  }
};

// Initialize createResource with cached data if available
const [initialUser, { refetch }] = createResource(
  async () => {
    const cached = await cachedUserPromise;
    if (cached) return cached;
    return fetchUser();
  }
);

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
    await refetch();
  },

  clearError() {
    setError(null);
  },
};
