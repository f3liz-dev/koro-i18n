/**
 * Hono context type extensions
 */

import type { Context } from 'hono';
import type { AuthService } from '../services/AuthService.js';
import type { UserRepository, SessionStore } from './User.js';
import type { AuthSession } from '../../shared/types/auth.js';

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