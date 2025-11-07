/**
 * Frontend authentication service with GitHub OAuth integration
 */

import { User } from '../types/User';

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface LoginResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export class AuthService {
  private static readonly API_BASE = '/api';
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'user_data';

  /**
   * Initiate GitHub OAuth login flow
   */
  static async initiateGitHubLogin(): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/github`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.redirectUrl) {
        // Redirect to GitHub OAuth
        window.location.href = data.redirectUrl;
        return { success: true, redirectUrl: data.redirectUrl };
      }

      return { success: false, error: 'No redirect URL received' };
    } catch (error) {
      console.error('GitHub login initiation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }

  /**
   * Handle OAuth callback and complete authentication
   */
  static async handleOAuthCallback(code: string, state: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        throw new Error(`OAuth callback failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.user && data.token) {
        // Store authentication data
        this.setStoredToken(data.token);
        this.setStoredUser(data.user);
        
        return { success: true, user: data.user };
      }

      return { success: false, error: data.error || 'Authentication failed' };
    } catch (error) {
      console.error('OAuth callback handling failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  /**
   * Get current user session
   */
  static async getCurrentUser(): Promise<AuthResponse> {
    const token = this.getStoredToken();
    const storedUser = this.getStoredUser();

    if (!token) {
      return { success: false, error: 'No authentication token' };
    }

    // Return stored user if available and token exists
    if (storedUser) {
      return { success: true, user: storedUser };
    }

    // Validate token with server
    try {
      const response = await fetch(`${this.API_BASE}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        // Token is invalid, clear storage
        this.clearAuthData();
        throw new Error('Invalid authentication token');
      }

      const data = await response.json();
      
      if (data.user) {
        this.setStoredUser(data.user);
        return { success: true, user: data.user };
      }

      return { success: false, error: 'User data not found' };
    } catch (error) {
      console.error('User session validation failed:', error);
      this.clearAuthData();
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Session validation failed' 
      };
    }
  }

  /**
   * Logout user and clear session
   */
  static async logout(): Promise<{ success: boolean; error?: string }> {
    const token = this.getStoredToken();

    try {
      // Call server logout endpoint if token exists
      if (token) {
        await fetch(`${this.API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Server logout failed:', error);
      // Continue with local cleanup even if server call fails
    }

    // Clear local authentication data
    this.clearAuthData();
    
    return { success: true };
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  /**
   * Get stored authentication token
   */
  private static getStoredToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Set authentication token in storage
   */
  private static setStoredToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store authentication token:', error);
    }
  }

  /**
   * Get stored user data
   */
  private static getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set user data in storage
   */
  private static setStoredUser(user: User): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }

  /**
   * Clear all authentication data
   */
  private static clearAuthData(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Failed to clear authentication data:', error);
    }
  }
}