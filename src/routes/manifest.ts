/**
 * Manifest Routes - Pure route handlers
 * 
 * DOP Pattern: Thin route handlers that compose services
 */

import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { createProjectMiddleware } from '../lib/project-middleware';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import type { Env, AppEnv, GitHubContext } from '../lib/context';
import * as GitHub from '../lib/github';

export function createManifestRoutes(prisma: PrismaClient, _env: Env) {
  const app = new Hono<AppEnv>();
  
  app.use('*', authMiddleware, createProjectMiddleware(prisma, { 
    requireAccess: true, 
    withOctokit: true 
  }));

  /**
   * GET /manifest
   * Returns the manifest as JSON
   */
  app.get('/', async (c) => {
    const branch = c.req.query('branch') || 'main';
    const github = c.get('github') as GitHubContext;

    const manifest = await GitHub.Manifest.fetchManifest(
      github.octokit,
      github.owner,
      github.repo,
      branch
    );

    if (!manifest) {
      return c.json({
        error: 'Manifest not found. Ensure .koro-i18n/koro-i18n.repo.generated.jsonl exists.'
      }, 404);
    }

    const response = c.json(manifest);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));
    return response;
  });

  /**
   * GET /manifest/stream
   * Streams the manifest as JSONL
   */
  app.get('/stream', async (c) => {
    const branch = c.req.query('branch') || 'main';
    const github = c.get('github') as GitHubContext;

    const stream = await GitHub.Manifest.streamManifestJsonl(
      github.octokit,
      github.owner,
      github.repo,
      branch
    );

    if (!stream) {
      return c.json({ error: 'Manifest not found' }, 404);
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
      },
    });
  });

  /**
   * GET /manifest/languages
   * Returns list of available languages
   */
  app.get('/languages', async (c) => {
    const branch = c.req.query('branch') || 'main';
    const github = c.get('github') as GitHubContext;

    const manifest = await GitHub.Manifest.fetchManifest(
      github.octokit,
      github.owner,
      github.repo,
      branch
    );

    if (!manifest) {
      return c.json({ error: 'Manifest not found' }, 404);
    }

    const languages = GitHub.Manifest.getLanguages(manifest);
    const counts = GitHub.Manifest.countFilesByLanguage(manifest);

    const response = c.json({ languages, counts });
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));
    return response;
  });

  return app;
}
