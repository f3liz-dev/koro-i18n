import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { PrismaClient } from '../generated/prisma/';
import { verifyJWT, requireAuth } from '../lib/auth';
import { checkProjectAccess, flattenObject } from '../lib/database';

interface Env {
  JWT_SECRET: string;
  ENVIRONMENT: string;
  PLATFORM_URL?: string;
}

const MAX_FILES = 500;
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB

export function createProjectFileRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();

  async function validateUploadAuth(token: string, projectId: string, repository: string, jwtSecret: string) {
    // Try OIDC verification first (OIDC tokens are more specific with GitHub issuer)
    try {
      const { verifyGitHubOIDCToken } = await import('../oidc.js');
      // Use platform URL as audience for OIDC token verification
      const platformUrl = env.PLATFORM_URL || 'https://koro.f3liz.workers.dev';
      const oidcPayload = await verifyGitHubOIDCToken(token, platformUrl, repository);

      if (oidcPayload.repository === repository) {
        return {
          authorized: true,
          method: 'OIDC',
          repository: oidcPayload.repository,
          actor: oidcPayload.actor,
          workflow: oidcPayload.workflow
        };
      }
    } catch (oidcError: any) {
      // OIDC verification failed, try JWT verification as fallback
      const jwtPayload = await verifyJWT(token, jwtSecret);
      
      if (jwtPayload) {
        // JWT upload is only allowed in development environment
        if (env.ENVIRONMENT === 'development') {
          const hasAccess = await checkProjectAccess(prisma, projectId, jwtPayload.userId);
          if (hasAccess) {
            return { authorized: true, method: 'JWT', userId: jwtPayload.userId, username: jwtPayload.username };
          }
        }
      }
      
      // If we get here, both OIDC and JWT verification failed
      throw new Error(`Authentication failed: ${oidcError.message}`);
    }
    
    return { authorized: false };
  }

  app.post('/:projectName/upload', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401);
    }

    const projectName = c.req.param('projectName');
    const body = await c.req.json();
    const { branch, commitSha, files } = body;

    if (!files || !Array.isArray(files)) {
      return c.json({ error: 'Missing required field: files' }, 400);
    }

    if (files.length > MAX_FILES) {
      return c.json({ error: `Too many files. Max ${MAX_FILES} files per upload` }, 400);
    }

    if (JSON.stringify(body).length > MAX_PAYLOAD_SIZE) {
      return c.json({ error: `Payload too large. Max ${MAX_PAYLOAD_SIZE / 1024 / 1024}MB` }, 400);
    }

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    try {
      const authResult = await validateUploadAuth(token, project.id, project.repository, env.JWT_SECRET);
      if (!authResult.authorized) {
        return c.json({ error: 'Unauthorized to upload to this project' }, 403);
      }

      const projectId = project.repository;

      for (const file of files) {
        const { filetype, filename, lang, contents, metadata } = file;
        
        // Flatten the contents if they are nested
        const flattened = flattenObject(contents || {});
        const keyCount = Object.keys(flattened).length;
        
        console.log(`[upload] Processing file: ${filename} (${lang}), keys: ${keyCount}`);
        
        if (keyCount === 0) {
          console.warn(`[upload] Warning: File ${filename} (${lang}) has 0 keys`);
        }
        
        await prisma.projectFile.upsert({
          where: {
            projectId_branch_filename_lang: {
              projectId,
              branch: branch || 'main',
              filename,
              lang,
            },
          },
          update: {
            commitSha: commitSha || '',
            filetype,
            contents: JSON.stringify(flattened),
            metadata: JSON.stringify(metadata || {}),
            uploadedAt: new Date(),
          },
          create: {
            id: crypto.randomUUID(),
            projectId,
            branch: branch || 'main',
            commitSha: commitSha || '',
            filename,
            filetype,
            lang,
            contents: JSON.stringify(flattened),
            metadata: JSON.stringify(metadata || {}),
          },
        });
      }

      return c.json({
        success: true,
        projectId,
        filesUploaded: files.length,
        totalKeys: files.reduce((sum, f) => {
          const flattened = flattenObject(f.contents || {});
          return sum + Object.keys(flattened).length;
        }, 0),
        uploadedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      return c.json({ error: 'Failed to store files' }, 500);
    }
  });

  app.post('/:projectName/upload-json', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401);
    }

    const projectName = c.req.param('projectName');
    const body = await c.req.json();
    const { branch, commitSha, language, files } = body;

    if (!files || typeof files !== 'object') {
      return c.json({ error: 'Missing required field: files' }, 400);
    }

    if (Object.keys(files).length > MAX_FILES) {
      return c.json({ error: `Too many files. Max ${MAX_FILES} files per upload` }, 400);
    }

    if (JSON.stringify(body).length > MAX_PAYLOAD_SIZE) {
      return c.json({ error: `Payload too large. Max ${MAX_PAYLOAD_SIZE / 1024 / 1024}MB` }, 400);
    }

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    try {
      const authResult = await validateUploadAuth(token, project.id, project.repository, env.JWT_SECRET);
      if (!authResult.authorized) {
        return c.json({ error: 'Unauthorized to upload to this project' }, 403);
      }

      const projectId = project.repository;

      for (const [filename, content] of Object.entries(files)) {
        const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
        const flattened = flattenObject(parsedContent);
        const keyCount = Object.keys(flattened).length;
        
        console.log(`[upload-json] Processing file: ${filename}, keys: ${keyCount}`);
        
        if (keyCount === 0) {
          console.warn(`[upload-json] Warning: File ${filename} has 0 keys. Content:`, JSON.stringify(parsedContent).substring(0, 200));
        }
        
        await prisma.projectFile.upsert({
          where: {
            projectId_branch_filename_lang: {
              projectId,
              branch: branch || 'main',
              filename,
              lang: language || 'en',
            },
          },
          update: {
            commitSha: commitSha || '',
            filetype: 'json',
            contents: JSON.stringify(flattened),
            metadata: JSON.stringify({
              keys: keyCount,
              uploadMethod: 'json-direct'
            }),
            uploadedAt: new Date(),
          },
          create: {
            id: crypto.randomUUID(),
            projectId,
            branch: branch || 'main',
            commitSha: commitSha || '',
            filename,
            filetype: 'json',
            lang: language || 'en',
            contents: JSON.stringify(flattened),
            metadata: JSON.stringify({
              keys: keyCount,
              uploadMethod: 'json-direct'
            }),
          },
        });
      }

      return c.json({
        success: true,
        projectId,
        filesUploaded: Object.keys(files).length,
        totalKeys: Object.keys(files).reduce((sum, filename) => {
          const content = files[filename];
          const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
          const flattened = flattenObject(parsedContent);
          return sum + Object.keys(flattened).length;
        }, 0),
        uploadedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('JSON upload error:', error);
      return c.json({ error: 'Failed to store files' }, 500);
    }
  });

  app.get('/:projectName/download', async (c) => {
    let token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      const cookieToken = getCookie(c, 'auth_token');
      if (cookieToken) {
        token = cookieToken;
      } else {
        return c.json({ error: 'Authorization token required' }, 401);
      }
    }

    const projectName = c.req.param('projectName');
    const branch = c.req.query('branch') || 'main';
    const language = c.req.query('language');

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    const jwtPayload = await verifyJWT(token, env.JWT_SECRET);
    if (!jwtPayload) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const hasAccess = await checkProjectAccess(prisma, project.id, jwtPayload.userId);
    if (!hasAccess && env.ENVIRONMENT !== 'development') {
      return c.json({ error: 'Access denied to this project' }, 403);
    }

    const where: any = { projectId: project.repository, branch };
    if (language) where.lang = language;

    const projectFiles = await prisma.projectFile.findMany({
      where,
      orderBy: [{ lang: 'asc' }, { filename: 'asc' }],
    });

    const filesByLang: Record<string, Record<string, any>> = {};
    for (const row of projectFiles) {
      if (!filesByLang[row.lang]) {
        filesByLang[row.lang] = {};
      }
      filesByLang[row.lang][row.filename] = JSON.parse(row.contents);
    }

    return c.json({
      project: projectName,
      repository: project.repository,
      branch,
      files: filesByLang,
      generatedAt: new Date().toISOString()
    });
  });

  app.get('/:projectId/files', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdOrName = c.req.param('projectId');
    const branch = c.req.query('branch') || 'main';
    const lang = c.req.query('lang');

    let actualProjectId = projectIdOrName;
    const project = await prisma.project.findUnique({
      where: { name: projectIdOrName },
      select: { repository: true },
    });
    
    if (project) {
      actualProjectId = project.repository;
    }

    const where: any = { projectId: actualProjectId, branch };
    if (lang) where.lang = lang;

    const projectFiles = await prisma.projectFile.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    const files = projectFiles.map((row) => ({
      ...row,
      contents: JSON.parse(row.contents),
      metadata: JSON.parse(row.metadata || '{}')
    }));

    return c.json({ files });
  });

  return app;
}
