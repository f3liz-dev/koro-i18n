import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { streamJsonl } from './streaming';

import * as authFetchModule from './authFetch';

describe('streamJsonl', () => {
  let origAuthFetch: any;

  beforeEach(() => {
    origAuthFetch = (authFetchModule as any).authFetch;
  });

  afterEach(() => {
    (authFetchModule as any).authFetch = origAuthFetch;
    vi.restoreAllMocks();
  });

  it('parses JSONL streaming response split across chunks', async () => {
    const encoder = new TextEncoder();
    const lines = [
      JSON.stringify({ type: 'header', repository: 'owner/repo' }) + '\n',
      JSON.stringify({ type: 'file', entry: { filename: 'common.json' } }) + '\n',
      JSON.stringify({ type: 'file', entry: { filename: 'errors.json' } }) + '\n',
    ];

    // Create a ReadableStream that splits the second line across two chunks
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(lines[0]));
        const second = lines[1];
        const splitIndex = Math.floor(second.length / 2);
        controller.enqueue(encoder.encode(second.slice(0, splitIndex)));
        controller.enqueue(encoder.encode(second.slice(splitIndex)));
        controller.enqueue(encoder.encode(lines[2]));
        controller.close();
      }
    });

    // Mock authFetch to return our response
    (authFetchModule as any).authFetch = async () => new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });

    const url = '/test/stream';
    const results: any[] = [];
    for await (const item of streamJsonl(url)) {
      results.push(item);
    }

    expect(results.length).toBe(3);
    expect(results[0].type).toBe('header');
    expect(results[1].type).toBe('file');
    expect(results[1].entry.filename).toBe('common.json');
    expect(results[2].entry.filename).toBe('errors.json');
  });

  it('throws a useful error message when response is non-ok JSON', async () => {
    // Mock authFetch to return error response
    (authFetchModule as any).authFetch = async () => new Response(JSON.stringify({ error: 'Progress file not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    const url = '/test/stream/fail';
    const gen = streamJsonl(url);

    await expect(gen.next()).rejects.toThrow(/Progress file not found/);
  });
});
