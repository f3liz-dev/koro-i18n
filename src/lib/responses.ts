/**
 * Response utilities for consistent API responses
 * 
 * Provides standardized response patterns with proper caching and ETags
 */
import { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { CACHE_CONFIGS, buildCacheControl, CacheConfig } from './cache-headers';

// ============================================================================
// Response Types
// ============================================================================

export interface ApiError {
  error: string;
  details?: string | string[];
}

export interface ApiSuccess<T> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

// ============================================================================
// Standard Responses
// ============================================================================

/**
 * Return a JSON response with optional caching headers
 */
export function jsonResponse<T>(
  c: Context,
  data: T,
  options: {
    status?: ContentfulStatusCode;
    cache?: CacheConfig;
    etag?: string;
  } = {}
): Response {
  const response = c.json(data, options.status);
  
  if (options.cache) {
    response.headers.set('Cache-Control', buildCacheControl(options.cache));
  }
  
  if (options.etag) {
    response.headers.set('ETag', options.etag);
  }
  
  return response;
}

/**
 * Return success response
 */
export function success<T = void>(c: Context, data?: T, extra?: Record<string, unknown>): Response {
  return jsonResponse(c, { success: true, ...data, ...extra } as ApiSuccess<T>);
}

/**
 * Return error response
 */
export function error(
  c: Context, 
  message: string, 
  status: ContentfulStatusCode = 400, 
  details?: string | string[]
): Response {
  const body: ApiError = { error: message };
  if (details) body.details = details;
  return c.json(body, status);
}

/**
 * Return 404 Not Found
 */
export function notFound(c: Context, message: string = 'Not found'): Response {
  return error(c, message, 404);
}

/**
 * Return 401 Unauthorized
 */
export function unauthorized(c: Context, message: string = 'Unauthorized'): Response {
  return error(c, message, 401);
}

/**
 * Return 403 Forbidden
 */
export function forbidden(c: Context, message: string = 'Forbidden'): Response {
  return error(c, message, 403);
}

/**
 * Return 500 Internal Server Error
 */
export function serverError(c: Context, message: string = 'Internal error'): Response {
  return error(c, message, 500);
}

// ============================================================================
// ETag Utilities
// ============================================================================

/**
 * Generate ETag from timestamps
 */
export function generateETag(timestamps: Date[]): string {
  if (timestamps.length === 0) return '"empty"';
  const combined = timestamps.map(t => t.getTime()).join('-');
  // Simple hash using string manipulation (fast and deterministic)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

/**
 * Check if ETag matches request's If-None-Match
 */
export function checkETagMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (!ifNoneMatch) return false;
  const etags = ifNoneMatch.split(',').map(e => e.trim());
  return etags.includes(etag);
}

/**
 * Return 304 Not Modified if ETag matches
 */
export function notModified(etag: string, cache?: CacheConfig): Response {
  const headers: Record<string, string> = { 'ETag': etag };
  if (cache) {
    headers['Cache-Control'] = buildCacheControl(cache);
  }
  return new Response(null, { status: 304, headers });
}

/**
 * Check ETag and return 304 if matched, otherwise return null
 */
export function handleETag(
  c: Context,
  timestamps: Date[],
  cache: CacheConfig
): Response | null {
  const etag = generateETag(timestamps);
  if (checkETagMatch(c.req.raw, etag)) {
    return notModified(etag, cache);
  }
  return null;
}

// ============================================================================
// Streaming Responses
// ============================================================================

/**
 * Return a streaming JSONL response
 */
export function streamResponse(
  stream: ReadableStream<Uint8Array>,
  options: {
    contentType?: string;
    cache?: CacheConfig;
    etag?: string;
  } = {}
): Response {
  const headers: Record<string, string> = {
    'Content-Type': options.contentType || 'application/x-ndjson',
    'Transfer-Encoding': 'chunked',
  };
  
  if (options.cache) {
    headers['Cache-Control'] = buildCacheControl(options.cache);
  }
  
  if (options.etag) {
    headers['ETag'] = options.etag;
  }
  
  return new Response(stream, { headers });
}
