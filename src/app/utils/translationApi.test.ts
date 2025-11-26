import { describe, expect, it, vi } from 'vitest';
import { streamStore, StoreJsonlLine } from './translationApi';
import * as authFetchModule from './authFetch';

describe('streamStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('yields store file header and chunks', async () => {
    const encoder = new TextEncoder();
    const lines = [
      JSON.stringify({ type: 'header', language: 'en', totalFiles: 1, totalKeys: 2 }) + '\n',
      JSON.stringify({ type: 'file_header', filepath: 'locales/<lang>/common.json', totalKeys: 2 }) + '\n',
      JSON.stringify({ type: 'chunk', filepath: 'locales/<lang>/common.json', chunkIndex: 0, entries: { 'greeting': { src: 'abc', tgt: 'def', updated: 1600000000, status: 'verified' } } }) + '\n',
    ];

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const line of lines) controller.enqueue(encoder.encode(line));
        controller.close();
      }
    });

    (authFetchModule as any).authFetch = async () => new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });

    const results: StoreJsonlLine[] = [];
    for await (const item of streamStore('my-project', 'en')) {
      results.push(item);
    }

    expect(results.length).toBe(3);
    expect(results[0].type).toBe('header');
    expect(results[1].type).toBe('file_header');
    expect(results[2].type).toBe('chunk');
    // Ensure chunk contains entries
    expect((results[2] as any).entries['greeting'].status).toBe('verified');
  });
});
