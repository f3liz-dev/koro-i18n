import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchSuggestions } from './translationApi';

describe('fetchSuggestions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should forward cache: reload when force is true', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ suggestions: [] }) });

    await fetchSuggestions('proj-id', 'en', 'common.json', 'keyA', true);

    expect(global.fetch).toHaveBeenCalled();
    const calledOptions = (global.fetch as any).mock.calls[0][1];
    expect(calledOptions).toHaveProperty('cache', 'reload');
  });

  it('should not add cache reload by default', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ suggestions: [] }) });

    await fetchSuggestions('proj-id', 'en', 'common.json', 'keyA');

    expect(global.fetch).toHaveBeenCalled();
    const calledOptions = (global.fetch as any).mock.calls[0][1];
    expect(calledOptions?.cache).not.toBe('reload');
  });
});
