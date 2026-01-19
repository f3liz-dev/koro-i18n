-- koro-i18n Database Migration
-- Migration: Add SourceKey table, update ProjectMember roles, update WebTranslation workflow
-- Date: 2026-01-19

-- ============================================================================
-- New Table: SourceKey
-- ============================================================================

CREATE TABLE IF NOT EXISTS SourceKey (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT NOT NULL,
  filename TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  hash TEXT NOT NULL,
  context TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Unique constraint: one key per file per project
CREATE UNIQUE INDEX IF NOT EXISTS SourceKey_projectId_filename_key_key 
  ON SourceKey(projectId, filename, key);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS SourceKey_projectId_idx ON SourceKey(projectId);
CREATE INDEX IF NOT EXISTS SourceKey_projectId_filename_idx ON SourceKey(projectId, filename);
CREATE INDEX IF NOT EXISTS SourceKey_hash_idx ON SourceKey(hash);

-- ============================================================================
-- Update ProjectMember: Add languages column for language-specific permissions
-- ============================================================================

-- Add languages column (JSON array or null for all)
ALTER TABLE ProjectMember ADD COLUMN languages TEXT;

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS ProjectMember_projectId_role_idx ON ProjectMember(projectId, role);

-- Update existing roles: 'member' -> 'translator'
UPDATE ProjectMember SET role = 'translator' WHERE role = 'member';

-- ============================================================================
-- Update WebTranslation: Add approval tracking and new status workflow
-- ============================================================================

-- Add approval tracking columns
ALTER TABLE WebTranslation ADD COLUMN approvedById TEXT;
ALTER TABLE WebTranslation ADD COLUMN approvedAt DATETIME;

-- Create unique constraint for one translation per key per language
-- This may fail if duplicates exist - handle manually if needed
CREATE UNIQUE INDEX IF NOT EXISTS WebTranslation_projectId_language_filename_key_key 
  ON WebTranslation(projectId, language, filename, key);

-- Migrate status values: 'pending' -> 'draft'
UPDATE WebTranslation SET status = 'draft' WHERE status = 'pending';

-- Keep 'approved' as is (already matches new workflow)
-- Remove 'rejected' and 'deleted' by setting to 'draft' (can re-process later)
UPDATE WebTranslation SET status = 'draft' WHERE status IN ('rejected', 'deleted');

-- ============================================================================
-- Data Integrity Notes
-- ============================================================================
-- 
-- 1. The approvedById column references User.id but we don't add a foreign key
--    constraint here because D1/SQLite doesn't support ALTER TABLE ADD CONSTRAINT.
--    The Prisma schema enforces the relation at the application level.
--
-- 2. The 'languages' column in ProjectMember stores a JSON array of language codes
--    e.g., '["ja", "ko", "zh-CN"]' or NULL for all languages.
--
-- 3. Role values are: 'owner', 'manager', 'proofreader', 'translator'
--    The owner role is automatically assigned to the project creator.
--
-- 4. Status values are now: 'draft', 'approved' (simplified from pending/approved/rejected/deleted)
