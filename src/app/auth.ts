import { createSignal, createResource, onMount } from 'solid-js';
import { authFetch } from './utils/authFetch';
import { clearAllCaches } from './utils/dataStore';
import { isFirstLoad } from './utils/appState';

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
    // On page reload (first load), bypass cache to ensure fresh data
    const fetchOptions: RequestInit = { 
      credentials: 'include',
      // Use 'reload' cache mode to bypass cache on page reload
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

// Initialize createResource - force fresh fetch on page reload
const [initialUser, { refetch }] = createResource(
  async () => {
    // Check if this is first load (page reload) - if so, bypass cache
    const isPageReload = isFirstLoad();
    console.log(`[Auth] ${isPageReload ? 'Page reload detected - fetching fresh data' : 'Using cached auth data'}`);
    return fetchUser(isPageReload);
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
      // Clear all caches first to prevent stale data
      console.log('[Auth] Clearing all caches');
      clearAllCaches(); // Clear dataStore caches

      // Call logout endpoint to clear server-side cookie
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
