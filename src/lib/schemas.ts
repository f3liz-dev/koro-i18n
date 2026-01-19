/**
 * Validation schemas using valibot
 * 
 * Simpler and more intuitive than io-ts while being type-safe
 */
import * as v from 'valibot';
import { vValidator } from '@hono/valibot-validator';

// ============================================================================
// Project Schemas
// ============================================================================

export const CreateProjectSchema = v.object({
  name: v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]+$/, 'Invalid project name. Use only letters, numbers, underscores, and hyphens.')),
  repository: v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/, 'Invalid repository format. Use owner/repo format.')),
});

export const UpdateProjectSchema = v.object({
  accessControl: v.picklist(['whitelist', 'blacklist']),
});

export const ApproveMemberSchema = v.object({
  status: v.picklist(['approved', 'rejected']),
});

// ============================================================================
// Member Role Schemas (Crowdin-like 4-tier system)
// ============================================================================

export const UpdateMemberRoleSchema = v.object({
  role: v.picklist(['translator', 'proofreader', 'manager']),
  languages: v.optional(v.nullable(v.array(v.string()))), // null = all languages
});

export const InviteMemberSchema = v.object({
  username: v.pipe(v.string(), v.minLength(1, 'Username is required')),
  role: v.optional(v.picklist(['translator', 'proofreader', 'manager']), 'translator'),
  languages: v.optional(v.nullable(v.array(v.string()))),
});

// ============================================================================
// Translation Schemas
// ============================================================================

export const CreateTranslationSchema = v.object({
  language: v.pipe(v.string(), v.minLength(1, 'Language is required')),
  filename: v.pipe(v.string(), v.minLength(1, 'Filename is required')),
  key: v.pipe(v.string(), v.minLength(1, 'Key is required')),
  value: v.string(), // Empty values are allowed
});

// Updated to use draft/approved workflow
export const ApproveTranslationSchema = v.object({
  status: v.picklist(['draft', 'approved']),
});

// ============================================================================
// Source Key Schemas (for koro push/pull)
// ============================================================================

export const SourceKeyOperationSchema = v.object({
  op: v.picklist(['add', 'update', 'delete']),
  filename: v.pipe(v.string(), v.minLength(1)),
  key: v.pipe(v.string(), v.minLength(1)),
  value: v.optional(v.string()),
  hash: v.optional(v.string()),
});

export const SyncSourceKeysSchema = v.object({
  commitSha: v.optional(v.string()),
  operations: v.array(SourceKeyOperationSchema),
});

// For importing existing translations
export const ImportTranslationSchema = v.object({
  language: v.pipe(v.string(), v.minLength(1)),
  filename: v.pipe(v.string(), v.minLength(1)),
  key: v.pipe(v.string(), v.minLength(1)),
  value: v.string(),
  hash: v.optional(v.string()), // Source hash at time of translation
});

export const ImportTranslationsSchema = v.object({
  commitSha: v.optional(v.string()),
  translations: v.array(ImportTranslationSchema),
  autoApprove: v.optional(v.boolean(), false), // Auto-approve imported translations
});

// ============================================================================
// Apply Schemas
// ============================================================================

export const MarkCommittedSchema = v.object({
  translationIds: v.array(v.string()),
});

// ============================================================================
// Validation Middleware Factory
// ============================================================================

/**
 * Create a validation middleware for JSON body
 */
export function validateJson<T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(schema: T) {
  return vValidator('json', schema, (result, c) => {
    if (!result.success) {
      const issues = result.issues.map((i) => i.message);
      return c.json({ 
        success: false, 
        error: 'Validation Error', 
        details: issues 
      }, 400);
    }
  });
}

// ============================================================================
// Type Inference Helpers
// ============================================================================

export type CreateProject = v.InferOutput<typeof CreateProjectSchema>;
export type UpdateProject = v.InferOutput<typeof UpdateProjectSchema>;
export type ApproveMember = v.InferOutput<typeof ApproveMemberSchema>;
export type UpdateMemberRole = v.InferOutput<typeof UpdateMemberRoleSchema>;
export type InviteMember = v.InferOutput<typeof InviteMemberSchema>;
export type CreateTranslation = v.InferOutput<typeof CreateTranslationSchema>;
export type ApproveTranslation = v.InferOutput<typeof ApproveTranslationSchema>;
export type SourceKeyOperation = v.InferOutput<typeof SourceKeyOperationSchema>;
export type SyncSourceKeys = v.InferOutput<typeof SyncSourceKeysSchema>;
export type ImportTranslation = v.InferOutput<typeof ImportTranslationSchema>;
export type ImportTranslations = v.InferOutput<typeof ImportTranslationsSchema>;
export type MarkCommitted = v.InferOutput<typeof MarkCommittedSchema>;
