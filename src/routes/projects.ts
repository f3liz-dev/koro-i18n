import { Hono } from 'hono';
import * as t from 'io-ts';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { validate } from '../lib/validator';
import { createFileRoutes } from './files';
import { createProjectTranslationRoutes } from './project-translations';
import { createApplyRoutes } from './apply';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { generateProjectsETag, checkETagMatch, create304Response } from '../lib/etag-db';

interface Env {
  JWT_SECRET: string;
  ENVIRONMENT: string;
  ALLOWED_PROJECT_CREATORS?: string;
  Variables: {
    user: any;
  };
}

const CreateProjectSchema = t.type({
  name: t.string,
  repository: t.string,
});

const UpdateProjectSchema = t.type({
  accessControl: t.union([t.literal('whitelist'), t.literal('blacklist')]),
});

const JoinProjectSchema = t.type({}); // Empty body

const ApproveMemberSchema = t.type({
  status: t.union([t.literal('approved'), t.literal('rejected')]),
});

export function createProjectRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono<{ Bindings: Env }>();

  // Mount files routes
  // Note: We mount it at /:projectName/files so that the nested router can access :projectName
  app.route('/:projectName/files', createFileRoutes(prisma, env));

  // Mount translations routes
  app.route('/:projectName/translations', createProjectTranslationRoutes(prisma, env));

  // Mount apply translations routes
  app.route('/:projectName/apply', createApplyRoutes(prisma, env));

  // Create Project
  app.post('/', authMiddleware, validate('json', CreateProjectSchema), async (c) => {
    const user = c.get('user');
    const { name, repository } = c.req.valid('json' as never) as t.TypeOf<typeof CreateProjectSchema>;

    // Permission check
    const allowedCreators = env.ALLOWED_PROJECT_CREATORS?.trim();
    if (allowedCreators) {
      const allowedUsernames = allowedCreators.split(',').map(u => u.trim().toLowerCase());
      if (!allowedUsernames.includes(user.username.toLowerCase())) {
        return c.json({ error: 'Permission denied' }, 403);
      }
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return c.json({ error: 'Invalid name' }, 400);
    }
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(repository)) {
      return c.json({ error: 'Invalid repository' }, 400);
    }

    const existing = await prisma.project.findFirst({
      where: { OR: [{ name }, { repository }] },
    });

    if (existing) {
      return c.json({ error: 'Project or repository already exists' }, 400);
    }

    const id = crypto.randomUUID();
    await prisma.project.create({
      data: { id, userId: user.userId, name, repository },
    });

    return c.json({ success: true, id, name, repository });
  });

  // List Projects
  app.get('/', authMiddleware, async (c) => {
    const user = c.get('user');
    const includeLanguages = c.req.query('includeLanguages') === 'true';

    // Optimization: Split query to avoid slow OR with relation filter
    // 1. Fetch projects owned by user
    // 2. Fetch projects where user is an approved member
    const [ownedProjects, memberProjects] = await Promise.all([
      prisma.project.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.projectMember.findMany({
        where: { userId: user.userId, status: 'approved' },
        include: { project: true },
        orderBy: { project: { createdAt: 'desc' } },
      }),
    ]);

    // Combine and deduplicate (in case user is both owner and member)
    const projectMap = new Map<string, any>();

    ownedProjects.forEach(p => {
      projectMap.set(p.id, { ...p, role: 'owner' });
    });

    memberProjects.forEach(mp => {
      if (!projectMap.has(mp.projectId)) {
        projectMap.set(mp.projectId, { ...mp.project, role: mp.role });
      }
    });

    const result = Array.from(projectMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // ETag logic
    const timestamps = result.map(p => p.createdAt);
    const etag = generateProjectsETag(timestamps);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, buildCacheControl(CACHE_CONFIGS.projects));
    }

    // Optional: Fetch languages (simplified for brevity)
    // ...

    const response = c.json({ projects: result });
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projects));
    return response;
  });

  // Get All Projects (for discovery)
  app.get('/all', authMiddleware, async (c) => {
    const user = c.get('user');
    const projects = await prisma.project.findMany({
      include: {
        members: { where: { userId: user.userId }, select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = projects.map(p => ({
      id: p.id,
      name: p.name,
      repository: p.repository,
      userId: p.userId,
      createdAt: p.createdAt,
      membershipStatus: p.members[0]?.status || null,
    }));

    const etag = generateProjectsETag(projects.map(p => p.createdAt));
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, buildCacheControl(CACHE_CONFIGS.projects));
    }

    const response = c.json({ projects: result });
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projects));
    return response;
  });

  // Delete Project
  app.delete('/:projectName', authMiddleware, async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');

    const project = await prisma.project.findUnique({ where: { name: projectName } });
    if (!project) return c.json({ error: 'Not found' }, 404);
    if (project.userId !== user.userId) return c.json({ error: 'Forbidden' }, 403);

    await prisma.project.delete({ where: { id: project.id } });
    return c.json({ success: true });
  });

  // Update Project
  app.patch('/:projectName', authMiddleware, validate('json', UpdateProjectSchema), async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');
    const { accessControl } = c.req.valid('json' as never) as t.TypeOf<typeof UpdateProjectSchema>;

    const project = await prisma.project.findUnique({ where: { name: projectName } });
    if (!project) return c.json({ error: 'Not found' }, 404);
    if (project.userId !== user.userId) return c.json({ error: 'Forbidden' }, 403);

    await prisma.project.update({
      where: { id: project.id },
      data: { accessControl },
    });
    return c.json({ success: true });
  });

  // Join Project
  app.post('/:projectName/join', authMiddleware, async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');

    const project = await prisma.project.findUnique({ where: { name: projectName } });
    if (!project) return c.json({ error: 'Not found' }, 404);

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: user.userId } },
    });

    if (existing) return c.json({ error: 'Already member/requested', status: existing.status }, 400);

    await prisma.projectMember.create({
      data: {
        id: crypto.randomUUID(),
        projectId: project.id,
        userId: user.userId,
        status: 'pending',
        role: 'member',
      },
    });

    return c.json({ success: true, status: 'pending' });
  });

  // List Members
  app.get('/:projectName/members', authMiddleware, async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');

    const project = await prisma.project.findUnique({ where: { name: projectName } });
    if (!project) return c.json({ error: 'Not found' }, 404);
    if (project.userId !== user.userId) return c.json({ error: 'Forbidden' }, 403);

    const members = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: { user: { select: { username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const result = members.map(m => ({
      id: m.id,
      userId: m.userId,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      status: m.status,
      role: m.role,
      createdAt: m.createdAt,
    }));

    return c.json({ members: result });
  });

  // Approve Member
  app.post('/:projectName/members/:memberId/approve', authMiddleware, validate('json', ApproveMemberSchema), async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');
    const memberId = c.req.param('memberId');
    const { status } = c.req.valid('json' as never) as t.TypeOf<typeof ApproveMemberSchema>;

    const project = await prisma.project.findUnique({ where: { name: projectName } });
    if (!project) return c.json({ error: 'Not found' }, 404);
    if (project.userId !== user.userId) return c.json({ error: 'Forbidden' }, 403);

    await prisma.projectMember.update({
      where: { id: memberId },
      data: { status, updatedAt: new Date() },
    });

    return c.json({ success: true });
  });

  // Remove Member
  app.delete('/:projectName/members/:memberId', authMiddleware, async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');
    const memberId = c.req.param('memberId');

    const project = await prisma.project.findUnique({ where: { name: projectName } });
    if (!project) return c.json({ error: 'Not found' }, 404);
    if (project.userId !== user.userId) return c.json({ error: 'Forbidden' }, 403);

    await prisma.projectMember.delete({ where: { id: memberId } });
    return c.json({ success: true });
  });

  return app;
}
