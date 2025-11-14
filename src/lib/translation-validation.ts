/// <reference types="@cloudflare/workers-types" />
import { PrismaClient } from '../generated/prisma/';
import { getFileByComponents } from './r2-storage';
import crypto from 'crypto';

/**
 * Hash a string value for comparison
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
}

/**
 * Validate if a web translation is still valid against the current source
 */
export async function validateTranslation(
  bucket: R2Bucket,
  projectId: string,
  sourceLanguage: string,
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
  // Get current source file from R2
  const sourceFile = await getFileByComponents(
    bucket,
    projectId,
    sourceLanguage,
    translation.filename
  );

  if (!sourceFile) {
    return {
      isValid: false,
      reason: 'Source file not found',
    };
  }

  // Get current source value for this key
  const currentSourceValue = sourceFile.raw[translation.key];
  
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
 * Called after uploading new source files
 */
export async function invalidateOutdatedTranslations(
  prisma: PrismaClient,
  bucket: R2Bucket,
  projectId: string,
  sourceLanguage: string,
  filename: string
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

  for (const translation of translations) {
    const validation = await validateTranslation(
      bucket,
      projectId,
      sourceLanguage,
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
 */
export async function getValidationStatus(
  bucket: R2Bucket,
  projectId: string,
  sourceLanguage: string,
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
      bucket,
      projectId,
      sourceLanguage,
      translation
    );

    results.set(translation.id, {
      isValid: validation.isValid,
      reason: validation.reason,
    });
  }

  return results;
}
