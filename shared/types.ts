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
// R2 Metadata
// ============================================================================

export const R2Metadata = t.type({
  gitBlame: t.record(t.string, GitBlameInfo),
  charRanges: t.record(t.string, CharRange),
  sourceHashes: t.record(t.string, t.string),
});
export type R2Metadata = t.TypeOf<typeof R2Metadata>;

// ============================================================================
// R2 File Data
// ============================================================================

export const R2FileData = t.type({
  raw: t.record(t.string, t.any),
  metadata: R2Metadata,
  sourceHash: t.string,
  commitSha: t.string,
  uploadedAt: t.string,
});
export type R2FileData = t.TypeOf<typeof R2FileData>;

// ============================================================================
// Upload Payload
// ============================================================================

export const UploadFile = t.type({
  lang: t.string,
  filename: t.string,
  contents: t.record(t.string, t.any),
  metadata: t.string, // Base64-encoded MessagePack
  sourceHash: t.string,
});
export type UploadFile = t.TypeOf<typeof UploadFile>;

export const UploadPayload = t.type({
  branch: t.string,
  commitSha: t.string,
  sourceLanguage: t.string,
  files: t.array(UploadFile),
});
export type UploadPayload = t.TypeOf<typeof UploadPayload>;

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

export const R2FileResponse = t.type({
  contents: t.record(t.string, t.string),
  metadata: R2Metadata,
  sourceHash: t.string,
  commitSha: t.string,
  uploadedAt: t.string,
  totalKeys: t.union([t.number, t.undefined]),
});
export type R2FileResponse = t.TypeOf<typeof R2FileResponse>;

export const WebTranslationsResponse = t.type({
  translations: t.array(WebTranslation),
});
export type WebTranslationsResponse = t.TypeOf<typeof WebTranslationsResponse>;

export const UploadResponse = t.type({
  success: t.boolean,
  projectId: t.string,
  commitSha: t.string,
  filesUploaded: t.number,
  r2Keys: t.array(t.string),
  uploadedAt: t.string,
  invalidationResults: t.union([t.record(t.string, t.any), t.undefined]),
});
export type UploadResponse = t.TypeOf<typeof UploadResponse>;

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
