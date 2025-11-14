-- Add composite index for Translation table to optimize bulk queries
-- This index improves performance for queries filtering by projectId, language, and status
CREATE INDEX "Translation_projectId_language_status_idx" ON "Translation"("projectId", "language", "status");

