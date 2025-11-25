import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import { Octokit } from '@octokit/rest';
import { PrismaClient } from '@prisma/client';
import { createJWT, authMiddleware } from '../lib/auth';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';

interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  Variables: {
    user: any;
  };
}

export function createAuthRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono<{ Bindings: Env }>();

  const oauth = createOAuthAppAuth({
    clientType: 'oauth-app',
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  });

  const setAuthCookie = (c: any, token: string) =>
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      maxAge: 86400,
      path: '/',
      sameSite: 'Lax',
      secure: env.ENVIRONMENT === 'production',
    });

  async function upsertUserFromProfile(profile: any, accessToken: string) {
    const email = profile.email || `${profile.id}+${profile.login}@users.noreply.github.com`;
    const existing = await prisma.user.findUnique({
      where: { githubId: profile.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { 
          username: profile.login, 
          email, 
          avatarUrl: profile.avatar_url,
          githubAccessToken: accessToken, // Store GitHub access token
        },
      });
      return existing.id;
    }

    const id = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id,
        githubId: profile.id,
        username: profile.login,
        email,
        avatarUrl: profile.avatar_url,
        githubAccessToken: accessToken, // Store GitHub access token
      },
    });
    return id;
  }

  app.get('/github', async (c) => {
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oauthState.create({
      data: { state, timestamp: Date.now(), expiresAt },
    });

    // No scope = read-only access to public information only (user profile, public repository metadata)
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      state,
    });

    return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  app.get('/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (!code || !state) return c.json({ error: 'Missing code or state' }, 400);

    const stateData = await prisma.oauthState.findFirst({
      where: { state, expiresAt: { gt: new Date() } },
    });
    if (!stateData) return c.json({ error: 'Invalid or expired OAuth state' }, 400);

    await prisma.oauthState.delete({ where: { state } });

    try {
      const auth = await oauth({ type: 'oauth-user', code, state });
      const octokit = new Octokit({ auth: auth.token });
      const { data: profile } = await octokit.rest.users.getAuthenticated();

      const userId = await upsertUserFromProfile(profile, auth.token);

      const token = await createJWT(
        { id: userId, username: profile.login, githubId: profile.id },
        auth.token,
        env.JWT_SECRET
      );

      setAuthCookie(c, token);
      return c.redirect('/dashboard');
    } catch (err) {
      console.error('OAuth callback error:', err);
      return c.json({ error: 'OAuth failed' }, 500);
    }
  });

  app.get('/me', authMiddleware, async (c) => {
    const user = c.get('user');

    const response = c.json({
      user: {
        id: user.userId,
        username: user.username,
        githubId: user.githubId,
      },
    });
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.auth));
    return response;
  });

  app.post('/logout', async (c) => {
    deleteCookie(c, 'auth_token');
    return c.json({ success: true });
  });

  return app;
}
