/**
 * Hono context types for the I18n Platform
 */

import type { Context } from 'hono';
import type { AuthService } from '../../api/services/AuthService.js';
import type { UserRepository, SessionStore, AuthSession } from './auth.js';

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

export interface HonoEnv {
  Variables: {
    user?: AuthSession;
    csrfToken?: string;
  };
  Bindings: {
    authService: AuthService;
    userRepository: UserRepository;
    sessionStore: SessionStore;
  };
}

export type HonoContext = Context<HonoEnv>;