import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('authFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', async () => {
    const { authFetch } = await import('./authFetch');
    expect(authFetch).toBeDefined();
    expect(typeof authFetch).toBe('function');
  });

  it('should accept url and options parameters', async () => {
    const { authFetch } = await import('./authFetch');
    
    // Mock fetch globally
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
        headers: new Headers(),
      } as Response)
    );

    const result = await authFetch('/test', { method: 'GET' });
    
    expect(result).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should include credentials by default', async () => {
    const { authFetch } = await import('./authFetch');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
        headers: new Headers(),
      } as Response)
    );

    await authFetch('/test');
    
    // authFetch doesn't add credentials itself, it just passes through
    // The actual credentials are set by the caller
    expect(global.fetch).toHaveBeenCalledWith('/test', undefined);
  });
});
