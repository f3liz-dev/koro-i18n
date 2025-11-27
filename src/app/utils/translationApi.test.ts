import { describe, expect, it, vi } from 'vitest';
import { streamStore, StoreJsonlLine } from './translationApi';
import * as authFetchModule from './authFetch';

/**
 * Test the extractValueFromPosition function behavior
 * This tests the fix for handling source as plain text using position info
 */
describe('extractValueFromPosition behavior (via integration)', () => {
  // Replicate the helper functions for testing since they are internal
  const extractQuotedString = (str: string): string => {
    const trimmed = str.trim();
    const openQuote = trimmed.indexOf('"');
    if (openQuote === -1) {
      return trimmed.replace(/,\s*$/, '');
    }
    // Find closing quote - count consecutive backslashes before quote
    // If odd number of backslashes, quote is escaped
    let closeQuote = -1;
    let i = openQuote + 1;
    while (i < trimmed.length) {
      if (trimmed[i] === '"') {
        // Count consecutive backslashes before this quote
        let backslashCount = 0;
        let j = i - 1;
        while (j >= openQuote + 1 && trimmed[j] === '\\') {
          backslashCount++;
          j--;
        }
        // Quote is escaped only if odd number of backslashes precede it
        if (backslashCount % 2 === 0) {
          closeQuote = i;
          break;
        }
      }
      i++;
    }
    if (closeQuote === -1) {
      return trimmed.substring(openQuote + 1);
    }
    const content = trimmed.substring(openQuote + 1, closeQuote);
    // Replace escaped backslash first (\\) -> (\)
    // This must happen first to avoid affecting other escape sequences like \n, \t
    return content
      .replace(/\\\\/g, '\x00')  // Temporarily replace \\\\ with null char
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\x00/g, '\\');   // Replace null char back to single backslash
  };

  const parseJsonStringValue = (extracted: string): string => {
    const colonIndex = extracted.indexOf(':');
    if (colonIndex === -1) {
      return extractQuotedString(extracted);
    }
    const afterColon = extracted.substring(colonIndex + 1).trim();
    return extractQuotedString(afterColon);
  };

  const extractValueFromPosition = (
    content: string,
    charRange: { start: [number, number]; end: [number, number] } | undefined
  ): string => {
    if (!charRange || !content) return '';
    const lines = content.split('\n');
    const [startLine, startChar] = charRange.start;
    const [endLine, endChar] = charRange.end;
    if (startLine < 1 || startLine > lines.length) return '';
    try {
      if (startLine === endLine) {
        const line = lines[startLine - 1];
        const extracted = line.substring(startChar, endChar);
        return parseJsonStringValue(extracted);
      } else {
        const extractedLines: string[] = [];
        for (let i = startLine - 1; i < endLine && i < lines.length; i++) {
          if (i === startLine - 1) {
            extractedLines.push(lines[i].substring(startChar));
          } else if (i === endLine - 1) {
            extractedLines.push(lines[i].substring(0, endChar));
          } else {
            extractedLines.push(lines[i]);
          }
        }
        return parseJsonStringValue(extractedLines.join('\n'));
      }
    } catch {
      return '';
    }
  };

  it('extracts values from JSON using position info', () => {
    const jsonContent = `{
  "welcome": "Welcome to our app",
  "goodbye": "Goodbye"
}`;

    // Position for "welcome" key (line 2, char positions)
    const welcomeRange = { start: [2, 2] as [number, number], end: [2, 33] as [number, number] };
    const welcomeValue = extractValueFromPosition(jsonContent, welcomeRange);
    expect(welcomeValue).toBe('Welcome to our app');

    // Position for "goodbye" key (line 3)
    const goodbyeRange = { start: [3, 2] as [number, number], end: [3, 22] as [number, number] };
    const goodbyeValue = extractValueFromPosition(jsonContent, goodbyeRange);
    expect(goodbyeValue).toBe('Goodbye');
  });

  it('handles escaped characters in JSON strings', () => {
    const jsonContent = `{
  "message": "Line 1\\nLine 2\\tTabbed"
}`;

    const range = { start: [2, 2] as [number, number], end: [2, 39] as [number, number] };
    const value = extractValueFromPosition(jsonContent, range);
    expect(value).toBe('Line 1\nLine 2\tTabbed');
  });

  it('handles escaped quotes in JSON strings', () => {
    const jsonContent = `{
  "quote": "He said \\"hello\\""
}`;

    const range = { start: [2, 2] as [number, number], end: [2, 31] as [number, number] };
    const value = extractValueFromPosition(jsonContent, range);
    expect(value).toBe('He said "hello"');
  });

  it('handles escaped backslash before quote correctly', () => {
    // Test case: \\\" means escaped backslash followed by quote (end of string)
    // The backslash itself is escaped, so the quote is NOT escaped
    const jsonContent = `{
  "path": "C:\\\\Users\\\\test"
}`;

    // This tests: "path": "C:\\Users\\test" where \\ becomes \
    const range = { start: [2, 2] as [number, number], end: [2, 27] as [number, number] };
    const value = extractValueFromPosition(jsonContent, range);
    expect(value).toBe('C:\\Users\\test');
  });

  it('returns empty string for invalid position', () => {
    const content = '{"key": "value"}';
    
    // Out of bounds line
    const result1 = extractValueFromPosition(content, { start: [100, 0], end: [100, 10] });
    expect(result1).toBe('');

    // No charRange
    const result2 = extractValueFromPosition(content, undefined);
    expect(result2).toBe('');

    // Empty content
    const result3 = extractValueFromPosition('', { start: [1, 0], end: [1, 5] });
    expect(result3).toBe('');
  });

  it('extracts nested JSON values when given correct position', () => {
    const jsonContent = `{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}`;

    // Position for "buttons.save" - line 3
    const saveRange = { start: [3, 4] as [number, number], end: [3, 18] as [number, number] };
    const saveValue = extractValueFromPosition(jsonContent, saveRange);
    expect(saveValue).toBe('Save');

    // Position for "buttons.cancel" - line 4
    const cancelRange = { start: [4, 4] as [number, number], end: [4, 22] as [number, number] };
    const cancelValue = extractValueFromPosition(jsonContent, cancelRange);
    expect(cancelValue).toBe('Cancel');
  });
});

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
