import { PrismaClient } from '../generated/prisma/';

export async function userCanModerateTranslation(prisma: PrismaClient, projectId: string, user: any) {
  // Owners always have moderation permissions
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return false;
  if (project.userId === user.userId) return true;

  // Check if user is an approved member with a role other than 'viewer'
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.userId } },
  });
  if (!member) return false;
  if (member.status !== 'approved') return false;
  return member.role !== 'viewer';
}

export async function ensureUserCanModerateTranslation(prisma: PrismaClient, projectId: string, user: any) {
  const ok = await userCanModerateTranslation(prisma, projectId, user);
  if (!ok) throw new Error('Forbidden');
}
