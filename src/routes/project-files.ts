/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { PrismaClient } from '../generated/prisma/';
import { verifyJWT, requireAuth } from '../lib/auth';
import { checkProjectAccess } from '../lib/database';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
// Rust-based worker handles R2 key generation and D1 updates; keep TS code minimal.
import { invalidateOutdatedTranslations } from '../lib/translation-validation';
import { createRustWorker } from '../lib/rust-worker-client';

interface Env {
  TRANSLATION_BUCKET: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  PLATFORM_URL?: string;
  COMPUTE_WORKER_URL?: string; // Optional Rust compute worker URL
}

const MAX_FILES = 500;

export function createProjectFileRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();

  // Initialize Rust compute worker (optional)
  let rustWorker = createRustWorker(env);
  if (rustWorker) {
    console.log('[project-files] Rust compute worker enabled:', env.COMPUTE_WORKER_URL);
  } else {
    console.log('[project-files] Rust compute worker not configured, using fallback implementations');
  }

  // Helper: extract bearer token from Authorization header or auth cookie
  const extractBearerToken = (c: any): string | undefined => {
    const header = c.req.header('Authorization');
    if (header?.startsWith('Bearer ')) return header.substring(7);
    const cookieToken = getCookie(c, 'auth_token');
    if (cookieToken) return cookieToken;
    return undefined;
  };

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

  // Upload files to R2 (GitHub imports) - supports chunked uploads
  app.post('/:projectName/upload', async (c) => {
    const token = extractBearerToken(c);
    if (!token) return c.json({ error: 'Authorization token required' }, 401);

    const projectName = c.req.param('projectName');
    const body = await c.req.json();
    const { branch, commitSha, sourceLanguage, files, chunked } = body;

    if (!files || !Array.isArray(files)) {
      return c.json({ error: 'Missing required field: files' }, 400);
    }

    if (files.length > MAX_FILES) {
      return c.json({ error: `Too many files. Max ${MAX_FILES} files per chunk` }, 400);
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

      // Update project sourceLanguage if provided (only on first chunk or non-chunked upload)
      if (sourceLanguage && sourceLanguage !== project.sourceLanguage && (!chunked || chunked.chunkIndex === 1)) {
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

      // Log chunked upload info
      if (chunked) {
        console.log(`[upload] Chunk ${chunked.chunkIndex}/${chunked.totalChunks} - Uploading ${files.length} files for ${projectId}#${commitHash}...`);
      } else {
        console.log(`[upload] Uploading ${files.length} files for ${projectId}#${commitHash}...`);
      }

      // Use Rust worker for upload if available
      let r2Keys: string[] = [];

      if (rustWorker) {
        try {
          console.log(`[upload] Using Rust worker for R2 and D1 operations`);
          const uploadResult = await rustWorker.upload({
            project_id: projectId,
            branch: branchName,
            commit_sha: commitHash,
            files: files.map(file => ({
              lang: file.lang,
              filename: file.filename,
              contents: file.contents, // Optional, if packedData is present
              metadata: file.metadata,
              source_hash: file.sourceHash,
              packed_data: file.packedData,
            })),
          });

          r2Keys = uploadResult.r2_keys;
          console.log(`[upload] Rust worker completed upload of ${files.length} files`);
        } catch (error) {
          console.error(`[upload] Rust worker upload failed:`, error);
          return c.json({ error: 'Rust worker upload failed' }, 503);
        }
      } else {
        console.error('[upload] Rust compute worker not configured; upload cannot be processed');
        return c.json({ error: 'Rust compute worker not configured; upload cannot be processed' }, 503);
      }

      // Only process invalidations on the last chunk (or non-chunked upload)
      const invalidationResults: Record<string, { invalidated: number; checked: number }> = {};

      if (!chunked || chunked.isLastChunk) {
        console.log(`[upload] Last chunk - processing translation invalidations...`);

        // Invalidate outdated translations for source language files
        for (const file of files) {
          if (file.lang === project.sourceLanguage || file.lang === sourceLanguage) {
            const result = await invalidateOutdatedTranslations(
              prisma,
              env.TRANSLATION_BUCKET,
              projectId,
              file.lang,
              file.filename,
              rustWorker || undefined
            );

            if (result.invalidated > 0) {
              invalidationResults[`${file.lang}/${file.filename}`] = result;
              console.log(`[upload] Invalidated ${result.invalidated}/${result.checked} translations for ${file.lang}/${file.filename}`);
            }
          }
        }
      }

      const response: any = {
        success: true,
        projectId,
        commitSha: commitHash,
        filesUploaded: files.length,
        r2Keys: r2Keys,
        uploadedAt: new Date().toISOString(),
      };

      // Add chunk info to response
      if (chunked) {
        response.chunked = {
          chunkIndex: chunked.chunkIndex,
          totalChunks: chunked.totalChunks,
          isLastChunk: chunked.isLastChunk,
        };
      }

      // Only include invalidation results on last chunk
      if (!chunked || chunked.isLastChunk) {
        response.invalidationResults = invalidationResults;
      }

      return c.json(response);
    } catch (error: any) {
      console.error('[upload] Error:', error);
      return c.json({
        error: 'Failed to upload files',
        details: env.ENVIRONMENT === 'development' ? error.message : undefined
      }, 500);
    }
  });

  // Cleanup orphaned files (separate endpoint)
  app.post('/:projectName/cleanup', async (c) => {
    const token = extractBearerToken(c);
    if (!token) return c.json({ error: 'Authorization token required' }, 401);

    const projectName = c.req.param('projectName');
    const body = await c.req.json();
    const { branch, allSourceFiles } = body;

    if (!allSourceFiles || !Array.isArray(allSourceFiles)) {
      return c.json({ error: 'Missing required field: allSourceFiles' }, 400);
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
        console.error(`[cleanup] Authorization failed: ${authResult.error}`);
        return c.json({ error: authResult.error || 'Unauthorized' }, 403);
      }

      const projectId = project.repository;
      const branchName = branch || 'main';

      console.log(`[cleanup] Cleaning up orphaned files for ${projectId}#${branchName}...`);
      const { cleanupOrphanedFiles } = await import('../lib/r2-storage.js');
      const sourceFileKeys = new Set(allSourceFiles);
      const cleanupResult = await cleanupOrphanedFiles(
        env.TRANSLATION_BUCKET,
        prisma,
        projectId,
        branchName,
        sourceFileKeys
      );

      if (cleanupResult.deleted > 0) {
        console.log(`[cleanup] Cleaned up ${cleanupResult.deleted} orphaned files: ${cleanupResult.files.join(', ')}`);
      } else {
        console.log(`[cleanup] No orphaned files to clean up`);
      }

      return c.json({
        success: true,
        cleanupResult,
      });
    } catch (error: any) {
      console.error('[cleanup] Error:', error);
      return c.json({
        error: 'Failed to cleanup files',
        details: env.ENVIRONMENT === 'development' ? error.message : undefined
      }, 500);
    }
  });

  // List files (metadata only from D1) - JWT auth for web UI
  app.get('/:projectName/files/list', async (c) => {
    const token = extractBearerToken(c);
    if (!token) return c.json({ error: 'Authorization token required' }, 401);

    const projectName = c.req.param('projectName');
    const branch = c.req.query('branch') || 'main';
    let language = c.req.query('language');

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true, sourceLanguage: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    // JWT authentication only (for web UI)
    const jwtPayload = await verifyJWT(token, env.JWT_SECRET);
    if (!jwtPayload) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const hasAccess = await checkProjectAccess(prisma, project.id, jwtPayload.userId);
    if (!hasAccess && env.ENVIRONMENT !== 'development') {
      return c.json({ error: 'Access denied to this project' }, 403);
    }

    // Handle special 'source-language' query parameter
    if (language === 'source-language') {
      language = project.sourceLanguage;
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

  // List files (metadata only from D1) - OIDC auth for GitHub Actions
  app.get('/:projectName/files/list-oidc', async (c) => {
    const token = extractBearerToken(c);
    if (!token) return c.json({ error: 'Authorization token required' }, 401);

    const projectName = c.req.param('projectName');
    const branch = c.req.query('branch') || 'main';
    let language = c.req.query('language');

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true, sourceLanguage: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    // OIDC authentication only (for GitHub Actions)
    const authResult = await validateUploadAuth(token, project.id, project.repository, env.JWT_SECRET);
    if (!authResult.authorized) {
      console.error(`[files/list-oidc] Authorization failed: ${authResult.error}`);
      return c.json({ error: authResult.error || 'Unauthorized' }, 403);
    }

    // Handle special 'source-language' query parameter
    if (language === 'source-language') {
      language = project.sourceLanguage;
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
  app.get('/:projectName/files/summary', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectName = c.req.param('projectName');
    const branch = c.req.query('branch') || 'main';
    let lang = c.req.query('lang');
    const filename = c.req.query('filename');

    console.log(`[summary] Request: projectName=${projectName}, lang=${lang}, filename=${filename}`);

    let actualProjectId = projectName;
    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { repository: true, sourceLanguage: true, id: true },
    });

    if (project) {
      actualProjectId = project.repository;
      console.log(`[summary] Project found: ${project.repository}, sourceLanguage: ${project.sourceLanguage}`);

      // Handle special 'source-language' query parameter
      if (lang === 'source-language') {
        lang = project.sourceLanguage;
        console.log(`[summary] Resolved source-language to: ${lang}`);
      }
    } else {
      console.log(`[summary] Project not found, using projectName as-is: ${actualProjectId}`);
    }

    // Get files from D1
    const where: any = { projectId: actualProjectId, branch };
    if (lang) where.lang = lang;
    if (filename) where.filename = filename;

    console.log(`[summary] Querying R2File with:`, JSON.stringify(where));

    const files = await prisma.r2File.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    console.log(`[summary] Found ${files.length} files`);

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

    // Calculate translatedKeys for each file
    const filesWithTranslationCount = files.map((f) => {
      // For target language files (not source language):
      // If the file exists in R2, all keys are translated (from GitHub)
      // Web translations are overrides, not additions to the count

      // Check if this is a source language file
      // The source language should match the lang field (e.g., 'en' === 'en')
      const sourceLanguage = project?.sourceLanguage || 'en';
      const isSourceLanguage = f.lang === sourceLanguage;

      // For source files: translatedKeys = 0 (they are the source)
      // For target files: translatedKeys = totalKeys (all keys are translated if file exists)
      const translatedKeys = isSourceLanguage ? 0 : f.totalKeys;

      // Debug logging
      if (env.ENVIRONMENT === 'development') {
        console.log(`[summary] File: ${f.lang}/${f.filename}, isSource: ${isSourceLanguage}, totalKeys: ${f.totalKeys}, translatedKeys: ${translatedKeys}`);
      }

      return {
        filename: f.filename,
        lang: f.lang,
        commitSha: f.commitSha,
        totalKeys: f.totalKeys,
        translatedKeys: translatedKeys,
        sourceHash: f.sourceHash,
        uploadedAt: f.uploadedAt,
        r2Key: f.r2Key,
      };
    });

    const response = c.json({
      files: filesWithTranslationCount,
    });

    response.headers.set('ETag', serverETag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));

    return response;
  });

  // Get files (metadata only - use /api/r2/* for actual content)
  app.get('/:projectName/files', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectName = c.req.param('projectName');
    const branch = c.req.query('branch') || 'main';
    let lang = c.req.query('lang');
    const filename = c.req.query('filename');

    let actualProjectId = projectName;
    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { repository: true, sourceLanguage: true },
    });

    if (project) {
      actualProjectId = project.repository;

      // Handle special 'source-language' query parameter
      if (lang === 'source-language') {
        lang = project.sourceLanguage;
      }
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
      note: 'Use /api/r2/:projectName/:lang/:filename to get actual file contents'
    });

    response.headers.set('ETag', serverETag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));

    return response;
  });

  return app;
}
