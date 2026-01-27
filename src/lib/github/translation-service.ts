/**
 * Translation File Service - High-Level Composition
 * 
 * DOP Pattern: Compose pure functions into higher-level operations
 */

import { Octokit } from '@octokit/rest';
import type { FetchedTranslationFile } from './types';
import * as Manifest from './manifest';
import * as FileService from './file-service';
import * as Metadata from './metadata';

// ============================================================================
// High-Level Operations (Composition)
// ============================================================================

/**
 * Fetch a single translation file with full metadata
 */
export async function fetchTranslationFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  language: string,
  filename: string,
  branch: string = 'main'
): Promise<FetchedTranslationFile | null> {
  // Step 1: Get manifest
  const manifest = await Manifest.fetchManifest(octokit, owner, repo, branch);
  if (!manifest) return null;

  // Step 2: Find file entry
  const entry = Manifest.findFileEntry(manifest, language, filename);
  if (!entry) return null;

  // Step 3: Fetch file content
  const file = await FileService.fetchFile(octokit, owner, repo, entry.filename, branch);
  if (!file) return null;

  // Step 4: Parse and validate
  let contents: Record<string, any>;
  try {
    contents = JSON.parse(file.content);
  } catch {
    return null;
  }

  // Step 5: Build metadata
  const metadata = await Metadata.buildFileMetadata(
    octokit,
    owner,
    repo,
    entry.filename,
    file.content,
    branch
  );

  // Step 6: Calculate hash
  const sourceHash = await Metadata.calculateHash(file.content);

  return {
    lang: language,
    filename,
    contents,
    metadata,
    sourceHash,
    commitSha: entry.commitHash,
  };
}

/**
 * Stream a translation file directly
 */
export async function streamTranslationFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  language: string,
  filename: string,
  branch: string = 'main'
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; commitSha: string } | null> {
  // Step 1: Get manifest
  const manifest = await Manifest.fetchManifest(octokit, owner, repo, branch);
  if (!manifest) return null;

  // Step 2: Find file entry
  const entry = Manifest.findFileEntry(manifest, language, filename);
  if (!entry) return null;

  // Step 3: Stream file
  const stream = await FileService.streamFile(octokit, owner, repo, entry.filename, branch);
  if (!stream) return null;

  // Step 4: Determine content type
  const contentType = FileService.getContentType(entry.filename);

  return {
    stream,
    contentType,
    commitSha: entry.commitHash,
  };
}

/**
 * Get latest commit SHA for a branch
 */
export async function getLatestCommit(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch,
    });
    return data.commit.sha;
  } catch (error) {
    console.warn('[commit] Failed to get latest:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<boolean> {
  try {
    await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    return true;
  } catch {
    return false;
  }
}
