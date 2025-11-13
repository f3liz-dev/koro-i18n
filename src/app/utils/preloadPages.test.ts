import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We need to reset the module between tests to clear the preloadStarted state
let preloadFrequentPages: () => void;

describe('preloadFrequentPages', () => {
  let mockWindow: any;
  let consoleSpy: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock window.location
    mockWindow = {
      location: {
        pathname: '/dashboard',
      },
    };
    global.window = mockWindow as any;

    // Spy on console.log
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Reset the module by clearing the cache and re-importing
    vi.resetModules();
    const module = await import('./preloadPages');
    preloadFrequentPages = module.preloadFrequentPages;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip preloading when on /login route', () => {
    mockWindow.location.pathname = '/login';
    
    preloadFrequentPages();
    
    expect(consoleSpy).toHaveBeenCalledWith('[Preload] Skipping preload on', '/login');
  });

  it('should skip preloading when on / (root) route', () => {
    mockWindow.location.pathname = '/';
    
    preloadFrequentPages();
    
    expect(consoleSpy).toHaveBeenCalledWith('[Preload] Skipping preload on', '/');
  });

  it('should not skip preloading on other routes', () => {
    mockWindow.location.pathname = '/dashboard';
    
    // Mock requestIdleCallback to prevent actual imports
    const requestIdleCallbackMock = vi.fn();
    (global as any).requestIdleCallback = requestIdleCallbackMock;
    
    preloadFrequentPages();
    
    // Should not log the skip message for /dashboard
    expect(consoleSpy).not.toHaveBeenCalledWith('[Preload] Skipping preload on', '/dashboard');
    
    // Should not log skip messages for / or /login either
    expect(consoleSpy).not.toHaveBeenCalledWith('[Preload] Skipping preload on', '/');
    expect(consoleSpy).not.toHaveBeenCalledWith('[Preload] Skipping preload on', '/login');
  });
});
