/// <reference types="@cloudflare/workers-types" />
import { PrismaClient } from '../generated/prisma/';
import * as crypto from 'crypto';
import { Octokit } from '@octokit/rest';
import { fetchSingleFileFromGitHub, getUserGitHubToken } from './github-repo-fetcher';
import type { FetchedTranslationFile } from './github-repo-fetcher';

/**
 * Hash a string value for comparison
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
}

/**
 * Validate if a web translation is still valid against the current source
 * Now fetches source from GitHub instead of R2
 */
export async function validateTranslation(
  sourceFile: FetchedTranslationFile | null,
  translation: {
    language: string;
    filename: string;
    key: string;
    sourceHash?: string | null;
  }
): Promise<{
  isValid: boolean;
  reason?: string;
  currentSourceHash?: string;
}> {
  if (!sourceFile) {
    return {
      isValid: false,
      reason: 'Source file not found',
    };
  }

  // Get current source value for this key
  const currentSourceValue = sourceFile.contents[translation.key];
  
  if (currentSourceValue === undefined) {
    return {
      isValid: false,
      reason: 'Key no longer exists in source',
    };
  }

  // Get source hash for this key from metadata
  const currentSourceHash = sourceFile.metadata.sourceHashes?.[translation.key] 
    || hashValue(String(currentSourceValue));

  // If translation has no source tracking, it's considered invalid
  if (!translation.sourceHash) {
    return {
      isValid: false,
      reason: 'Translation missing source tracking',
      currentSourceHash,
    };
  }

  // Compare source hash
  if (translation.sourceHash !== currentSourceHash) {
    return {
      isValid: false,
      reason: 'Source value changed',
      currentSourceHash,
    };
  }

  return {
    isValid: true,
    currentSourceHash,
  };
}

/**
 * Invalidate web translations when source changes
 * Called when source files are updated
 * Now fetches source from GitHub instead of R2
 * 
 * OPTIMIZED: Uses Rust worker for batch validation when available
 */
export async function invalidateOutdatedTranslations(
  prisma: PrismaClient,
  projectId: string,
  projectRepository: string,
  sourceLanguage: string,
  filename: string,
  userId: string,
  rustWorker?: any // RustComputeWorker instance (optional)
): Promise<{
  invalidated: number;
  checked: number;
}> {
  // Get all web translations for this file
  const translations = await prisma.webTranslation.findMany({
    where: {
      projectId,
      filename,
      status: 'approved',
      isValid: true, // Only check currently valid translations
    },
  });

  let invalidated = 0;
  const checked = translations.length;

  if (checked === 0) {
    return { invalidated: 0, checked: 0 };
  }

  // Get source file from GitHub
  const githubToken = await getUserGitHubToken(prisma, userId);
  if (!githubToken) {
    console.warn(`[invalidate] No GitHub token for user ${userId}`);
    return { invalidated: 0, checked };
  }

  const parts = projectRepository.trim().split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    console.warn(`[invalidate] Invalid repository format: ${projectRepository}`);
    return { invalidated: 0, checked };
  }
  const [owner, repo] = parts;
  const octokit = new Octokit({ auth: githubToken });

  const sourceFile = await fetchSingleFileFromGitHub(
    octokit,
    owner,
    repo,
    sourceLanguage,
    filename,
    'main'
  );

  if (!sourceFile) {
    console.warn(`[invalidate] Source file not found: ${projectRepository}/${sourceLanguage}/${filename}`);
    return { invalidated: 0, checked };
  }

  // Try using Rust worker for batch validation (much faster)
  if (rustWorker && checked > 5) {
    try {
      const translationsToValidate = translations.map(t => ({
        id: t.id,
        key: t.key,
        source_hash: t.sourceHash,
      }));

      const validationResults = await rustWorker.batchValidate(
        translationsToValidate,
        sourceFile.metadata.sourceHashes || {}
      );

      // Process results in batch
      for (const result of validationResults) {
        if (!result.is_valid) {
          const translation = translations.find(t => t.id === result.id);
          if (!translation) continue;

          // Mark as invalid
          await prisma.webTranslation.update({
            where: { id: translation.id },
            data: { isValid: false },
          });

          // Log to history
          await prisma.webTranslationHistory.create({
            data: {
              id: crypto.randomUUID(),
              translationId: translation.id,
              projectId: translation.projectId,
              language: translation.language,
              filename: translation.filename,
              key: translation.key,
              value: translation.value,
              userId: translation.userId,
              action: 'invalidated',
              sourceHash: sourceFile.metadata.sourceHashes?.[translation.key],
            },
          });

          invalidated++;
        }
      }

      return { invalidated, checked };
    } catch (error) {
      console.warn('[invalidate] Rust worker failed, falling back to sequential validation:', error);
    }
  }

  // Fallback: Sequential validation (original implementation)
  for (const translation of translations) {
    const validation = await validateTranslation(
      sourceFile,
      translation
    );

    if (!validation.isValid) {
      // Mark as invalid
      await prisma.webTranslation.update({
        where: { id: translation.id },
        data: { isValid: false },
      });

      // Log to history
      await prisma.webTranslationHistory.create({
        data: {
          id: crypto.randomUUID(),
          translationId: translation.id,
          projectId: translation.projectId,
          language: translation.language,
          filename: translation.filename,
          key: translation.key,
          value: translation.value,
          userId: translation.userId,
          action: 'invalidated',
          sourceHash: validation.currentSourceHash,
        },
      });

      invalidated++;
    }
  }

  return { invalidated, checked };
}

/**
 * Get validation status for multiple translations
 * Now requires source file to be passed in (should be fetched from GitHub)
 */
export async function getValidationStatus(
  sourceFile: FetchedTranslationFile | null,
  translations: Array<{
    id: string;
    language: string;
    filename: string;
    key: string;
    sourceHash?: string | null;
  }>
): Promise<Map<string, { isValid: boolean; reason?: string }>> {
  const results = new Map<string, { isValid: boolean; reason?: string }>();

  for (const translation of translations) {
    const validation = await validateTranslation(
      sourceFile,
      translation
    );

    results.set(translation.id, {
      isValid: validation.isValid,
      reason: validation.reason,
    });
  }

  return results;
}
