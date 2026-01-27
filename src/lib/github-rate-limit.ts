/**
 * GitHub API Rate Limiting Helper
 * 
 * Provides utilities to check rate limits and coordinate requests
 * across multiple workers using GitHubRateLimitDO.
 */

import { Octokit } from '@octokit/rest';

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  reset: Date;
  resetIn: number; // milliseconds until reset
}

/**
 * Update rate limit state from GitHub API response
 */
export async function updateRateLimit(
  response: Response,
  githubId: number,
  rateLimitNamespace: DurableObjectNamespace
): Promise<void> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (key.startsWith('x-ratelimit-')) {
      headers[key] = value;
    }
  });

  if (Object.keys(headers).length === 0) {
    return;
  }

  const id = rateLimitNamespace.idFromName(`github-${githubId}`);
  const stub = rateLimitNamespace.get(id);
  
  await stub.fetch('http://do/update', {
    method: 'POST',
    body: JSON.stringify({ headers }),
  });
}

/**
 * Update rate limit state from Octokit response
 */
export async function updateRateLimitFromOctokit(
  octokit: Octokit,
  githubId: number,
  rateLimitNamespace: DurableObjectNamespace
): Promise<void> {
  try {
    // Get rate limit from Octokit's rateLimit endpoint
    const { data } = await octokit.rest.rateLimit.get();
    const core = data.resources.core;

    const headers: Record<string, string> = {
      'x-ratelimit-remaining': core.remaining.toString(),
      'x-ratelimit-limit': core.limit.toString(),
      'x-ratelimit-reset': core.reset.toString(),
    };

    const id = rateLimitNamespace.idFromName(`github-${githubId}`);
    const stub = rateLimitNamespace.get(id);
    
    await stub.fetch('http://do/update', {
      method: 'POST',
      body: JSON.stringify({ headers }),
    });
  } catch (error) {
    console.warn('Failed to update rate limit:', error);
  }
}

/**
 * Check if we can proceed with a GitHub API request
 */
export async function checkRateLimit(
  githubId: number,
  rateLimitNamespace: DurableObjectNamespace
): Promise<RateLimitStatus | null> {
  const id = rateLimitNamespace.idFromName(`github-${githubId}`);
  const stub = rateLimitNamespace.get(id);
  
  const response = await stub.fetch('http://do/status');
  const { status } = await response.json() as { status: any };
  
  if (!status) {
    return null;
  }

  return {
    remaining: status.remaining,
    limit: status.limit,
    reset: new Date(status.reset),
    resetIn: status.reset - Date.now(),
  };
}

/**
 * Acquire permission to make a GitHub API request
 * Waits if rate limit is exceeded
 */
export async function acquireRateLimit(
  githubId: number,
  rateLimitNamespace: DurableObjectNamespace
): Promise<void> {
  const id = rateLimitNamespace.idFromName(`github-${githubId}`);
  const stub = rateLimitNamespace.get(id);
  
  const response = await stub.fetch('http://do/acquire', {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json() as { error: string };
    throw new Error(error.error || 'Rate limit exceeded');
  }
}

/**
 * Middleware to automatically handle rate limiting for GitHub API calls
 */
export function withRateLimit<T>(
  githubId: number,
  rateLimitNamespace: DurableObjectNamespace,
  fn: () => Promise<T>
): Promise<T> {
  return acquireRateLimit(githubId, rateLimitNamespace).then(fn);
}
