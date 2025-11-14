/**
 * Hono middleware for adding ETag headers to API responses
 */
import { Context, Next } from 'hono';
import { generateETag, checkIfNoneMatch } from './etag';

/**
 * Middleware that automatically adds ETag headers to GET responses
 * and handles 304 Not Modified responses when appropriate
 */
export async function etagMiddleware(c: Context, next: Next) {
  // Only apply to GET requests
  if (c.req.method !== 'GET') {
    return next();
  }

  // Continue processing the request
  await next();

  // Only process successful JSON responses
  const response = c.res;
  if (!response || response.status !== 200) {
    return;
  }

  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) {
    return;
  }

  // Clone response to read body (body can only be read once)
  const clonedResponse = response.clone();
  const body = await clonedResponse.text();

  // Generate ETag from response body
  const etag = await generateETag(body);

  // Check if client has matching ETag
  if (checkIfNoneMatch(c.req.raw, etag)) {
    // Client has the same content, return 304 Not Modified
    c.res = new Response(null, {
      status: 304,
      headers: {
        'ETag': etag,
        // Preserve Cache-Control header for 304 responses
        'Cache-Control': response.headers.get('Cache-Control') || '',
      },
    });
    return;
  }

  // Add ETag to the response
  response.headers.set('ETag', etag);
}
