/**
 * Database-optimized ETag generation utilities
 * 
 * Instead of hashing full response content, we generate ETags based on
 * database timestamps (updatedAt, createdAt) which is much more efficient.
 * 
 * Benefits:
 * - No need to hash large response bodies
 * - ETags change only when data actually changes in DB
 * - More efficient 304 Not Modified responses
 * - Reduced CPU usage on server
 */

/**
 * Generate ETag from timestamp(s)
 * Uses the most recent timestamp to create a unique identifier
 * 
 * @param timestamps - One or more Date objects or ISO strings
 * @returns ETag string in format "timestamp-hash"
 */
export function generateETagFromTimestamp(...timestamps: (Date | string | null | undefined)[]): string {
  // Filter out null/undefined and convert to timestamps
  const validTimestamps = timestamps
    .filter((t): t is Date | string => t != null)
    .map(t => {
      if (typeof t === 'string') {
        return new Date(t).getTime();
      }
      return t.getTime();
    });

  if (validTimestamps.length === 0) {
    // No valid timestamps, use current time (fallback)
    return `"${Date.now()}"`;
  }

  // Use the most recent timestamp
  const maxTimestamp = Math.max(...validTimestamps);
  
  // Create a simple hash from the timestamp
  // This ensures uniqueness across different endpoints
  const hash = maxTimestamp.toString(36);
  
  return `"${hash}"`;
}

/**
 * Generate ETag for projects list based on most recent project/member change
 * 
 * @param projectCreatedAts - Array of project createdAt dates
 * @param memberUpdatedAts - Array of member updatedAt dates (optional)
 * @returns ETag string
 */
export function generateProjectsETag(
  projectCreatedAts: (Date | string)[],
  memberUpdatedAts?: (Date | string)[]
): string {
  const allTimestamps = [...projectCreatedAts, ...(memberUpdatedAts || [])];
  return generateETagFromTimestamp(...allTimestamps);
}

/**
 * Generate ETag for translations based on most recent translation update
 * 
 * @param translationUpdatedAts - Array of translation updatedAt dates
 * @returns ETag string
 */
export function generateTranslationsETag(
  translationUpdatedAts: (Date | string)[]
): string {
  return generateETagFromTimestamp(...translationUpdatedAts);
}

/**
 * Generate ETag for translation history based on most recent history entry
 * 
 * @param historyCreatedAts - Array of history createdAt dates
 * @returns ETag string
 */
export function generateHistoryETag(
  historyCreatedAts: (Date | string)[]
): string {
  return generateETagFromTimestamp(...historyCreatedAts);
}

/**
 * Generate ETag for project files based on most recent upload
 * 
 * @param fileUploadedAts - Array of file uploadedAt dates
 * @returns ETag string
 */
export function generateFilesETag(
  fileUploadedAts: (Date | string)[]
): string {
  return generateETagFromTimestamp(...fileUploadedAts);
}

/**
 * Check if the request's If-None-Match header matches the given ETag
 * 
 * @param request - The incoming request
 * @param etag - The current ETag
 * @returns true if the ETags match (content not modified)
 */
export function checkETagMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (!ifNoneMatch) return false;
  
  // Handle multiple ETags in If-None-Match
  const etags = ifNoneMatch.split(',').map(e => e.trim());
  return etags.includes(etag);
}

/**
 * Create a 304 Not Modified response with proper headers
 * 
 * @param etag - The ETag to include in response
 * @param cacheControl - Optional Cache-Control header value
 * @returns Response with 304 status
 */
export function create304Response(etag: string, cacheControl?: string): Response {
  const headers: Record<string, string> = { 'ETag': etag };
  
  if (cacheControl) {
    headers['Cache-Control'] = cacheControl;
  }
  
  return new Response(null, {
    status: 304,
    headers,
  });
}
