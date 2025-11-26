import { Octokit } from '@octokit/rest';
import { PrismaClient } from '../generated/prisma/';
import { getUserGitHubToken } from './github-repo-fetcher';

/**
 * Service for creating Pull Requests to apply translations
 * 
 * This implements the "Apply Translation" flow:
 * 1. Get approved translations from D1
 * 2. Fetch current file content from GitHub
 * 3. Apply translations to the files
 * 4. Create a new branch and commit changes
 * 5. Create a Pull Request
 * 6. Mark translations as "committed"
 */

export interface ApplyTranslationResult {
  success: boolean;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  branch?: string;
  filesUpdated: number;
  translationsApplied: number;
  error?: string;
}

export interface TranslationToApply {
  id: string;
  language: string;
  filename: string;
  key: string;
  value: string;
}

/**
 * Group translations by language and filename for batch processing
 */
function groupTranslations(translations: TranslationToApply[]): Map<string, Map<string, TranslationToApply[]>> {
  // Map<language, Map<filename, translations[]>>
  const grouped = new Map<string, Map<string, TranslationToApply[]>>();

  for (const t of translations) {
    if (!grouped.has(t.language)) {
      grouped.set(t.language, new Map());
    }
    const langGroup = grouped.get(t.language)!;
    
    if (!langGroup.has(t.filename)) {
      langGroup.set(t.filename, []);
    }
    langGroup.get(t.filename)!.push(t);
  }

  return grouped;
}

/**
 * Apply translation keys to a JSON object
 * Supports both flat keys and nested dot notation keys
 */
function applyTranslationsToContent(
  content: Record<string, unknown>,
  translations: TranslationToApply[]
): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(content)); // Deep clone

  for (const t of translations) {
    const keyParts = t.key.split('.');
    let current: Record<string, unknown> = result;

    // Navigate to the parent of the final key
    for (let i = 0; i < keyParts.length - 1; i++) {
      const part = keyParts[i];
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    // Set the value
    current[keyParts[keyParts.length - 1]] = t.value;
  }

  return result;
}

/**
 * Get the file path in the repository for a given language and filename
 * This assumes the manifest structure: sourceFilename contains the full path
 */
async function getFilePath(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  language: string,
  filename: string
): Promise<string | null> {
  try {
    // Try to fetch the manifest to get the correct file path
    const manifestPath = '.koro-i18n/koro-i18n.repo.generated.json';
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: manifestPath,
      ref: branch,
    });

    if (!('content' in data)) {
      return null;
    }

    const manifestContent = Buffer.from(data.content, 'base64').toString('utf-8');
    const manifest = JSON.parse(manifestContent);

    // Find the file entry matching language and filename
    const fileEntry = manifest.files?.find((f: { language: string; filename: string }) => 
      f.language === language && f.filename === filename
    );

    return fileEntry?.sourceFilename || null;
  } catch {
    // Fallback: try to construct the path from language and filename
    // Common patterns: locales/{lang}/{filename} or translations/{lang}/{filename}
    return null;
  }
}

/**
 * Fetch file content from GitHub
 */
async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<{ content: Record<string, unknown>; sha: string } | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (!('content' in data) || !('sha' in data)) {
      return null;
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return {
      content: JSON.parse(content),
      sha: data.sha,
    };
  } catch {
    return null;
  }
}

/**
 * Create or update a file in a branch
 */
async function updateFileInBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: Record<string, unknown>,
  message: string,
  originalSha?: string
): Promise<boolean> {
  try {
    const contentBase64 = Buffer.from(
      JSON.stringify(content, null, 2) + '\n',
      'utf-8'
    ).toString('base64');

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: contentBase64,
      branch,
      sha: originalSha,
    });

    return true;
  } catch (error) {
    console.error(`Failed to update file ${path}:`, error);
    return false;
  }
}

/**
 * Create a new branch from the base branch
 */
