-- Migration: Add history tracking and structure mapping fields
-- Description: Adds fields for tracking git history, source content validation, and structure mapping

-- Add new fields to ProjectFile table for structure mapping and source validation
ALTER TABLE ProjectFile ADD COLUMN sourceHash TEXT;
ALTER TABLE ProjectFile ADD COLUMN structureMap TEXT;

-- Add new fields to TranslationHistory table for git commit tracking and source validation
ALTER TABLE TranslationHistory ADD COLUMN sourceContent TEXT;
ALTER TABLE TranslationHistory ADD COLUMN commitAuthor TEXT;
ALTER TABLE TranslationHistory ADD COLUMN commitEmail TEXT;
