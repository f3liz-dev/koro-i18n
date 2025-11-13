import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import { Octokit } from '@octokit/rest';
import { PrismaClient } from '../generated/prisma/';
import { createJWT, verifyJWT, extractToken, requireAuth } from '../lib/auth';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';

interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export function createAuthRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();
  const oauth = createOAuthAppAuth({
    clientType: 'oauth-app',
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  });

  app.get('/github', async (c) => {
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await prisma.oauthState.create({
      data: { state, timestamp: Date.now(), expiresAt },
    });
    
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      state,
    });
    
    return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  app.get('/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (!code || !state) {
      return c.json({ error: 'Missing code or state' }, 400);
    }

    const stateData = await prisma.oauthState.findFirst({
      where: { state, expiresAt: { gt: new Date() } },
    });
    
    if (!stateData) {
      return c.json({ error: 'Invalid or expired OAuth state' }, 400);
    }

    await prisma.oauthState.delete({ where: { state } });

    try {
      const auth = await oauth({ type: 'oauth-user', code, state });
      const octokit = new Octokit({ auth: auth.token });
      const { data: profile } = await octokit.rest.users.getAuthenticated();
      
      const email = profile.email || `${profile.id}+${profile.login}@users.noreply.github.com`;
      const existingUser = await prisma.user.findUnique({
        where: { githubId: profile.id },
        select: { id: true },
      });

      let userId: string;
      if (!existingUser) {
        userId = crypto.randomUUID();
        await prisma.user.create({
          data: {
            id: userId,
            githubId: profile.id,
            username: profile.login,
            email,
            avatarUrl: profile.avatar_url,
          },
        });
      } else {
        userId = existingUser.id;
        await prisma.user.update({
          where: { id: userId },
          data: { username: profile.login, email, avatarUrl: profile.avatar_url },
        });
      }

      const token = await createJWT(
        { id: userId, username: profile.login, githubId: profile.id },
        auth.token,
        env.JWT_SECRET
      );
      
      setCookie(c, 'auth_token', token, { 
        httpOnly: true, 
        maxAge: 86400, 
        path: '/',
        sameSite: 'Lax',
        secure: env.ENVIRONMENT === 'production'
      });

      return c.redirect('/dashboard');
    } catch (error) {
      console.error('OAuth error:', error);
      return c.json({ error: 'OAuth failed' }, 500);
    }
  });

  app.get('/me', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;
    
    const response = c.json({ 
      user: { 
        id: payload.userId, 
        username: payload.username, 
        githubId: payload.githubId 
      } 
    });
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.noCache));
    return response;
  });

  app.post('/logout', async (c) => {
    deleteCookie(c, 'auth_token');
    return c.json({ success: true });
  });

  return app;
}
