/**
 * Legacy handler - now replaced by hono-workers-app.ts
 * This file is kept for backward compatibility but is no longer used
 */

import { ExecutionContext } from 'hono';
import type { Env } from './index';

export function createWorkerHandler(_env: Env) {
  console.warn('createWorkerHandler is deprecated. Use createWorkersApp from hono-workers-app.ts instead.');
  
  return async (_request: Request, _ctx: ExecutionContext): Promise<Response> => {
    return new Response(
      JSON.stringify({ 
        error: 'DEPRECATED_HANDLER',
        message: 'This handler is deprecated. Please use the new Hono-based handler.' 
      }),
      {
        status: 501,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      }
    );
  };
}