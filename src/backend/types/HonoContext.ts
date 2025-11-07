/**
 * Extended Hono context types for our application
 */

import type { Context } from 'hono';

export interface AppVariables {
  requestId: string;
  user?: {
    userId: string;
    username: string;
    githubId: number;
    accessToken: string;
  };
}

export type AppContext = Context<{ Variables: AppVariables }>;