/**
 * Authentication store using Solid.js reactive primitives
 */

import { createSignal, createEffect, createResource } from 'solid-js';
import { User } from '../types/User';
import { AuthService } from '../services/AuthService';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Create reactive signals for authentication state
const [user, setUser] = createSignal<User | null>(null);
const [isLoading, setIsLoading] = createSignal<boolean>(true);
const [error, setError] = createSignal<string | null>(null);

// Derived signal for authentication status
const isAuthenticated = () => !!user();

// Create resource for initial user session check
const [initialUser] = createResource(async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    const response = await AuthService.getCurrentUser();
    
    if (response.success && response.user) {
      setUser(response.user);
      return response.user;
    } else {
      setUser(null);
      if (response.error) {
        setError(response.error);
      }
      return null;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load user session';
    setError(errorMessage);
    setUser(null);
    return null;
  } finally {
    setIsLoading(false);
  }
});

// Effect to handle initial loading state
createEffect(() => {
  const userData = initialUser();
  if (userData !== undefined) {
    setIsLoading(false);
  }
});

/**
 * Authentication store actions
 */
export const authStore = {
  // State getters
  get user() { return user(); },
  get isAuthenticated() { return isAuthenticated(); },
  get isLoading() { return isLoading(); },
  get error() { return error(); },

  // Actions
  async login(): Promise<{ success: boolean; error?: string }> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await AuthService.initiateGitHubLogin();
      
      if (!response.success) {
        setError(response.error || 'Login failed');
        setIsLoading(false);
        return { success: false, error: response.error };
      }

      // GitHub OAuth will redirect, so we don't set loading to false here
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  },

  async handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await AuthService.handleOAuthCallback(code, state);
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsLoading(false);
        return { success: true };
      } else {
        setError(response.error || 'Authentication failed');
        setUser(null);
        setIsLoading(false);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      setUser(null);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  },

  async logout(): Promise<{ success: boolean; error?: string }> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await AuthService.logout();
      
      // Clear user state regardless of server response
      setUser(null);
      setIsLoading(false);
      
      if (response.success) {
        return { success: true };
      } else {
        setError(response.error || 'Logout failed');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      setUser(null); // Clear user even if logout fails
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  },

  async refreshUser(): Promise<{ success: boolean; error?: string }> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await AuthService.getCurrentUser();
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsLoading(false);
        return { success: true };
      } else {
        setError(response.error || 'Failed to refresh user data');
        setUser(null);
        setIsLoading(false);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh user data';
      setError(errorMessage);
      setUser(null);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  },

  clearError(): void {
    setError(null);
  },

  // Utility method to get current auth state as object
  getState(): AuthState {
    return {
      user: user(),
      isAuthenticated: isAuthenticated(),
      isLoading: isLoading(),
      error: error(),
    };
  }
};

// Export individual signals for direct access if needed
export { user, isAuthenticated, isLoading, error };