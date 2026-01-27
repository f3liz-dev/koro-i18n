/**
 * File Routes - Main Router
 * 
 * DOP Pattern: Compose sub-routers for better organization
 * 
 * Routes:
 * - /manifest/* - Manifest operations
 * - /stream/* - File streaming
 * - /summary/* - Translation progress
 */

import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import type { Env, AppEnv } from '../lib/context';
import { createManifestRoutes } from './manifest';
import { createFileStreamRoutes } from './file-stream';
import { createSummaryRoutes } from './summary';

export function createFileRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono<AppEnv>();

  // Mount sub-routers
  app.route('/manifest', createManifestRoutes(prisma, env));
  app.route('/stream', createFileStreamRoutes(prisma, env));
  app.route('/summary', createSummaryRoutes(prisma, env));

  return app;
}
