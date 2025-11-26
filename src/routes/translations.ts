import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import * as t from 'io-ts';
import { authMiddleware } from '../lib/auth';
import { validate } from '../lib/validator';

interface Env {
  JWT_SECRET: string;
  ENVIRONMENT: string;
  ALLOWED_PROJECT_CREATORS?: string;
  Variables: {
    user: any;
  };
}

const ApproveTranslationSchema = t.type({
  status: t.union([t.literal('approved'), t.literal('rejected')]),
});

export function createTranslationRoutes(prisma: PrismaClient, _env: Env) {
  const app = new Hono<{ Bindings: Env }>();

  // Approve/Reject translation
  app.patch('/:id/approve', authMiddleware, validate('json', ApproveTranslationSchema), async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const { status } = c.req.valid('json' as never) as t.TypeOf<typeof ApproveTranslationSchema>;

    const translation = await prisma.webTranslation.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!translation) {
      return c.json({ error: 'Translation not found' }, 404);
    }

    // Check access
    if (translation.project.userId !== user.userId) {
      // Check if user is a member
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: translation.projectId,
            userId: user.userId,
          },
        },
      });

      if (!member || member.role === 'viewer') {
        return c.json({ error: 'Forbidden' }, 403);
      }
    }

    const updated = await prisma.webTranslation.update({
      where: { id },
      data: { status },
    });

    return c.json(updated);
  });

  // Delete translation
  app.delete('/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');

    const translation = await prisma.webTranslation.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!translation) {
      return c.json({ error: 'Translation not found' }, 404);
    }

    // Check access
    if (translation.project.userId !== user.userId) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: translation.projectId,
            userId: user.userId,
          },
        },
      });

      if (!member || member.role === 'viewer') {
        return c.json({ error: 'Forbidden' }, 403);
      }
    }

    await prisma.webTranslation.delete({
      where: { id },
    });

    return c.json({ success: true });
  });

  return app;
}
