/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { PrismaClient } from '../generated/prisma/';
import { verifyJWT, requireAuth } from '../lib/auth';
import { checkProjectAccess } from '../lib/database';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { storeFile, generateR2Key } from '../lib/r2-storage';
import { invalidateOutdatedTranslations } from '../lib/translation-validation';

interface Env {
  TRANSLATION_BUCKET: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  PLATFORM_URL?: string;
}

const MAX_FILES = 500;

export function createProjectFileRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();

  async function validateUploadAuth(token: string, projectId: string, repository: string, jwtSecret: string) {
    // Try OIDC verification first
    try {
      const { verifyGitHubOIDCToken } = await import('../oidc.js');
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
      
      return {
        authorized: false,
        error: `Repository mismatch: token is for ${oidcPayload.repository}, but project repository is ${repository}`
      };
    } catch (oidcError: any) {
      // Try JWT as fallback (development only)
      const jwtPayload = await verifyJWT(token, jwtSecret);
      
      if (jwtPayload && env.ENVIRONMENT === 'development') {
        const hasAccess = await checkProjectAccess(prisma, projectId, jwtPayload.userId);
        if (hasAccess) {
          return { authorized: true, method: 'JWT', userId: jwtPayload.userId, username: jwtPayload.username };
        }
      }
      
      return {
        authorized: false,
        error: `Authentication failed: ${oidcError.message}`
      };
    }
  }

  // Upload files to R2 (GitHub imports)
  app.post('/:projectName/upload', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401);
    }

    const projectName = c.req.param('projectName');
    const body = await c.req.json();
    const { branch, commitSha, sourceLanguage, files } = body;

    if (!files || !Array.isArray(files)) {
      return c.json({ error: 'Missing required field: files' }, 400);
    }

    if (files.length > MAX_FILES) {
      return c.json({ error: `Too many files. Max ${MAX_FILES} files per upload` }, 400);
    }

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true, sourceLanguage: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    try {
      const authResult = await validateUploadAuth(token, project.id, project.repository, env.JWT_SECRET);
      if (!authResult.authorized) {
        console.error(`[upload] Authorization failed: ${authResult.error}`);
        return c.json({ error: authResult.error || 'Unauthorized' }, 403);
      }

      // Validate that files have required fields for R2 storage
      for (const file of files) {
        if (!file.metadata || typeof file.metadata !== 'string') {
          return c.json({ 
            error: `File ${file.filename} (${file.lang}) missing preprocessed metadata. Client must send base64-encoded MessagePack metadata.` 
          }, 400);
        }
        if (!file.sourceHash) {
          return c.json({ 
            error: `File ${file.filename} (${file.lang}) missing sourceHash` 
          }, 400);
        }
      }

      // Update project sourceLanguage if provided
      if (sourceLanguage && sourceLanguage !== project.sourceLanguage) {
        if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(sourceLanguage)) {
          return c.json({ error: 'Invalid sourceLanguage format. Expected format: "en" or "en-US"' }, 400);
        }
        await prisma.project.update({
          where: { id: project.id },
          data: { sourceLanguage },
        });
        console.log(`[upload] Updated project ${projectName} sourceLanguage to: ${sourceLanguage}`);
      }

      const projectId = project.repository;
      const branchName = branch || 'main';
      const commitHash = commitSha || `upload-${Date.now()}`;

      console.log(`[upload] Storing ${files.length} files to R2 for ${projectId}#${commitHash}...`);

      const uploadedFiles: string[] = [];
      
      // Store each file individually to R2
      for (const file of files) {
        const r2Key = await storeFile(
          env.TRANSLATION_BUCKET,
          projectId,
          file.lang,
          file.filename,
          commitHash,
          file.contents,
          file.metadata,
          file.sourceHash
        );

        uploadedFiles.push(r2Key);

        // Store file metadata in D1
        await prisma.r2File.upsert({
          where: {
            projectId_branch_lang_filename: {
              projectId,
              branch: branchName,
              lang: file.lang,
              filename: file.filename,
            },
          },
          update: {
            commitSha: commitHash,
            r2Key,
            sourceHash: file.sourceHash,
            totalKeys: Object.keys(file.contents).length,
            lastUpdated: new Date(),
          },
          create: {
            id: crypto.randomUUID(),
            projectId,
            branch: branchName,
            commitSha: commitHash,
            lang: file.lang,
            filename: file.filename,
            r2Key,
            sourceHash: file.sourceHash,
            totalKeys: Object.keys(file.contents).length,
          },
        });

        console.log(`[upload] Stored ${file.lang}/${file.filename} -> ${r2Key}`);
      }

      console.log(`[upload] All files stored to R2 and indexed in D1`);

      // Invalidate outdated web translations for source language files
      const invalidationResults: Record<string, { invalidated: number; checked: number }> = {};
      
      for (const file of files) {
        if (file.lang === project.sourceLanguage || file.lang === sourceLanguage) {
          const result = await invalidateOutdatedTranslations(
            prisma,
            env.TRANSLATION_BUCKET,
            projectId,
            file.lang,
            file.filename
          );
          
          if (result.invalidated > 0) {
            invalidationResults[`${file.lang}/${file.filename}`] = result;
            console.log(`[upload] Invalidated ${result.invalidated}/${result.checked} translations for ${file.lang}/${file.filename}`);
          }
        }
      }

      return c.json({
        success: true,
        projectId,
        commitSha: commitHash,
        filesUploaded: files.length,
        r2Keys: uploadedFiles,
        invalidationResults,
        uploadedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[upload] Error:', error);
      return c.json({ 
        error: 'Failed to upload files',
        details: env.ENVIRONMENT === 'development' ? error.message : undefined
      }, 500);
    }
  });

  // List files (metadata only from D1)
  app.get('/:projectName/files/list', async (c) => {
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

    // Get files from D1 index
    const where: any = { projectId: project.repository, branch };
    if (language) where.lang = language;

    const files = await prisma.r2File.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    // Generate ETag from latest update
    const latestUpdate = files.length > 0 
      ? Math.max(...files.map(f => f.lastUpdated.getTime()))
      : Date.now();
    const serverETag = `"${latestUpdate}"`;
    
    // Check ETag
    const clientETag = c.req.header('If-None-Match');
    if (clientETag === serverETag) {
      return c.body(null, 304, {
        'ETag': serverETag,
        'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
      });
    }

    const response = c.json({
      project: projectName,
      repository: project.repository,
      branch,
      files: files.map(f => ({
        lang: f.lang,
        filename: f.filename,
        commitSha: f.commitSha,
        r2Key: f.r2Key,
        sourceHash: f.sourceHash,
        totalKeys: f.totalKeys,
        uploadedAt: f.uploadedAt,
      })),
      generatedAt: new Date().toISOString(),
    });

    response.headers.set('ETag', serverETag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));

    return response;
  });

  // Get files summary (metadata from D1)
  app.get('/:projectId/files/summary', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdOrName = c.req.param('projectId');
    const branch = c.req.query('branch') || 'main';
    const lang = c.req.query('lang');
    const filename = c.req.query('filename');

    let actualProjectId = projectIdOrName;
    const project = await prisma.project.findUnique({
      where: { name: projectIdOrName },
      select: { repository: true, sourceLanguage: true },
    });
    
    if (project) {
      actualProjectId = project.repository;
    }

    // Get files from D1
    const where: any = { projectId: actualProjectId, branch };
    if (lang) where.lang = lang;
    if (filename) where.filename = filename;

    const files = await prisma.r2File.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    if (files.length === 0) {
      return c.json({ files: [] });
    }

    // Generate ETag
    const latestUpdate = Math.max(...files.map(f => f.lastUpdated.getTime()));
    const serverETag = `"${latestUpdate}"`;
    
    // Check ETag
    const clientETag = c.req.header('If-None-Match');
    if (clientETag === serverETag) {
      return c.body(null, 304, {
        'ETag': serverETag,
        'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
      });
    }

    const response = c.json({
      files: files.map(f => ({
        filename: f.filename,
        lang: f.lang,
        commitSha: f.commitSha,
        totalKeys: f.totalKeys,
        sourceHash: f.sourceHash,
        uploadedAt: f.uploadedAt,
        r2Key: f.r2Key,
      })),
    });

    response.headers.set('ETag', serverETag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));

    return response;
  });

  // Get files (metadata only - use /api/r2/* for actual content)
  app.get('/:projectId/files', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdOrName = c.req.param('projectId');
    const branch = c.req.query('branch') || 'main';
    const lang = c.req.query('lang');
    const filename = c.req.query('filename');

    let actualProjectId = projectIdOrName;
    const project = await prisma.project.findUnique({
      where: { name: projectIdOrName },
      select: { repository: true },
    });
    
    if (project) {
      actualProjectId = project.repository;
    }

    // Get files from D1
    const where: any = { projectId: actualProjectId, branch };
    if (lang) where.lang = lang;
    if (filename) where.filename = filename;

    const files = await prisma.r2File.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    if (files.length === 0) {
      return c.json({ files: [] });
    }

    // Generate ETag
    const latestUpdate = Math.max(...files.map(f => f.lastUpdated.getTime()));
    const serverETag = `"${latestUpdate}"`;
    
    // Check ETag
    const clientETag = c.req.header('If-None-Match');
    if (clientETag === serverETag) {
      return c.body(null, 304, {
        'ETag': serverETag,
        'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
      });
    }

    const response = c.json({ 
      files: files.map(f => ({
        id: f.id,
        filename: f.filename,
        lang: f.lang,
        commitSha: f.commitSha,
        r2Key: f.r2Key,
        sourceHash: f.sourceHash,
        totalKeys: f.totalKeys,
        uploadedAt: f.uploadedAt,
      })),
      note: 'Use /api/r2/:projectId/:lang/:filename to get actual file contents'
    });

    response.headers.set('ETag', serverETag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));

    return response;
  });

  return app;
}
