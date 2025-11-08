import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from '@hono/node-server';
import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import { Octokit } from '@octokit/rest';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface Config {
  github: { clientId: string; clientSecret: string; redirectUri: string };
  jwtSecret: string;
  corsOrigin?: string[];
  port?: number;
}

interface User {
  id: string;
  githubId: number;
  username: string;
  email: string;
  avatarUrl?: string;
  accessToken: string;
}

class Store {
  private users = new Map<string, User>();
  private oauthStates = new Map<string, any>();

  async createUser(data: Omit<User, 'id'>): Promise<User> {
    const id = crypto.randomUUID();
    const user = { id, ...data };
    this.users.set(id, user);
    return user;
  }

  async findUserByGithubId(githubId: number): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.githubId === githubId) || null;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  storeOAuthState(state: string, data: any): void {
    this.oauthStates.set(state, data);
    setTimeout(() => this.oauthStates.delete(state), 600000);
  }

  getOAuthState(state: string): any {
    return this.oauthStates.get(state);
  }

  deleteOAuthState(state: string): void {
    this.oauthStates.delete(state);
  }
}

export function createServer(config: Config) {
  const app = new Hono();
  const store = new Store();
  const oauth = createOAuthAppAuth({
    clientType: 'oauth-app',
    clientId: config.github.clientId,
    clientSecret: config.github.clientSecret,
  });

  const encryptToken = (token: string): string => {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(config.jwtSecret, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    return iv.toString('hex') + ':' + cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
  };

  const generateJWT = (user: User): string => {
    return jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        githubId: user.githubId,
        accessToken: user.accessToken // Include encrypted token in JWT
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
  };

  const validateToken = async (token: string): Promise<any | null> => {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as any;
      return payload; // JWT is stateless, no session lookup needed
    } catch {
      return null;
    }
  };

  app.use('*', logger());
  app.use('*', secureHeaders());
  app.use('*', cors({
    origin: config.corsOrigin || ['http://localhost:5173'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }));

  app.get('/api/auth/github', async (c) => {
    const state = crypto.randomBytes(32).toString('hex');
    store.storeOAuthState(state, { state, timestamp: Date.now() });
    setCookie(c, 'oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' });
    
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: config.github.redirectUri,
      scope: 'user:email',
      state,
    });
    
    return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  app.get('/api/auth/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const cookieState = getCookie(c, 'oauth_state');

    if (!code || !state || cookieState !== state) {
      return c.json({ error: 'Invalid OAuth state' }, 400);
    }

    const stateData = store.getOAuthState(state);
    if (!stateData || Date.now() - stateData.timestamp > 600000) {
      return c.json({ error: 'Expired OAuth state' }, 400);
    }

    try {
      const auth = await oauth({ type: 'oauth-user', code, state });
      const octokit = new Octokit({ auth: auth.token });
      const { data: profile } = await octokit.rest.users.getAuthenticated();
      
      let email = profile.email;
      if (!email) {
        const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
        email = emails.find(e => e.primary)?.email || '';
      }

      let user = await store.findUserByGithubId(profile.id);
      if (!user) {
        user = await store.createUser({
          githubId: profile.id,
          username: profile.login,
          email,
          avatarUrl: profile.avatar_url,
          accessToken: encryptToken(auth.token),
        });
      } else {
        user = await store.updateUser(user.id, {
          username: profile.login,
          email,
          avatarUrl: profile.avatar_url,
          accessToken: encryptToken(auth.token),
        });
      }

      const token = generateJWT(user);
      setCookie(c, 'auth_token', token, { httpOnly: true, maxAge: 86400, path: '/' });
      deleteCookie(c, 'oauth_state');
      store.deleteOAuthState(state);

      return c.json({
        success: true,
        user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
      });
    } catch (error) {
      store.deleteOAuthState(state);
      return c.json({ error: 'OAuth failed' }, 500);
    }
  });

  app.get('/api/auth/me', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'No token' }, 401);

    const payload = await validateToken(token);
    if (!payload) {
      deleteCookie(c, 'auth_token');
      return c.json({ error: 'Invalid token' }, 401);
    }

    return c.json({ user: { id: payload.userId, username: payload.username, githubId: payload.githubId } });
  });

  app.post('/api/auth/logout', async (c) => {
    // JWT is stateless, just clear the cookie
    deleteCookie(c, 'auth_token');
    return c.json({ success: true });
  });

  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/', (c) => c.json({ name: 'I18n Platform API', version: '1.0.0' }));

  return app;
}

export async function startServer(config: Config) {
  const app = createServer(config);
  const port = config.port || 3000;
  
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
  console.log(`Server running on http://localhost:${port}`);
}
