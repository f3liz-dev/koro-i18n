/**
 * Translation Progress Summary - Pure Functions
 * 
 * DOP Pattern: Data transformation without side effects
 */

import type { ManifestFileEntry } from './github/types';

// ============================================================================
// Data Structures
// ============================================================================

export interface FileSummary {
  filename: string;
  totalKeys: number;
  translatedKeys: number;
  progress: number; // 0-100
}

export interface LanguageSummary {
  language: string;
  files: FileSummary[];
  totalKeys: number;
  translatedKeys: number;
  progress: number; // 0-100
}

export interface ProjectSummary {
  sourceLanguage: string;
  languages: LanguageSummary[];
  totalFiles: number;
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Match progress filepath to manifest filename
 * 
 * Progress uses pattern: "locales/<lang>/common.json"
 * Manifest uses: "common.json"
 */
function matchesFilename(progressFilepath: string, manifestFilename: string): boolean {
  const progressBasename = progressFilepath.split('/').pop() || '';
  
  return (
    progressBasename === manifestFilename ||
    progressFilepath.endsWith(`/${manifestFilename}`) ||
    progressFilepath === manifestFilename
  );
}

/**
 * Find translated keys count for a file
 */
function findTranslatedCount(
  progressData: Record<string, string[]>,
  filename: string
): number {
  const matches = Object.entries(progressData)
    .filter(([filepath]) => matchesFilename(filepath, filename));

  if (matches.length === 0) return 0;
  
  if (matches.length > 1) {
    console.warn(`Multiple progress entries matched ${filename}: ${matches.map(m => m[0]).join(', ')}`);
  }

  return matches[0][1].length;
}

/**
 * Calculate file summary
 */
function calculateFileSummary(
  entry: ManifestFileEntry,
  progressData: Record<string, string[]> | null
): FileSummary {
  const totalKeys = entry.totalKeys || 0;
  const translatedKeys = progressData ? findTranslatedCount(progressData, entry.filename) : 0;
  const progress = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;

  return {
    filename: entry.filename,
    totalKeys,
    translatedKeys,
    progress,
  };
}

/**
 * Calculate language summary
 */
export function calculateLanguageSummary(
  language: string,
  entries: ManifestFileEntry[],
  progressData: Record<string, string[]> | null
): LanguageSummary {
  const files = entries.map(entry => calculateFileSummary(entry, progressData));

  const totalKeys = files.reduce((sum, f) => sum + f.totalKeys, 0);
  const translatedKeys = files.reduce((sum, f) => sum + f.translatedKeys, 0);
  const progress = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;

  return {
    language,
    files,
    totalKeys,
    translatedKeys,
    progress,
  };
}

/**
 * Group manifest entries by language
 */
export function groupByLanguage(
  entries: ManifestFileEntry[]
): Map<string, ManifestFileEntry[]> {
  const groups = new Map<string, ManifestFileEntry[]>();

  for (const entry of entries) {
    const existing = groups.get(entry.language) || [];
    existing.push(entry);
    groups.set(entry.language, existing);
  }

  return groups;
}

/**
 * Build complete project summary
 */
export function buildProjectSummary(
  sourceLanguage: string,
  manifestEntries: ManifestFileEntry[],
  progressByLanguage: Map<string, Record<string, string[]> | null>
): ProjectSummary {
  const grouped = groupByLanguage(manifestEntries);
  const languages: LanguageSummary[] = [];

  for (const [lang, entries] of grouped) {
    if (lang === sourceLanguage) continue; // Skip source language
    
    const progressData = progressByLanguage.get(lang) || null;
    const summary = calculateLanguageSummary(lang, entries, progressData);
    languages.push(summary);
  }

  // Sort by language code
  languages.sort((a, b) => a.language.localeCompare(b.language));

  return {
    sourceLanguage,
    languages,
    totalFiles: manifestEntries.length,
  };
}
