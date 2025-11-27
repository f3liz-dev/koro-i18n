import { PrismaClient } from '../generated/prisma/';
import { checkModerationAccess } from './database';

/**
 * Check if a user can moderate translations for a project.
 * Optimized to use a single database query instead of multiple queries.
 * 
 * A user can moderate if they are:
 * - The project owner, OR
 * - An approved member with a role other than 'viewer'
 * 
 * @param prisma - The Prisma client
 * @param projectId - The project ID to check
 * @param user - The user object (must have userId property)
 * @returns true if the user can moderate, false otherwise
 */
export async function userCanModerateTranslation(prisma: PrismaClient, projectId: string, user: any): Promise<boolean> {
  return checkModerationAccess(prisma, projectId, user.userId);
}

export async function ensureUserCanModerateTranslation(prisma: PrismaClient, projectId: string, user: any): Promise<void> {
  const ok = await userCanModerateTranslation(prisma, projectId, user);
  if (!ok) throw new Error('Forbidden');
}
