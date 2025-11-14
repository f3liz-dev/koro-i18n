/**
 * ETag generation utilities for API responses
 * 
 * ETags enable efficient caching by allowing clients to validate cached content
 * without downloading it again if it hasn't changed.
 */

/**
 * Generate a hash from string content using crypto API
 * @param content - The content to hash
 * @returns A hex string representation of the SHA-256 hash
 */
async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate an ETag from response content
 * @param content - The content to generate an ETag for (usually JSON stringified)
 * @returns ETag string in format "hash"
 */
export async function generateETag(content: string): Promise<string> {
  const hash = await generateHash(content);
  // Return first 16 characters of hash for brevity
  return `"${hash.substring(0, 16)}"`;
}

/**
 * Add ETag header to a response based on its content
 * @param response - The response to add ETag to
 * @param content - The content used to generate the ETag
 * @returns Response with ETag header added
 */
export async function withETag(response: Response, content: string): Promise<Response> {
  const etag = await generateETag(content);
  response.headers.set('ETag', etag);
  return response;
}

/**
 * Check if request's If-None-Match header matches the given ETag
 * @param request - The incoming request
 * @param etag - The current ETag
 * @returns true if the ETags match (content not modified)
 */
export function checkIfNoneMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (!ifNoneMatch) return false;
  
  // Handle multiple ETags in If-None-Match
  const etags = ifNoneMatch.split(',').map(e => e.trim());
  return etags.includes(etag);
}
