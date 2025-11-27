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
// Translation Schemas
// ============================================================================

export const CreateTranslationSchema = v.object({
  language: v.pipe(v.string(), v.minLength(1, 'Language is required')),
  filename: v.pipe(v.string(), v.minLength(1, 'Filename is required')),
  key: v.pipe(v.string(), v.minLength(1, 'Key is required')),
  value: v.string(), // Empty values are allowed
});

export const ApproveTranslationSchema = v.object({
  status: v.picklist(['approved', 'rejected']),
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
export type CreateTranslation = v.InferOutput<typeof CreateTranslationSchema>;
export type ApproveTranslation = v.InferOutput<typeof ApproveTranslationSchema>;
export type MarkCommitted = v.InferOutput<typeof MarkCommittedSchema>;
