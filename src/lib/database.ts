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
