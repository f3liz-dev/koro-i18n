/**
 * Metadata Service - Pure Functions
 * 
 * DOP Pattern: Separate hashing, git blame, and metadata construction
 */

import { Octokit } from '@octokit/rest';
import type { R2Metadata, GitBlameInfo } from '../../../shared/types';

// ============================================================================
// Hash Utilities (Pure Functions)
// ============================================================================

/**
 * Calculate SHA-256 hash of content
 */
export async function calculateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

// ============================================================================
// Object Flattening (Pure Function)
// ============================================================================

/**
 * Flatten nested object to dot notation
 */
export function flattenObject(obj: unknown, prefix = ''): Record<string, string> {
  if (typeof obj !== 'object' || obj === null) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}

// ============================================================================
// Git Blame Fetching (I/O Function)
// ============================================================================

/**
 * Fetch git blame for a file
 */
export async function fetchGitBlame(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<GitBlameInfo | null> {
  try {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path,
      sha: ref,
      per_page: 1,
    });

    if (commits.length === 0) return null;

    const commit = commits[0];
    return {
      commit: commit.sha,
      author: commit.commit.author?.name || 'Unknown',
      email: commit.commit.author?.email || '',
      date: commit.commit.author?.date || new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`[blame] Failed for ${path}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

// ============================================================================
// Metadata Construction (Pure Functions)
// ============================================================================

interface KeyPosition {
  key: string;
  value: string;
  lineNumber: number;
  startChar: number;
  endChar: number;
}

/**
 * Find key positions in JSON content
 */
function findKeyPositions(content: string, flattenedKeys: Record<string, string>): KeyPosition[] {
  const lines = content.split('\n');
  const positions: KeyPosition[] = [];

  for (const [key, value] of Object.entries(flattenedKeys)) {
    const keyParts = key.split('.');
    const leafKey = keyParts[keyParts.length - 1];
    const keyPattern = `"${leafKey}"`;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes(keyPattern)) continue;

      const startChar = line.indexOf(keyPattern);
      const colonIndex = line.indexOf(':', startChar);
      
      if (colonIndex === -1) continue;

      const valueStart = colonIndex + 1;
      const closingQuote = line.lastIndexOf('"');
      const comma = line.indexOf(',', valueStart);

      const endChar = closingQuote > valueStart ? closingQuote + 1 :
        comma > 0 ? comma : line.length;

      positions.push({
        key,
        value,
        lineNumber: i + 1,
        startChar,
        endChar,
      });
      break;
    }
  }

  return positions;
}

/**
 * Build metadata from key positions and git blame
 */
async function buildMetadata(
  positions: KeyPosition[],
  blameInfo: GitBlameInfo | null
): Promise<R2Metadata> {
  const metadata: R2Metadata = {
    gitBlame: {},
    charRanges: {},
    sourceHashes: {},
  };

  for (const pos of positions) {
    if (blameInfo) {
      metadata.gitBlame[pos.key] = blameInfo;
    }

    metadata.charRanges[pos.key] = {
      start: [pos.lineNumber, pos.startChar],
      end: [pos.lineNumber, pos.endChar],
    };

    metadata.sourceHashes[pos.key] = await calculateHash(pos.value);
  }

  return metadata;
}

/**
 * Build complete metadata for a JSON file
 */
export async function buildFileMetadata(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  content: string,
  ref: string
): Promise<R2Metadata> {
  try {
    const parsed = JSON.parse(content);
    const flattened = flattenObject(parsed);
    const positions = findKeyPositions(content, flattened);
    const blameInfo = await fetchGitBlame(octokit, owner, repo, path, ref);
    
    return await buildMetadata(positions, blameInfo);
  } catch (error) {
    console.warn(`[metadata] Failed for ${path}:`, error instanceof Error ? error.message : error);
    return { gitBlame: {}, charRanges: {}, sourceHashes: {} };
  }
}

// ============================================================================
// Progress Tracking Files (I/O Functions)
// ============================================================================

/**
 * Fetch progress-translated file for a language
 */
export async function fetchProgressTranslated(
  octokit: Octokit,
  owner: string,
  repo: string,
  language: string,
  branch: string = 'main'
): Promise<Record<string, string[]> | null> {
  try {
    const path = `.koro-i18n/progress-translated/${language}.jsonl`;
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (!('content' in data) || !data.content) return null;

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const lines = content.trim().split('\n');
    const result: Record<string, string[]> = {};

    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);
      if (parsed.type === 'file') {
        result[parsed.filepath] = parsed.keys;
      }
    }

    return result;
  } catch (error) {
    console.warn(`[progress] Not found for ${language}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch store file for a language
 */
export async function fetchStore(
  octokit: Octokit,
  owner: string,
  repo: string,
  language: string,
  branch: string = 'main'
): Promise<Record<string, Record<string, any>> | null> {
  try {
    const path = `.koro-i18n/store/${language}.jsonl`;
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (!('content' in data) || !data.content) return null;

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const lines = content.trim().split('\n');
    const result: Record<string, Record<string, any>> = {};

    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);

      if (parsed.type === 'file') {
        result[parsed.filepath] = parsed.entries;
      } else if (parsed.type === 'chunk') {
        if (!result[parsed.filepath]) {
          result[parsed.filepath] = {};
        }
        Object.assign(result[parsed.filepath], parsed.entries);
      }
    }

    return result;
  } catch (error) {
    console.warn(`[store] Not found for ${language}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
