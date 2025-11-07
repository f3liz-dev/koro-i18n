/**
 * Cloudflare Workers entry point with Hono integration
 * Implements serverless-friendly session management and environment variable handling
 * Optimized for Vite bundling
 */

import { ExecutionContext } from 'hono';
import { createWorkersApp } from './hono-workers-app';

export interface Env {
  // KV Namespaces for serverless storage
  SESSIONS: KVNamespace;
  TRANSLATIONS: KVNamespace;
  
  // GitHub OAuth configuration
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  
  // JWT secret for token signing
  JWT_SECRET: string;
  
  // Environment configuration
  ENVIRONMENT: string;
  
  // Optional CORS origins (comma-separated)
  CORS_ORIGINS?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const app = createWorkersApp(env);
      return await app.fetch(request, env, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  },
} satisfies ExportedHandler<Env>;