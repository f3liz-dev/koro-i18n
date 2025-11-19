/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { requireAuth } from '../lib/auth';
import { getFile } from '../lib/r2-storage';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { resolveActualProjectId } from '../lib/database';

interface Env {
  TRANSLATION_BUCKET: R2Bucket;
  JWT_SECRET: string;
}

export function createR2FileRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();

  // Helper: return 304 if client ETag matches, otherwise return server ETag string
  const maybe304 = (c: any, timestamp: Date) => {
    const serverETag = `"${timestamp.getTime()}"`;
    const clientETag = c.req.header('If-None-Match');
    if (clientETag === serverETag) {
      return c.body(null, 304, {
        'ETag': serverETag,
        'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
      });
    }
    return serverETag;
  };

  // Get specific file from R2 (GitHub import only, no web translations)
  app.get('/:projectName/:lang/:filename', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdOrName = c.req.param('projectName');
    const lang = c.req.param('lang');
    const filename = c.req.param('filename');
    const branch = c.req.query('branch') || 'main';

    // Resolve project name to repository ID
    const actualProjectId = await resolveActualProjectId(prisma, projectIdOrName);

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

    // ETag handling
    const etagResult = maybe304(c, fileIndex.lastUpdated);
    if (etagResult instanceof Response) return etagResult;
    const serverETag = etagResult as string;

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

    // Set ETag when uploadedAt is available and return cache control
    if (fileData.uploadedAt) {
      try {
        response.headers.set('ETag', `"${new Date(fileData.uploadedAt).getTime()}"`);
      } catch { }
    }
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));

    return response;
  });

  // New: expose misc metadata stored at "{r2Key}-misc-git"
  app.get('/misc/:r2Key', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const r2Key = c.req.param('r2Key');
    // Decode the R2 key in case it was encoded in the URL
    const decodedR2Key = decodeURIComponent(r2Key);
    const miscKey = `${decodedR2Key}-misc-git`;

    try {
      const object = await env.TRANSLATION_BUCKET.get(miscKey);
      if (!object) {
        // Not found - return empty metadata object
        // This is expected for files that don't have git blame info yet
        const resp = c.json({ metadata: {} });
        resp.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));
        return resp;
      }

      const buffer = await object.arrayBuffer();
      // Decode msgpack
      const { decode } = await import('@msgpack/msgpack');
      const metadata = decode(new Uint8Array(buffer));

      const resp = c.json({ metadata });
      resp.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));
      return resp;
    } catch (err) {
      console.warn(`[r2-files] failed to fetch misc metadata for ${miscKey}`, err);
      // Return empty metadata on error to avoid breaking the frontend
      return c.json({ metadata: {} }, 200);
    }
  });

  return app;
}
