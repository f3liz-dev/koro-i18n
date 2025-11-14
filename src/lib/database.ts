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
  key: string,
  value: string,
  userId: string,
  action: string,
  commitSha?: string,
  sourceContent?: string,
  commitAuthor?: string,
  commitEmail?: string
) {
  await prisma.translationHistory.create({
    data: {
      id: crypto.randomUUID(),
      translationId,
      projectId,
      language,
      key,
      value,
      userId,
      action,
      commitSha: commitSha || null,
      sourceContent: sourceContent || null,
      commitAuthor: commitAuthor || null,
      commitEmail: commitEmail || null,
    },
  });
}

export async function checkProjectAccess(
  prisma: PrismaClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ exists: number }>>`
    SELECT 1 as exists FROM ProjectMember 
    WHERE projectId = ${projectId} AND userId = ${userId} AND status = 'approved'
    UNION
    SELECT 1 as exists FROM Project WHERE id = ${projectId} AND userId = ${userId}
    LIMIT 1
  `;
  return result.length > 0;
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
