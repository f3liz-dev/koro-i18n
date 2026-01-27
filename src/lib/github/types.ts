/**
 * Shared types for GitHub services
 */

import type { R2Metadata } from '../../../shared/types';

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
}

export interface FetchedTranslationFile {
  lang: string;
  filename: string;
  contents: Record<string, any>;
  metadata: R2Metadata;
  sourceHash: string;
  commitSha: string;
}

/**
 * Structure of the generated manifest file
 * Located at .koro-i18n/koro-i18n.repo.generated.jsonl
 */
export interface GeneratedManifest {
  repository: string;
  sourceLanguage: string;
  configVersion: number;
  files: ManifestFileEntry[];
}

export interface ManifestFileEntry {
  filename: string;        // Target filename (e.g., "common.json")
  sourceFilename: string;  // Source file path in repo (e.g., "locales/en/common.json")
  lastUpdated: string;     // ISO date string
  commitHash: string;      // Git commit hash
  language: string;        // Language code (e.g., "en", "ja")
  totalKeys?: number;      // Number of source keys for the file
}
