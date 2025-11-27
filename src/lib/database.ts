import { PrismaClient } from '../generated/prisma/';
import { PrismaD1 } from '@prisma/adapter-d1';

export function initializePrisma(database: D1Database): PrismaClient {
  const adapter = new PrismaD1(database);
  return new PrismaClient({ adapter });
}

export async function logTranslationHistory(
  prisma: PrismaClient,
  translationId: string,
  projectId: string,
  language: string,
  filename: string,
  key: string,
  value: string,
  userId: string,
  action: string,
  sourceHash?: string
) {
  await prisma.webTranslationHistory.create({
    data: {
      id: crypto.randomUUID(),
      translationId,
      projectId,
      language,
      filename,
      key,
      value,
      userId,
      action,
      sourceHash: sourceHash || null,
    },
  });
}

export async function checkProjectAccess(
  prisma: PrismaClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ found: number }>>`
    SELECT 1 as found FROM ProjectMember 
    WHERE projectId = ${projectId} AND userId = ${userId} AND status = 'approved'
    UNION
    SELECT 1 as found FROM Project WHERE id = ${projectId} AND userId = ${userId}
    LIMIT 1
  `;
  return result.length > 0;
}

export interface ProjectWithAccess {
  id: string;
  userId: string;
  name: string;
  repository: string;
  sourceLanguage: string;
  hasAccess: boolean;
}

/**
 * Fetch a project by name and check if the user has access in a single query.
 * This is more efficient than running two separate queries.
 * 
 * @returns The project with access status, or null if project not found
 */
export async function findProjectWithAccessCheck(
  prisma: PrismaClient,
  projectName: string,
  userId: string
): Promise<ProjectWithAccess | null> {
  const result = await prisma.$queryRaw<Array<{
    id: string;
    userId: string;
    name: string;
    repository: string;
    sourceLanguage: string;
    hasAccess: number;
  }>>`
    SELECT 
      p.id,
      p.userId,
      p.name,
      p.repository,
      p.sourceLanguage,
      CASE 
        WHEN p.userId = ${userId} THEN 1
        WHEN EXISTS (
          SELECT 1 FROM ProjectMember pm 
          WHERE pm.projectId = p.id AND pm.userId = ${userId} AND pm.status = 'approved'
        ) THEN 1
        ELSE 0
      END as hasAccess
    FROM Project p
    WHERE p.name = ${projectName}
    LIMIT 1
  `;
  
  if (result.length === 0) {
    return null;
  }
  
  const row = result[0];
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    repository: row.repository,
    sourceLanguage: row.sourceLanguage,
    hasAccess: row.hasAccess === 1,
  };
}

/**
 * Resolve a project identifier (name or id) to the repository ID used as the
 * internal project identifier stored in R2/D1 indices.
 *
 * If `projectIdOrName` matches a Project.name, the project's repository value
 * is returned. Otherwise the original `projectIdOrName` is returned so callers
 * can continue to operate with either form.
 */
export async function resolveActualProjectId(prisma: PrismaClient, projectIdOrName: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { name: projectIdOrName },
    select: { repository: true },
  });
  return project ? project.repository : projectIdOrName;
}

export function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = String(value);
    }
  }
  return result;
}

/**
 * Check if a user can moderate translations for a project in a single query.
 * Combines owner check and member role check into one database call.
 * 
 * This uses Prisma's parameterized template literals which are safe from SQL injection.
 * See: https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#tagged-template-helpers
 * 
 * A user can moderate if they are:
 * - The project owner, OR
 * - An approved member with a role other than 'viewer'
 * 
 * @returns true if the user can moderate, false if project doesn't exist or user lacks permission
 */
export async function checkModerationAccess(
  prisma: PrismaClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ canModerate: number }>>`
    SELECT 
      CASE 
        WHEN p.userId = ${userId} THEN 1
        WHEN EXISTS (
          SELECT 1 FROM ProjectMember pm 
          WHERE pm.projectId = ${projectId} 
            AND pm.userId = ${userId} 
            AND pm.status = 'approved'
            AND pm.role != 'viewer'
        ) THEN 1
        ELSE 0
      END as canModerate
    FROM Project p
    WHERE p.id = ${projectId}
    LIMIT 1
  `;
  
  // Returns false if project doesn't exist or user has no access
  // This matches the original behavior of userCanModerateTranslation
  if (result.length === 0) {
    return false;
  }
  
  return result[0].canModerate === 1;
}