async function createBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  newBranchName: string,
  baseBranch: string
): Promise<boolean> {
  try {
    // Get the SHA of the base branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });

    // Create new branch
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranchName}`,
      sha: ref.object.sha,
    });

    return true;
  } catch (error) {
    console.error(`Failed to create branch ${newBranchName}:`, error);
    return false;
  }
}

/**
 * Create a Pull Request
 */
async function createPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string
): Promise<{ url: string; number: number } | null> {
  try {
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
    });

    return {
      url: pr.html_url,
      number: pr.number,
    };
  } catch (error) {
    console.error('Failed to create PR:', error);
    return null;
  }
}

/**
 * Apply approved translations and create a Pull Request
 * 
 * @param prisma - Prisma client
 * @param userId - User ID making the request
 * @param projectId - Project ID
 * @param baseBranch - Base branch to create PR against (default: main)
 * @returns Result of the apply operation
 */
export async function applyTranslationsAndCreatePR(
  prisma: PrismaClient,
  userId: string,
  projectId: string,
  baseBranch: string = 'main'
): Promise<ApplyTranslationResult> {
  // Get the project details
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { repository: true, userId: true, name: true },
  });

  if (!project) {
    return { success: false, filesUpdated: 0, translationsApplied: 0, error: 'Project not found' };
  }

  // Get user's GitHub token
  const githubToken = await getUserGitHubToken(prisma, userId);
  if (!githubToken) {
    return { 
      success: false, 
      filesUpdated: 0, 
      translationsApplied: 0, 
      error: 'GitHub access token not found. Please re-authenticate with GitHub.' 
    };
  }

  // Get approved translations for this project
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

  if (translations.length === 0) {
    return { success: false, filesUpdated: 0, translationsApplied: 0, error: 'No approved translations to apply' };
  }

  // Parse repository
  const [owner, repo] = project.repository.split('/');
  if (!owner || !repo) {
    return { success: false, filesUpdated: 0, translationsApplied: 0, error: 'Invalid repository format' };
  }

  const octokit = new Octokit({ auth: githubToken });

  // Generate unique branch name
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const newBranchName = `koro-i18n/translations-${timestamp}`;

  // Create new branch
  const branchCreated = await createBranch(octokit, owner, repo, newBranchName, baseBranch);
  if (!branchCreated) {
    return { success: false, filesUpdated: 0, translationsApplied: 0, error: 'Failed to create branch' };
  }

  // Group translations by language and filename
  const groupedTranslations = groupTranslations(translations);

  let filesUpdated = 0;
  const appliedTranslationIds: string[] = [];

  // Process each file
  for (const [language, files] of groupedTranslations.entries()) {
    for (const [filename, fileTranslations] of files.entries()) {
      // Get the file path from manifest
      const filePath = await getFilePath(octokit, owner, repo, baseBranch, language, filename);
      if (!filePath) {
        console.warn(`Could not find file path for ${language}/${filename}, skipping`);
        continue;
      }

      // Fetch current content
      const currentFile = await getFileContent(octokit, owner, repo, filePath, newBranchName);
      if (!currentFile) {
        console.warn(`Could not fetch content for ${filePath}, skipping`);
        continue;
      }

      // Apply translations
      const updatedContent = applyTranslationsToContent(currentFile.content, fileTranslations);

      // Commit the changes
      const commitMessage = `chore(i18n): update ${language}/${filename} translations

Applied ${fileTranslations.length} translation(s) from koro-i18n platform.`;

      const updated = await updateFileInBranch(
        octokit,
        owner,
        repo,
        newBranchName,
        filePath,
        updatedContent,
        commitMessage,
        currentFile.sha
      );

      if (updated) {
        filesUpdated++;
        appliedTranslationIds.push(...fileTranslations.map(t => t.id));
      }
    }
  }

  if (filesUpdated === 0) {
    return { success: false, filesUpdated: 0, translationsApplied: 0, error: 'No files were updated' };
  }

  // Create Pull Request
  const prTitle = `[koro-i18n] Apply ${appliedTranslationIds.length} translation(s)`;
  const prBody = `## Translation Update from koro-i18n

This PR was automatically generated by the koro-i18n platform.

### Summary
- **Files updated:** ${filesUpdated}
- **Translations applied:** ${appliedTranslationIds.length}
- **Languages:** ${[...groupedTranslations.keys()].join(', ')}

### What's Changed
Approved translations have been applied to the translation files.

---
*This PR was created by [koro-i18n](https://github.com/f3liz-dev/koro-i18n)*`;

  const pr = await createPullRequest(
    octokit,
    owner,
    repo,
    prTitle,
    prBody,
    newBranchName,
    baseBranch
  );

  if (!pr) {
    return { 
      success: false, 
      filesUpdated, 
      translationsApplied: appliedTranslationIds.length, 
      error: 'Failed to create Pull Request',
      branch: newBranchName,
    };
  }

  // Mark translations as committed
  await prisma.webTranslation.updateMany({
    where: {
      id: { in: appliedTranslationIds },
    },
    data: {
      status: 'committed',
    },
  });

  // Log history for each applied translation
  for (const id of appliedTranslationIds) {
    const t = translations.find(tr => tr.id === id);
    if (t) {
      await prisma.webTranslationHistory.create({
        data: {
          id: crypto.randomUUID(),
          translationId: id,
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
  }

  return {
    success: true,
    pullRequestUrl: pr.url,
    pullRequestNumber: pr.number,
    branch: newBranchName,
    filesUpdated,
    translationsApplied: appliedTranslationIds.length,
  };
}

/**
 * Get the diff of approved translations that would be applied
 * This is useful for previewing what changes will be made
 */
export async function getTranslationsDiff(
  prisma: PrismaClient,
  projectId: string
): Promise<{
  translations: TranslationToApply[];
  byLanguage: Record<string, number>;
  byFile: Record<string, number>;
  total: number;
}> {
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
