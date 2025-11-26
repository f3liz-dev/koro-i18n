/**
 * Streaming utilities for koro-i18n
 * 
 * Provides support for:
 * - TextLineStream: Transform stream that splits text into lines
 * - JsonLineStream: Transform stream that parses JSONL format
 * - Streaming file fetches from GitHub
 */

/**
 * TextLineStream implementation (similar to @std/streams/text-line-stream)
 * Transforms a stream of text into a stream of lines
 */
export class TextLineStream extends TransformStream<string, string> {
  constructor() {
    let buffer = '';

    super({
      transform(chunk: string, controller: TransformStreamDefaultController<string>) {
        buffer += chunk;
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            controller.enqueue(line);
          }
        }
      },
      flush(controller: TransformStreamDefaultController<string>) {
        // Emit any remaining content
        if (buffer.trim()) {
          controller.enqueue(buffer);
        }
      },
    });
  }
}

/**
 * JsonParseStream implementation (similar to @std/json/parse-stream)
 * Transforms a stream of text into a stream of parsed JSON objects
 * Designed for JSONL (JSON Lines) format where each line is a valid JSON object
 */
export class JsonParseStream<T = unknown> extends TransformStream<string, T> {
  constructor() {
    super({
      transform(chunk: string, controller: TransformStreamDefaultController<T>) {
        try {
          const parsed = JSON.parse(chunk) as T;
          controller.enqueue(parsed);
        } catch {
          // Skip invalid JSON lines - log for debugging
          console.warn('[JsonParseStream] Failed to parse line:', chunk.substring(0, 100));
        }
      },
    });
  }
}

/**
 * JsonStringifyStream implementation
 * Transforms a stream of objects into a stream of JSONL strings
 */
export class JsonStringifyStream<T = unknown> extends TransformStream<T, string> {
  constructor() {
    super({
      transform(chunk: T, controller: TransformStreamDefaultController<string>) {
        controller.enqueue(JSON.stringify(chunk) + '\n');
      },
    });
  }
}

/**
 * Collect all items from a readable stream into an array
 */
export async function collectStream<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const items: T[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    items.push(value);
  }
  
  return items;
}

/**
 * Create a readable stream from an array of items
 */
export function createStreamFromArray<T>(items: T[]): ReadableStream<T> {
  let index = 0;
  
  return new ReadableStream<T>({
    pull(controller) {
      if (index < items.length) {
        controller.enqueue(items[index]);
        index++;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Create a JSONL readable stream from an array of objects
 * Each object is serialized as a JSON line
 */
export function createJsonlStream<T>(items: T[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < items.length) {
        const line = JSON.stringify(items[index]) + '\n';
        controller.enqueue(encoder.encode(line));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Parse a JSONL stream and return an async iterator
 * 
 * @example
 * ```ts
 * const response = await fetch('/api/files/stream');
 * for await (const item of parseJsonlResponse<FileEntry>(response)) {
 *   console.log(item);
 * }
 * ```
 */
export async function* parseJsonlResponse<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) {
    return;
  }

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    .pipeThrough(new JsonParseStream<T>())
    .getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield value;
  }
}

/**
 * Create a streaming Response from an iterable of items
 * Items are serialized as JSONL format
 */
export function createJsonlResponse<T>(
  items: T[] | AsyncIterable<T>,
  headers?: Record<string, string>
): Response {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const item of items as AsyncIterable<T>) {
          const line = JSON.stringify(item) + '\n';
          controller.enqueue(encoder.encode(line));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      ...headers,
    },
  });
}

/**
 * Manifest file entry in JSONL format
 * Each line in the metadata JSONL file represents one file entry
 */
export interface ManifestFileEntryJsonl {
  filename: string;
  sourceFilename: string;
  lastUpdated: string;
  commitHash: string;
  language: string;
}

/**
 * Manifest header in JSONL format (first line of the file)
 */
export interface ManifestHeaderJsonl {
  type: 'header';
  repository: string;
  sourceLanguage: string;
  configVersion: number;
  totalFiles: number;
}

/**
 * Manifest file entry wrapper in JSONL format
 */
export interface ManifestEntryJsonl {
  type: 'file';
  entry: ManifestFileEntryJsonl;
}

/**
 * Union type for all JSONL manifest entries
 */
export type ManifestJsonlLine = ManifestHeaderJsonl | ManifestEntryJsonl;
