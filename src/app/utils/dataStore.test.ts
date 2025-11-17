import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { suggestionsCache } from './dataStore';

describe('suggestionsCache', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should call fetch for suggestions', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ suggestions: [] }) });

    await suggestionsCache.fetch('proj-id', 'en', 'common.json');

    expect(global.fetch).toHaveBeenCalled();
  });
});
