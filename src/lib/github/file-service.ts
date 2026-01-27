/**
 * File Service - Pure Functions for GitHub File Operations
 * 
 * DOP Pattern: Separate data fetching from data transformation
 */

import { Octokit } from '@octokit/rest';
import type { GitHubFile } from './types';

// ============================================================================
// Stream Utilities (Pure Functions)
// ============================================================================

/**
 * Convert ReadableStream to string
 */
export async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) result += decoder.decode(value, { stream: true });
    }
    result += decoder.decode();
    return result;
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

/**
 * Decode base64 content to UTF-8 string
 */
function decodeBase64Content(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// ============================================================================
// Content Type Mapping (Pure Function)
// ============================================================================

const CONTENT_TYPE_MAP: Record<string, string> = {
  json: 'application/json',
  jsonl: 'application/x-ndjson',
  toml: 'application/toml',
  md: 'text/markdown',
  txt: 'text/plain',
};

/**
 * Get content type from file extension
 */
export function getContentType(filename: string): string {
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;
  return ext ? CONTENT_TYPE_MAP[ext] || 'application/octet-stream' : 'application/octet-stream';
}

// ============================================================================
// GitHub File Fetchers (I/O Functions)
// ============================================================================

/**
 * Stream file content from GitHub (preferred method)
 */
export async function streamFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path,
      ref: branch,
      headers: { 'Accept': 'application/vnd.github.raw' },
      request: { parseSuccessResponseBody: false },
    });

    return response.data as unknown as ReadableStream<Uint8Array>;
  } catch (error) {
    console.warn(`[file] Failed to stream ${path}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch file content as string (fallback method)
 */
export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<{ content: string; sha: string } | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (!('content' in data) || !data.content) return null;

    return {
      content: decodeBase64Content(data.content),
      sha: data.sha,
    };
  } catch (error) {
    console.warn(`[file] Failed to fetch ${path}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch file with automatic fallback (stream → base64)
 */
export async function fetchFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<GitHubFile | null> {
  // Try streaming first
  const stream = await streamFile(octokit, owner, repo, path, branch);
  if (stream) {
    const content = await streamToString(stream);
    // Note: SHA not available from streaming, use empty string
    return { path, content, sha: '' };
  }

  // Fallback to base64
  const result = await fetchFileContent(octokit, owner, repo, path, branch);
  if (result) {
    return { path, content: result.content, sha: result.sha };
  }

  return null;
}

/**
 * Fetch multiple files in parallel
 */
export async function fetchFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  paths: string[],
  branch: string = 'main'
): Promise<GitHubFile[]> {
  const promises = paths.map(path => fetchFile(octokit, owner, repo, path, branch));
  const results = await Promise.allSettled(promises);
  
  return results
    .filter((r): r is PromiseFulfilledResult<GitHubFile | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((f): f is GitHubFile => f !== null);
}

// ============================================================================
// Directory Operations
// ============================================================================

interface DirectoryItem {
  type: 'file' | 'dir';
  path: string;
  sha: string;
}

/**
 * List directory contents
 */
async function listDirectory(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<DirectoryItem[]> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    const items = Array.isArray(data) ? data : [data];
    return items.map(item => ({
      type: item.type as 'file' | 'dir',
      path: item.path,
      sha: item.sha,
    }));
  } catch (error) {
    console.warn(`[file] Failed to list ${path}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Recursively fetch all JSON files from a directory
 */
export async function fetchJsonFilesRecursive(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<GitHubFile[]> {
  const items = await listDirectory(octokit, owner, repo, path, branch);
  const files: GitHubFile[] = [];

  for (const item of items) {
    if (item.type === 'file' && item.path.endsWith('.json')) {
      const file = await fetchFile(octokit, owner, repo, item.path, branch);
      if (file) files.push(file);
    } else if (item.type === 'dir') {
      const subFiles = await fetchJsonFilesRecursive(octokit, owner, repo, item.path, branch);
      files.push(...subFiles);
    }
  }

  return files;
}

// ============================================================================
// Path Utilities (Pure Functions)
// ============================================================================

/**
 * Extract filename from path
 */
export function extractFilename(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * Extract language from file path
 */
export function extractLanguage(path: string): string {
  const patterns = [
    /\/locales\/([a-z]{2}(-[A-Z]{2})?)\//i,
    /\/translations\/([a-z]{2}(-[A-Z]{2})?)\//i,
    /\/([a-z]{2}(-[A-Z]{2})?)\.json$/i,
    /\/([a-z]{2}(-[A-Z]{2})?)\//i,
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match?.[1]) return match[1];
  }

  return 'unknown';
}
