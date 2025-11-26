import { describe, it, expect } from 'vitest';
import {
  TextLineStream,
  JsonParseStream,
  JsonStringifyStream,
  collectStream,
  createStreamFromArray,
  createJsonlStream,
  createJsonlResponse,
  parseJsonlResponse,
  type ManifestHeaderJsonl,
  type ManifestEntryJsonl,
} from './streaming';

describe('TextLineStream', () => {
  it('should split text into lines', async () => {
    const input = 'line1\nline2\nline3';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(input);
        controller.close();
      },
    });

    const result = await collectStream(
      stream.pipeThrough(new TextLineStream())
    );

    expect(result).toEqual(['line1', 'line2', 'line3']);
  });

  it('should handle chunked input', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('hel');
        controller.enqueue('lo\nwor');
        controller.enqueue('ld\n');
        controller.close();
      },
    });

    const result = await collectStream(
      stream.pipeThrough(new TextLineStream())
    );

    expect(result).toEqual(['hello', 'world']);
  });

  it('should skip empty lines', async () => {
    const input = 'line1\n\nline2\n  \nline3';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(input);
        controller.close();
      },
    });

    const result = await collectStream(
      stream.pipeThrough(new TextLineStream())
    );

    expect(result).toEqual(['line1', 'line2', 'line3']);
  });
});

describe('JsonParseStream', () => {
  it('should parse JSON lines', async () => {
    const stream = createStreamFromArray([
      '{"name": "test1"}',
      '{"name": "test2"}',
      '{"count": 42}',
    ]);

    const result = await collectStream(
      stream.pipeThrough(new JsonParseStream())
    );

    expect(result).toEqual([
      { name: 'test1' },
      { name: 'test2' },
      { count: 42 },
    ]);
  });

  it('should skip invalid JSON lines', async () => {
    const stream = createStreamFromArray([
      '{"valid": true}',
      'not valid json',
      '{"also": "valid"}',
    ]);

    const result = await collectStream(
      stream.pipeThrough(new JsonParseStream())
    );

    expect(result).toEqual([
      { valid: true },
      { also: 'valid' },
    ]);
  });
});

describe('JsonStringifyStream', () => {
  it('should stringify objects to JSONL', async () => {
    const stream = createStreamFromArray([
      { name: 'test1' },
      { name: 'test2' },
    ]);

    const result = await collectStream(
      stream.pipeThrough(new JsonStringifyStream())
    );

    expect(result).toEqual([
      '{"name":"test1"}\n',
      '{"name":"test2"}\n',
    ]);
  });
});

describe('createJsonlStream', () => {
  it('should create a JSONL stream from array', async () => {
    const items = [
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ];

    const stream = createJsonlStream(items);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }

    const lines = text.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual({ id: 1, name: 'first' });
    expect(JSON.parse(lines[1])).toEqual({ id: 2, name: 'second' });
  });
});

describe('createJsonlResponse', () => {
  it('should create a streaming JSONL response', async () => {
    const items = [
      { type: 'header' as const, repository: 'test/repo' },
      { type: 'file' as const, filename: 'test.json' },
    ];

    const response = createJsonlResponse(items);

    expect(response.headers.get('Content-Type')).toBe('application/x-ndjson');
    expect(response.headers.get('Transfer-Encoding')).toBe('chunked');

    const text = await response.text();
    const lines = text.trim().split('\n');
    
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual({ type: 'header', repository: 'test/repo' });
    expect(JSON.parse(lines[1])).toEqual({ type: 'file', filename: 'test.json' });
  });
});

describe('parseJsonlResponse', () => {
  it('should parse a JSONL response', async () => {
    const items = [
      { id: 1, value: 'first' },
      { id: 2, value: 'second' },
      { id: 3, value: 'third' },
    ];

    const response = createJsonlResponse(items);
    const parsed: Array<{ id: number; value: string }> = [];

    for await (const item of parseJsonlResponse<{ id: number; value: string }>(response)) {
      parsed.push(item);
    }

    expect(parsed).toEqual(items);
  });
});

describe('Manifest JSONL format', () => {
  it('should support manifest header and file entries', async () => {
    const header: ManifestHeaderJsonl = {
      type: 'header',
      repository: 'owner/repo',
      sourceLanguage: 'en',
      configVersion: 1,
      totalFiles: 2,
    };

    const entry1: ManifestEntryJsonl = {
      type: 'file',
      entry: {
        filename: 'common.json',
        sourceFilename: 'locales/en/common.json',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        commitHash: 'abc123',
        language: 'en',
      },
    };

    const entry2: ManifestEntryJsonl = {
      type: 'file',
      entry: {
        filename: 'errors.json',
        sourceFilename: 'locales/en/errors.json',
        lastUpdated: '2024-01-02T00:00:00.000Z',
        commitHash: 'def456',
        language: 'en',
      },
    };

    const items = [header, entry1, entry2];
    const response = createJsonlResponse(items);
    
    const parsed: Array<ManifestHeaderJsonl | ManifestEntryJsonl> = [];
    for await (const item of parseJsonlResponse<ManifestHeaderJsonl | ManifestEntryJsonl>(response)) {
      parsed.push(item);
    }

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual(header);
    expect(parsed[1]).toEqual(entry1);
    expect(parsed[2]).toEqual(entry2);

    // Type checking
    if (parsed[0].type === 'header') {
      expect(parsed[0].repository).toBe('owner/repo');
      expect(parsed[0].totalFiles).toBe(2);
    }
    if (parsed[1].type === 'file') {
      expect(parsed[1].entry.filename).toBe('common.json');
    }
  });
});
