/**
 * Shared types for koro-i18n
 * Uses io-ts for runtime validation and type inference
 * Can be used in client, server, and frontend
 */

import * as t from 'io-ts';

// ============================================================================
// Primitives
// ============================================================================

export const LineCharPosition = t.tuple([t.number, t.number]);
export type LineCharPosition = t.TypeOf<typeof LineCharPosition>;

export const CharRange = t.type({
  start: LineCharPosition,
  end: LineCharPosition,
});
export type CharRange = t.TypeOf<typeof CharRange>;

// ============================================================================
// Git Blame
// ============================================================================

export const GitBlameInfo = t.type({
  commit: t.string,
  author: t.string,
  email: t.string,
  date: t.string,
});
export type GitBlameInfo = t.TypeOf<typeof GitBlameInfo>;

// ============================================================================
// File Metadata (previously R2Metadata)
// ============================================================================

export const FileMetadata = t.type({
  gitBlame: t.record(t.string, GitBlameInfo),
  charRanges: t.record(t.string, CharRange),
  sourceHashes: t.record(t.string, t.string),
});
export type FileMetadata = t.TypeOf<typeof FileMetadata>;

// Alias for backward compatibility
export const R2Metadata = FileMetadata;
export type R2Metadata = FileMetadata;

// ============================================================================
// File Data (previously R2FileData)
// ============================================================================

export const FileData = t.type({
  raw: t.record(t.string, t.any),
  metadata: FileMetadata,
  sourceHash: t.string,
  commitSha: t.string,
  uploadedAt: t.string,
});
export type FileData = t.TypeOf<typeof FileData>;

// Alias for backward compatibility
export const R2FileData = FileData;
export type R2FileData = FileData;

// ============================================================================
// Web Translation
// ============================================================================

export const WebTranslationStatus = t.union([
  t.literal('pending'),
  t.literal('approved'),
  t.literal('rejected'),
  t.literal('deleted'),
]);
export type WebTranslationStatus = t.TypeOf<typeof WebTranslationStatus>;

export const WebTranslation = t.type({
  id: t.string,
  projectId: t.string,
  language: t.string,
  filename: t.string,
  key: t.string,
  value: t.string,
  userId: t.string,
  status: WebTranslationStatus,
  sourceHash: t.union([t.string, t.null, t.undefined]),
  isValid: t.boolean,
  createdAt: t.string,
  updatedAt: t.string,
  // Optional fields from joins
  username: t.union([t.string, t.undefined]),
  avatarUrl: t.union([t.string, t.undefined]),
});
export type WebTranslation = t.TypeOf<typeof WebTranslation>;

// ============================================================================
// Merged Translation (for UI)
// ============================================================================

export const MergedTranslation = t.type({
  key: t.string,
  sourceValue: t.string,
  currentValue: t.string,
  gitBlame: t.union([GitBlameInfo, t.undefined]),
  charRange: t.union([CharRange, t.undefined]),
  webTranslation: t.union([WebTranslation, t.undefined]),
  isValid: t.boolean,
});
export type MergedTranslation = t.TypeOf<typeof MergedTranslation>;

// ============================================================================
// API Responses
// ============================================================================

export const FileResponse = t.type({
  contents: t.record(t.string, t.string),
  metadata: FileMetadata,
  sourceHash: t.string,
  commitSha: t.string,
  uploadedAt: t.string,
  totalKeys: t.union([t.number, t.undefined]),
});
export type FileResponse = t.TypeOf<typeof FileResponse>;

// Alias for backward compatibility
export const R2FileResponse = FileResponse;
export type R2FileResponse = FileResponse;

export const WebTranslationsResponse = t.type({
  translations: t.array(WebTranslation),
});
export type WebTranslationsResponse = t.TypeOf<typeof WebTranslationsResponse>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate and decode data using io-ts codec
 * Throws error if validation fails
 */
export function validate<A, O, I>(
  codec: t.Type<A, O, I>,
  data: I,
  context: string = 'data'
): A {
  const result = codec.decode(data);
  
  if (result._tag === 'Left') {
    const errors = result.left.map((e: t.ValidationError) => {
      const path = e.context.map((c: t.ContextEntry) => c.key).filter(Boolean).join('.');
      return `${path}: ${e.message || 'validation failed'}`;
    }).join(', ');
    
    throw new Error(`${context} validation failed: ${errors}`);
  }
  
  return result.right;
}

/**
 * Safely validate data, returns null if validation fails
 */
export function validateSafe<A, O, I>(
  codec: t.Type<A, O, I>,
  data: I
): A | null {
  const result = codec.decode(data);
  return result._tag === 'Right' ? result.right : null;
}
