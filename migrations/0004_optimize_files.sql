-- Drop ProjectFile table (no longer needed)
DROP TABLE IF EXISTS "ProjectFile";

-- Add optimized index for translation counts
CREATE INDEX "WebTranslation_projectId_language_status_isValid_idx" ON "WebTranslation"("projectId", "language", "status", "isValid");
