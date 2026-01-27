/**
 * Manifest Service - Pure Functions
 * 
 * DOP Pattern: Data structures are separate from operations.
 * All functions are pure and composable.
 */

import { Octokit } from '@octokit/rest';
import type { GeneratedManifest, ManifestFileEntry } from './types';

const MANIFEST_PATH = '.koro-i18n/koro-i18n.repo.generated.jsonl';

// ============================================================================
// Data Parsers (Pure Functions)
// ============================================================================

/**
 * Parse JSONL line into typed object
 */
function parseJsonlLine(line: string): unknown {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * Check if parsed line is a header
 */
function isHeaderLine(parsed: any): boolean {
  return parsed?.type === 'header';
}

/**
 * Check if parsed line is a file entry
 */
function isFileLine(parsed: any): boolean {
  return parsed?.type === 'file';
}

/**
 * Extract header from parsed line
 */
function extractHeader(parsed: any): Omit<GeneratedManifest, 'files'> {
  return {
    repository: parsed.repository,
    sourceLanguage: parsed.sourceLanguage,
    configVersion: parsed.configVersion,
  };
}

/**
 * Extract file entry from parsed line
 */
function extractFileEntry(parsed: any): ManifestFileEntry {
  return parsed.entry;
}

/**
 * Parse JSONL content into manifest structure
 */
export function parseManifestJsonl(content: string): GeneratedManifest | null {
  const lines = content.trim().split('\n');
  let header: Omit<GeneratedManifest, 'files'> | null = null;
  const files: ManifestFileEntry[] = [];

  for (const line of lines) {
    const parsed = parseJsonlLine(line);
    if (!parsed) continue;

    if (isHeaderLine(parsed)) {
      header = extractHeader(parsed);
    } else if (isFileLine(parsed)) {
      files.push(extractFileEntry(parsed));
    }
  }

  if (!header) return null;

  return { ...header, files };
}

// ============================================================================
// GitHub Fetchers (I/O Functions)
// ============================================================================

/**
 * Fetch manifest content from GitHub
 */
async function fetchManifestContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: MANIFEST_PATH,
      ref: branch,
    });

    if (!('content' in data)) return null;

    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (error) {
    console.warn('[manifest] Failed to fetch:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch and parse generated manifest
 */
export async function fetchManifest(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<GeneratedManifest | null> {
  const content = await fetchManifestContent(octokit, owner, repo, branch);
  if (!content) return null;
  return parseManifestJsonl(content);
}

/**
 * Stream manifest as JSONL
 */
export async function streamManifestJsonl(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: MANIFEST_PATH,
      ref: branch,
      headers: { 'Accept': 'application/vnd.github.raw' },
      request: { parseSuccessResponseBody: false },
    });

    return response.data as unknown as ReadableStream<Uint8Array>;
  } catch (error) {
    console.warn('[manifest] Failed to stream:', error instanceof Error ? error.message : error);
    return null;
  }
}

// ============================================================================
// Manifest Queries (Pure Functions)
// ============================================================================

/**
 * Find file entry by language and filename
 */
export function findFileEntry(
  manifest: GeneratedManifest,
  language: string,
  filename: string
): ManifestFileEntry | null {
  return manifest.files.find(f => 
    f.language === language && f.filename === filename
  ) || null;
}

/**
 * Get all entries for a specific language
 */
export function getEntriesForLanguage(
  manifest: GeneratedManifest,
  language: string
): ManifestFileEntry[] {
  return manifest.files.filter(f => f.language === language);
}

/**
 * Get all languages in manifest
 */
export function getLanguages(manifest: GeneratedManifest): string[] {
  return Array.from(new Set(manifest.files.map(f => f.language)));
}

/**
 * Count files per language
 */
export function countFilesByLanguage(manifest: GeneratedManifest): Record<string, number> {
  return manifest.files.reduce((acc, f) => {
    acc[f.language] = (acc[f.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ============================================================================
// Manifest Generation (for streaming API responses)
// ============================================================================

export type ManifestJsonlLine = 
  | { type: 'header'; repository: string; sourceLanguage: string; configVersion: number; totalFiles: number }
  | { type: 'file'; entry: ManifestFileEntry };

/**
 * Generate JSONL lines from manifest (async generator)
 */
export async function* generateManifestJsonl(
  manifest: GeneratedManifest
): AsyncGenerator<ManifestJsonlLine> {
  yield {
    type: 'header',
    repository: manifest.repository,
    sourceLanguage: manifest.sourceLanguage,
    configVersion: manifest.configVersion,
    totalFiles: manifest.files.length,
  };

  for (const file of manifest.files) {
    yield {
      type: 'file',
      entry: file,
    };
  }
}
