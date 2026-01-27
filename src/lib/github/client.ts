/**
 * GitHub Client
 * 
 * Simplified wrapper around Octokit for common operations
 */

import { Octokit } from '@octokit/rest';
import { PrismaClient } from '../../generated/prisma/';

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
 * Create an authenticated Octokit instance
 */
export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

/**
 * Parse GitHub repository string into owner and repo
 */
export function parseRepository(repository: string): { owner: string; repo: string } {
  const parts = repository.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid repository format: ${repository}. Expected format: owner/repo`);
  }
  return { owner: parts[0], repo: parts[1] };
}

/**
 * Check if a file exists in a GitHub repository
 */
export async function fileExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<boolean> {
  try {
    await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Get file SHA from GitHub
 */
export async function getFileSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if ('sha' in data) {
      return data.sha;
    }
    return null;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}
