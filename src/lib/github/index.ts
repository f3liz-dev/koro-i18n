/**
 * GitHub Service Module - Data-Oriented Programming Pattern
 * 
 * Organized as pure functions separated from I/O operations:
 * 
 * - types: Data structures
 * - client: Basic GitHub authentication and utilities
 * - file-service: File fetching and streaming (I/O)
 * - manifest: Manifest parsing and queries (mostly pure)
 * - metadata: Metadata construction (pure + I/O)
 * - translation-service: High-level compositions
 */

// Core utilities
export * from './client';

// Services (organized by domain)
export * as Manifest from './manifest';
export * as FileService from './file-service';
export * as Metadata from './metadata';
export * as TranslationService from './translation-service';

// Types
export type { 
  GitHubFile, 
  FetchedTranslationFile,
  GeneratedManifest,
  ManifestFileEntry 
} from './types';
