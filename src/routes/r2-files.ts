/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { requireAuth } from '../lib/auth';
import { getFile, getFileByComponents } from '../lib/r2-storage';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';

interface Env {
  TRANSLATION_BUCKET: R2Bucket;
  JWT_SECRET: string;
}

export function createR2FileRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();

  // Get specific file from R2 (GitHub import only, no web translations)
  app.get('/:projectId/:lang/:filename', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdOrName = c.req.param('projectId');
    const lang = c.req.param('lang');
    const filename = c.req.param('filename');
    const branch = c.req.query('branch') || 'main';

    // Resolve project name to repository ID
    let actualProjectId = projectIdOrName;
    const project = await prisma.project.findUnique({
      where: { name: projectIdOrName },
      select: { repository: true },
    });
    
    if (project) {
      actualProjectId = project.repository;
    }

    // Get file metadata from D1
    const fileIndex = await prisma.r2File.findUnique({
      where: {
        projectId_branch_lang_filename: {
          projectId: actualProjectId,
          branch,
          lang,
          filename,
        },
      },
    });

    if (!fileIndex) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Check ETag
    const clientETag = c.req.header('If-None-Match');
    const serverETag = `"${fileIndex.lastUpdated.getTime()}"`;
    
    if (clientETag === serverETag) {
      return c.body(null, 304, {
        'ETag': serverETag,
        'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
      });
    }

    // Get file from R2 (with caching)
    const fileData = await getFile(env.TRANSLATION_BUCKET, fileIndex.r2Key);

    if (!fileData) {
      return c.json({ error: 'File not found in R2' }, 404);
    }

    const response = c.json({
      raw: fileData.raw,
      metadata: fileData.metadata,
      sourceHash: fileData.sourceHash,
      commitSha: fileData.commitSha,
      uploadedAt: fileData.uploadedAt,
      totalKeys: fileIndex.totalKeys,
    });

    response.headers.set('ETag', serverETag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));

    return response;
  });

  // Get file by R2 key directly
  app.get('/by-key/:r2Key', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const r2Key = c.req.param('r2Key');

    // Get file from R2
    const fileData = await getFile(env.TRANSLATION_BUCKET, r2Key);

    if (!fileData) {
      return c.json({ error: 'File not found in R2' }, 404);
    }

    const response = c.json({
      raw: fileData.raw,
      metadata: fileData.metadata,
      sourceHash: fileData.sourceHash,
      commitSha: fileData.commitSha,
      uploadedAt: fileData.uploadedAt,
    });

    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));

    return response;
  });

  return app;
}
