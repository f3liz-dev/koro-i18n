import { PrismaClient } from '../generated/prisma/';

/**
 * Service for exporting translation diffs
 * 
 * This implements the "Apply Translation" flow where:
 * 1. The API exports approved translations as a diff
 * 2. A GitHub Action in the client repository fetches the diff
 * 3. The GitHub Action creates the PR (with proper write permissions)
 * 
 * Important: The koro-i18n server is a DIFF MANAGEMENT system.
 * - GitHub repository: Source of truth (contains original + translated resources)
 * - Koro-i18n database: Only stores DIFFS (user-submitted translation suggestions)
 * - Translation percentage: Should reflect GitHub repository status + pending diffs
 * 
 * Note: We don't create PRs directly because the OAuth token from GitHub login
 * has read-only scope and cannot write to user repositories.
 */

export interface TranslationToApply {
  id: string;
  language: string;
  filename: string;
  key: string;
  value: string;
}

export interface TranslationDiff {
  translations: TranslationToApply[];
  byLanguage: Record<string, number>;
  byFile: Record<string, number>;
  total: number;
}

export interface TranslationExport {
  projectId: string;
  projectName: string;
  repository: string;
  exportedAt: string;
  translations: TranslationToApply[];
  summary: {
    total: number;
    byLanguage: Record<string, number>;
    byFile: Record<string, number>;
  };
}

/**
 * Get the diff of approved translations that would be applied
 * This is used for previewing what changes will be made
 */
export async function getTranslationsDiff(
  prisma: PrismaClient,
  projectId: string
): Promise<TranslationDiff> {
  const translations = await prisma.webTranslation.findMany({
    where: {
      projectId,
      status: 'approved',
    },
    select: {
      id: true,
      language: true,
      filename: true,
      key: true,
      value: true,
    },
  });

  const byLanguage: Record<string, number> = {};
  const byFile: Record<string, number> = {};

  for (const t of translations) {
    byLanguage[t.language] = (byLanguage[t.language] || 0) + 1;
    const fileKey = `${t.language}/${t.filename}`;
    byFile[fileKey] = (byFile[fileKey] || 0) + 1;
  }

  return {
    translations,
    byLanguage,
    byFile,
    total: translations.length,
  };
}

/**
 * Export approved translations for a project
 * This data can be used by the client repository's GitHub Action to create a PR
 */
export async function exportApprovedTranslations(
  prisma: PrismaClient,
  projectId: string
): Promise<TranslationExport | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, repository: true },
  });

  if (!project) {
    return null;
  }

  const diff = await getTranslationsDiff(prisma, projectId);

  return {
    projectId: project.id,
    projectName: project.name,
    repository: project.repository,
    exportedAt: new Date().toISOString(),
    translations: diff.translations,
    summary: {
      total: diff.total,
      byLanguage: diff.byLanguage,
      byFile: diff.byFile,
    },
  };
}

/**
 * Mark translations as committed after they have been applied
 * This should be called by the client repository's GitHub Action after the PR is created
 */
export async function markTranslationsAsCommitted(
  prisma: PrismaClient,
  projectId: string,
  translationIds: string[],
  userId: string
): Promise<{ success: boolean; count: number }> {
  // Verify translations belong to this project
  const translations = await prisma.webTranslation.findMany({
    where: {
      id: { in: translationIds },
      projectId,
      status: 'approved',
    },
    select: {
      id: true,
      language: true,
      filename: true,
      key: true,
      value: true,
    },
  });

  if (translations.length === 0) {
    return { success: false, count: 0 };
  }

  // Update status to committed
  await prisma.webTranslation.updateMany({
    where: {
      id: { in: translations.map(t => t.id) },
    },
    data: {
      status: 'committed',
    },
  });

  // Log history for each translation
  for (const t of translations) {
    await prisma.webTranslationHistory.create({
      data: {
        id: crypto.randomUUID(),
        translationId: t.id,
        projectId,
        language: t.language,
        filename: t.filename,
        key: t.key,
        value: t.value,
        userId,
        action: 'committed',
      },
    });
  }

  return { success: true, count: translations.length };
}
