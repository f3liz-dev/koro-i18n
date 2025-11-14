import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { requireAuth, verifyJWT } from '../lib/auth';
import { checkProjectAccess, flattenObject } from '../lib/database';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { generateProjectsETag, checkETagMatch, create304Response } from '../lib/etag-db';

interface Env {
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export function createProjectRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();

  app.post('/', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const body = await c.req.json();
    const { name, repository } = body;

    if (!name || !repository) {
      return c.json({ error: 'Missing name or repository' }, 400);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return c.json({ error: 'Invalid project name. Use only letters, numbers, hyphens, and underscores' }, 400);
    }

    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(repository)) {
      return c.json({ error: 'Invalid repository format. Use: owner/repo' }, 400);
    }

    const existingName = await prisma.project.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existingName) {
      return c.json({ error: 'Project name already taken' }, 400);
    }

    const existingRepo = await prisma.project.findUnique({
      where: { repository },
      select: { id: true, name: true },
    });

    if (existingRepo) {
      return c.json({ 
        error: 'Repository already registered',
        existingProject: existingRepo.name
      }, 400);
    }

    const id = crypto.randomUUID();
    await prisma.project.create({
      data: { id, userId: payload.userId, name, repository },
    });

    return c.json({ success: true, id, name, repository });
  });

  app.get('/', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    // Optional query parameter to include languages (expensive operation)
    const includeLanguages = c.req.query('includeLanguages') === 'true';

    const owned = await prisma.project.findMany({
      where: { userId: payload.userId },
      select: {
        id: true,
        name: true,
        repository: true,
        userId: true,
        accessControl: true,
        sourceLanguage: true,
        createdAt: true,
      },
    });
    const ownedWithRole = owned.map(p => ({ ...p, role: 'owner' }));

    const member = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: payload.userId,
            status: 'approved',
          },
        },
      },
      select: {
        id: true,
        name: true,
        repository: true,
        userId: true,
        accessControl: true,
        sourceLanguage: true,
        createdAt: true,
        members: {
          where: { userId: payload.userId },
          select: { role: true, updatedAt: true },
        },
      },
    });
    const memberWithRole = member.map(p => ({ 
      ...p, 
      role: p.members[0]?.role || 'member',
      members: undefined 
    }));

    const allProjects = [...ownedWithRole, ...memberWithRole];
    
    // Generate ETag from project and member timestamps
    const projectTimestamps = allProjects.map(p => p.createdAt);
    const memberTimestamps = member.flatMap(p => p.members.map(m => m.updatedAt));
    const etag = generateProjectsETag(projectTimestamps, memberTimestamps);
    
    // Check if client has current version
    const cacheControl = buildCacheControl(CACHE_CONFIGS.projects);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, cacheControl);
    }
    
    // Conditionally fetch languages - this is expensive (N+1 queries)
    // Frontend should only request this when needed
    if (includeLanguages) {
      // Optimize: Fetch all languages for all repositories in one query
      const repositories = allProjects.map(p => p.repository);
      const allLanguages = await prisma.r2File.findMany({
        where: { 
          projectId: { in: repositories },
          branch: 'main'
        },
        select: { projectId: true, lang: true },
        distinct: ['projectId', 'lang'],
      });
      
      // Group languages by repository
      const languagesByRepo = new Map<string, string[]>();
      for (const item of allLanguages) {
        if (!languagesByRepo.has(item.projectId)) {
          languagesByRepo.set(item.projectId, []);
        }
        languagesByRepo.get(item.projectId)!.push(item.lang);
      }
      
      // Add languages to projects
      const projectsWithLanguages = allProjects.map(project => ({
        ...project,
        languages: languagesByRepo.get(project.repository) || [],
      }));
      
      const response = c.json({ projects: projectsWithLanguages });
      response.headers.set('Cache-Control', cacheControl);
      response.headers.set('ETag', etag);
      return response;
    }

    // Return projects without languages for better performance
    const response = c.json({ projects: allProjects });
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('ETag', etag);
    return response;
  });

  app.get('/all', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        repository: true,
        userId: true,
        createdAt: true,
        members: {
          where: { userId: payload.userId },
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate ETag from project timestamps
    const projectTimestamps = projects.map(p => p.createdAt);
    const etag = generateProjectsETag(projectTimestamps);
    
    // Check if client has current version
    const cacheControl = buildCacheControl(CACHE_CONFIGS.projects);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, cacheControl);
    }

    // Flatten the membership status into the project object
    const projectsWithStatus = projects.map(p => ({
      id: p.id,
      name: p.name,
      repository: p.repository,
      userId: p.userId,
      createdAt: p.createdAt,
      membershipStatus: p.members[0]?.status || null,
    }));

    const response = c.json({ projects: projectsWithStatus });
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('ETag', etag);
    return response;
  });

  app.delete('/:id', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const id = c.req.param('id');
    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    await prisma.project.delete({ where: { id } });
    return c.json({ success: true });
  });

  app.patch('/:id', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const id = c.req.param('id');
    const body = await c.req.json();
    const { accessControl } = body;

    if (!accessControl || !['whitelist', 'blacklist'].includes(accessControl)) {
      return c.json({ error: 'Invalid accessControl value' }, 400);
    }

    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    await prisma.project.update({
      where: { id },
      data: { accessControl },
    });

    return c.json({ success: true });
  });

  app.post('/:id/join', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectId = c.req.param('id');
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: payload.userId },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      return c.json({ error: 'Already requested or member', status: existing.status }, 400);
    }

    const memberId = crypto.randomUUID();
    await prisma.projectMember.create({
      data: { id: memberId, projectId, userId: payload.userId, status: 'pending', role: 'member' },
    });

    return c.json({ success: true, status: 'pending' });
  });

  app.get('/:id/members', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectId = c.req.param('id');
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    if (project.userId !== payload.userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate ETag from member timestamps
    const memberTimestamps = members.map(m => m.updatedAt);
    const etag = generateProjectsETag([], memberTimestamps);
    
    // Check if client has current version
    const cacheControl = buildCacheControl(CACHE_CONFIGS.projects);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, cacheControl);
    }

    // Flatten the user data into the member object
    const flattenedMembers = members.map(member => ({
      id: member.id,
      userId: member.userId,
      username: member.user.username,
      avatarUrl: member.user.avatarUrl || '',
      status: member.status,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
    }));

    // Cache project members - changes infrequently
    const response = c.json({ members: flattenedMembers });
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('ETag', etag);
    return response;
  });

  app.post('/:id/members/:memberId/approve', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectId = c.req.param('id');
    const memberId = c.req.param('memberId');
    const body = await c.req.json();
    const { status } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    if (project.userId !== payload.userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await prisma.projectMember.update({
      where: { id: memberId },
      data: { status, updatedAt: new Date() },
    });

    return c.json({ success: true });
  });

  app.delete('/:id/members/:memberId', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectId = c.req.param('id');
    const memberId = c.req.param('memberId');
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    if (project.userId !== payload.userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await prisma.projectMember.delete({ where: { id: memberId } });
    return c.json({ success: true });
  });

  return app;
}
