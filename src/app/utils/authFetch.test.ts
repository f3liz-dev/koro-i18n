import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authFetch } from './authFetch';

// Mock fetch and window.location
const originalFetch = global.fetch;

describe('authFetch', () => {
  let mockWindow: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock window.location for node environment
    mockWindow = {
      location: {
        href: '',
      },
    };
    global.window = mockWindow as any;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  it('should pass through successful responses', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    };
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await authFetch('/api/test');
    
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith('/api/test', undefined);
  });

  it('should pass through non-401 error responses', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
    };
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await authFetch('/api/test');
    
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it('should handle 401 responses by logging out and redirecting', async () => {
    const mock401Response = {
      ok: false,
      status: 401,
    };
    
    const mockLogoutResponse = {
      ok: true,
      status: 200,
    };
    
    // First call returns 401, second call (logout) returns 200
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mock401Response)
      .mockResolvedValueOnce(mockLogoutResponse);

    const response = await authFetch('/api/projects');
    
    // Should return the 401 response
    expect(response.status).toBe(401);
    
    // Should have called logout endpoint
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    
    // Should have redirected to login
    expect(mockWindow.location.href).toBe('/login');
  });

  it('should redirect to login even if logout call fails', async () => {
    const mock401Response = {
      ok: false,
      status: 401,
    };
    
    // First call returns 401, second call (logout) throws error
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mock401Response)
      .mockRejectedValueOnce(new Error('Logout failed'));

    const response = await authFetch('/api/projects');
    
    // Should still redirect to login despite logout failure
    expect(mockWindow.location.href).toBe('/login');
    expect(response.status).toBe(401);
  });

  it('should forward fetch options correctly', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
    };
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await authFetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ test: 'data' }),
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ test: 'data' }),
    });
  });
});
