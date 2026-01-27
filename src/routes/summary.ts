/**
 * Summary Routes - Translation progress per language
 * 
 * DOP Pattern: Compose pure functions and I/O operations
 */

import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { createProjectMiddleware } from '../lib/project-middleware';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import type { Env, AppEnv, GitHubContext, ProjectContext } from '../lib/context';
import * as GitHub from '../lib/github';
import * as Summary from '../lib/summary-service';

export function createSummaryRoutes(prisma: PrismaClient, _env: Env) {
  const app = new Hono<AppEnv>();
  
  app.use('*', authMiddleware, createProjectMiddleware(prisma, { 
    requireAccess: true, 
    withOctokit: true 
  }));

  /**
   * GET /
   * Get translation progress summary for all languages
   */
  app.get('/', async (c) => {
    const branch = c.req.query('branch') || 'main';
    const github = c.get('github') as GitHubContext;
    const project = c.get('project') as ProjectContext;

    // Step 1: Fetch manifest
    const manifest = await GitHub.Manifest.fetchManifest(
      github.octokit,
      github.owner,
      github.repo,
      branch
    );

    if (!manifest) {
      return c.json({ error: 'Manifest not found' }, 404);
    }

    // Step 2: Get all languages (except source)
    const languages = GitHub.Manifest.getLanguages(manifest)
      .filter(lang => lang !== project.sourceLanguage);

    // Step 3: Fetch progress data for each language in parallel
    const progressPromises = languages.map(async (lang) => {
      const data = await GitHub.Metadata.fetchProgressTranslated(
        github.octokit,
        github.owner,
        github.repo,
        lang,
        branch
      );
      return [lang, data] as const;
    });

    const progressResults = await Promise.all(progressPromises);
    const progressByLanguage = new Map(progressResults);

    // Step 4: Build summary using pure functions
    const summary = Summary.buildProjectSummary(
      project.sourceLanguage,
      manifest.files,
      progressByLanguage
    );

    const response = c.json(summary);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translationData));
    return response;
  });

  /**
   * GET /:language
   * Get progress summary for a specific language
   */
  app.get('/:language', async (c) => {
    const language = c.req.param('language');
    const branch = c.req.query('branch') || 'main';
    const github = c.get('github') as GitHubContext;

    // Step 1: Fetch manifest
    const manifest = await GitHub.Manifest.fetchManifest(
      github.octokit,
      github.owner,
      github.repo,
      branch
    );

    if (!manifest) {
      return c.json({ error: 'Manifest not found' }, 404);
    }

    // Step 2: Get entries for language
    const entries = GitHub.Manifest.getEntriesForLanguage(manifest, language);

    if (entries.length === 0) {
      return c.json({ error: `Language not found: ${language}` }, 404);
    }

    // Step 3: Fetch progress data
    const progressData = await GitHub.Metadata.fetchProgressTranslated(
      github.octokit,
      github.owner,
      github.repo,
      language,
      branch
    );

    // Step 4: Calculate summary
    const summary = Summary.calculateLanguageSummary(language, entries, progressData);

    const response = c.json(summary);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translationData));
    return response;
  });

  return app;
}
