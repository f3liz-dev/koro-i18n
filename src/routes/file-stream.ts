/**
 * File Streaming Routes - Pure route handlers
 * 
 * DOP Pattern: Minimal logic, delegate to services
 */

import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { createProjectMiddleware } from '../lib/project-middleware';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import type { Env, AppEnv, GitHubContext } from '../lib/context';
import * as GitHub from '../lib/github';

export function createFileStreamRoutes(prisma: PrismaClient, _env: Env) {
  const app = new Hono<AppEnv>();
  
  app.use('*', authMiddleware, createProjectMiddleware(prisma, { 
    requireAccess: true, 
    withOctokit: true 
  }));

  /**
   * GET /:language/:filename
   * Stream a specific translation file
   */
  app.get('/:language/:filename', async (c) => {
    const language = c.req.param('language');
    const filename = c.req.param('filename');
    const branch = c.req.query('branch') || 'main';
    const github = c.get('github') as GitHubContext;

    const result = await GitHub.TranslationService.streamTranslationFile(
      github.octokit,
      github.owner,
      github.repo,
      language,
      filename,
      branch
    );

    if (!result) {
      return c.json({ 
        error: `File not found: ${language}/${filename}` 
      }, 404);
    }

    return new Response(result.stream, {
      headers: {
        'Content-Type': result.contentType,
        'Transfer-Encoding': 'chunked',
        'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
        'X-Commit-SHA': result.commitSha,
      },
    });
  });

  /**
   * GET /:language/:filename/metadata
   * Get file with full metadata (not streaming)
   */
  app.get('/:language/:filename/metadata', async (c) => {
    const language = c.req.param('language');
    const filename = c.req.param('filename');
    const branch = c.req.query('branch') || 'main';
    const github = c.get('github') as GitHubContext;

    const file = await GitHub.TranslationService.fetchTranslationFile(
      github.octokit,
      github.owner,
      github.repo,
      language,
      filename,
      branch
    );

    if (!file) {
      return c.json({ 
        error: `File not found: ${language}/${filename}` 
      }, 404);
    }

    const response = c.json(file);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));
    return response;
  });

  return app;
}
