import { Octokit } from '@octokit/rest';
import { PrismaClient } from '../generated/prisma/';

/**
 * GitHub repository file fetching service
 * Replaces the upload-based flow with direct GitHub file access
 */

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
}

export interface FetchedTranslationFile {
  lang: string;
  filename: string;
  contents: Record<string, any>;
  sourceHash: string;
  commitSha: string;
}

/**
 * Get user's GitHub access token from database
 */
export async function getUserGitHubToken(
  prisma: PrismaClient,
  userId: string
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubAccessToken: true },
  });

  return user?.githubAccessToken || null;
}

/**
 * Fetch translation files from a GitHub repository
 */
export async function fetchTranslationFilesFromGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<GitHubFile[]> {
  const files: GitHubFile[] = [];

  try {
    // Get contents of the directory
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    // Handle both single file and directory
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      if (item.type === 'file' && item.path.endsWith('.json')) {
        // Fetch file content
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: item.path,
          ref: branch,
        });

        if ('content' in fileData && fileData.content) {
          // Decode base64 content
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          
          files.push({
            path: item.path,
            content,
            sha: fileData.sha,
          });
        }
      } else if (item.type === 'dir') {
        // Recursively fetch files from subdirectories
        const subFiles = await fetchTranslationFilesFromGitHub(
          octokit,
          owner,
          repo,
          item.path,
          branch
        );
        files.push(...subFiles);
      }
    }
  } catch (error: any) {
    console.error('Error fetching files from GitHub:', error.message);
    throw error;
  }

  return files;
}

/**
 * Parse language from file path
 * Supports patterns like locales/en/common.json or translations/ja-JP.json
 */
export function extractLanguageFromPath(filePath: string): string {
  // Try common patterns
  const patterns = [
    /\/locales\/([a-z]{2}(-[A-Z]{2})?)\//i,  // /locales/en/ or /locales/ja-JP/
    /\/translations\/([a-z]{2}(-[A-Z]{2})?)\//i,  // /translations/en/
    /\/([a-z]{2}(-[A-Z]{2})?)\.json$/i,  // /en.json or /ja-JP.json
    /\/([a-z]{2}(-[A-Z]{2})?)\//i,  // Generic /{lang}/
  ];

  for (const pattern of patterns) {
    const match = filePath.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return 'unknown';
}

/**
 * Calculate hash of content for validation
 */
export function calculateSourceHash(content: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Process translation files from GitHub
 */
export async function processGitHubTranslationFiles(
  files: GitHubFile[],
  commitSha: string
): Promise<FetchedTranslationFile[]> {
  const processed: FetchedTranslationFile[] = [];

  for (const file of files) {
    try {
      const contents = JSON.parse(file.content);
      const lang = extractLanguageFromPath(file.path);
      
      // Get just the filename without directory path
      const filename = file.path.split('/').pop() || file.path;
      
      processed.push({
        lang,
        filename,
        contents,
        sourceHash: calculateSourceHash(file.content),
        commitSha,
      });
    } catch (error: any) {
      console.error(`Error processing file ${file.path}:`, error.message);
    }
  }

  return processed;
}

/**
 * Get latest commit SHA for a branch
 */
export async function getLatestCommitSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<string> {
  const { data } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch,
  });

  return data.commit.sha;
}
