import { createSignal, onMount, createResource } from 'solid-js';
import { authFetch } from './utils/authFetch';

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

const API = '/api';

const [userSignal, setUser] = createSignal<User | null>(null);
const [error, setError] = createSignal<string | null>(null);

const fetchUser = async (bypassCache = false) => {
  try {
    const fetchOptions: RequestInit = { 
      credentials: 'include',
      // Use 'reload' cache mode to bypass cache if needed
      ...(bypassCache ? { cache: 'reload' } : {})
    };
    
    const res = await authFetch(`${API}/auth/me`, fetchOptions);
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

export async function fetchUserQuery(bypassCache = false) {
  try {
    const fetchOptions: RequestInit = {
      credentials: 'include',
      ...(bypassCache ? { cache: 'reload' } : {})
    };
    const res = await authFetch(`/api/auth/me`, fetchOptions);
    if (!res.ok) return null;
    const data: any = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

const [userRefreshKey, setUserRefreshKey] = createSignal(0);
const [initialUser, { refetch: refetchInitialUser }] = createResource(userRefreshKey, () => fetchUserQuery());

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
      // Call logout endpoint to clear server-side cookie
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      setError('Logout failed');
    }
  },

  async refresh() {
    // Trigger a refetch by bumping the reactive key used by createAsync
    setUserRefreshKey(k => k + 1);
    try {
      // Force a fresh fetch and update the user signal so other code depending on userSignal() sees it
      const u = await fetchUserQuery(true);
      if (u) setUser(u as any);
    } catch {
      // ignore
    }
  },

  clearError() {
    setError(null);
  },
};
