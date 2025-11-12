-- Migration: Add sourceLanguage field to projects table
-- This field stores the source language for the project (default: 'en')

-- Add sourceLanguage column with default value
ALTER TABLE projects ADD COLUMN sourceLanguage TEXT DEFAULT 'en' NOT NULL;
