/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import { Octokit } from '@octokit/rest';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';

interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export function createWorkerApp(env: Env) {
  const app = new Hono();
  const oauth = createOAuthAppAuth({
    clientType: 'oauth-app',
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  });

  const generateJWT = (user: any, accessToken: string): string => {
    return jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        githubId: user.githubId,
        accessToken // Include GitHub token in JWT for API calls
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  };

  const validateToken = async (token: string): Promise<any> => {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      return payload; // JWT is stateless, no session lookup needed
    } catch {
      return null;
    }
  };

  app.use('*', logger());
  app.use('*', secureHeaders());
  app.use('*', cors({
    origin: env.ENVIRONMENT === 'development' 
      ? ['http://localhost:5173', 'http://localhost:3000']
      : ['https://i18n-platform.pages.dev'],
    credentials: true,
  }));

  app.get('/api/auth/github', async (c) => {
    const state = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO oauth_states (state, timestamp, expiresAt) VALUES (?, ?, datetime("now", "+10 minutes"))'
    ).bind(state, Date.now()).run();
    setCookie(c, 'oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' });
    
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.ENVIRONMENT === 'development'
        ? 'http://localhost:8787/api/auth/callback'
        : 'https://i18n-platform.workers.dev/api/auth/callback',
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

    const stateData = await env.DB.prepare(
      'SELECT * FROM oauth_states WHERE state = ? AND expiresAt > datetime("now")'
    ).bind(state).first();
    if (!stateData) return c.json({ error: 'Expired OAuth state' }, 400);

    try {
      const auth = await oauth({ type: 'oauth-user', code, state });
      const octokit = new Octokit({ auth: auth.token });
      const { data: profile } = await octokit.rest.users.getAuthenticated();
      
      let email = profile.email;
      if (!email) {
        const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
        email = emails.find(e => e.primary)?.email || '';
      }

      const existingUser = await env.DB.prepare(
        'SELECT id FROM users WHERE githubId = ?'
      ).bind(profile.id).first();

      let userId = existingUser?.id as string;
      if (!userId) {
        userId = crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO users (id, githubId, username, email, avatarUrl) VALUES (?, ?, ?, ?, ?)'
        ).bind(userId, profile.id, profile.login, email, profile.avatar_url).run();
      } else {
        await env.DB.prepare(
          'UPDATE users SET username = ?, email = ?, avatarUrl = ? WHERE id = ?'
        ).bind(profile.login, email, profile.avatar_url, userId).run();
      }

      const token = generateJWT({ id: userId, username: profile.login, githubId: profile.id }, auth.token);
      setCookie(c, 'auth_token', token, { httpOnly: true, maxAge: 86400, path: '/' });
      deleteCookie(c, 'oauth_state');
      await env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();

      return c.json({ 
        success: true, 
        user: { id: userId, username: profile.login, email, avatarUrl: profile.avatar_url }
      });
    } catch (error) {
      await env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
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

    const session = await validateToken(token);
    if (!session) {
      deleteCookie(c, 'auth_token');
      return c.json({ error: 'Invalid token' }, 401);
    }

    return c.json({ user: { id: session.userId, username: session.username, githubId: session.githubId } });
  });

  app.post('/api/auth/logout', async (c) => {
    // JWT is stateless, just clear the cookie
    deleteCookie(c, 'auth_token');
    return c.json({ success: true });
  });

  // Helper to log translation history
  const logHistory = async (translationId: string, projectId: string, language: string, key: string, value: string, userId: string, action: string, commitSha?: string) => {
    const historyId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO translation_history (id, translationId, projectId, language, key, value, userId, action, commitSha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(historyId, translationId, projectId, language, key, value, userId, action, commitSha || null).run();
  };

  // Translation endpoints
  app.post('/api/translations', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const body = await c.req.json();
    const { projectId, language, key, value } = body;

    if (!projectId || !language || !key || !value) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO translations (id, projectId, language, key, value, userId, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, projectId, language, key, value, payload.userId, 'pending').run();

    // Log submission
    await logHistory(id, projectId, language, key, value, payload.userId, 'submitted');

    return c.json({ success: true, id });
  });

  app.get('/api/translations', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const projectId = c.req.query('projectId');
    const language = c.req.query('language');
    const status = c.req.query('status') || 'pending';

    let query = 'SELECT * FROM translations WHERE status = ?';
    const params = [status];

    if (projectId) {
      query += ' AND projectId = ?';
      params.push(projectId);
    }

    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }

    query += ' ORDER BY createdAt DESC LIMIT 100';

    const result = await env.DB.prepare(query).bind(...params).all();
    return c.json({ translations: result.results });
  });

  // Get translation history for a specific key
  app.get('/api/translations/history', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const projectId = c.req.query('projectId');
    const language = c.req.query('language');
    const key = c.req.query('key');

    if (!projectId || !language || !key) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    const result = await env.DB.prepare(
      'SELECT * FROM translation_history WHERE projectId = ? AND language = ? AND key = ? ORDER BY createdAt DESC'
    ).bind(projectId, language, key).all();

    return c.json({ history: result.results });
  });

  // Approve a translation
  app.post('/api/translations/:id/approve', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const id = c.req.param('id');
    
    // Get translation details
    const translation = await env.DB.prepare(
      'SELECT * FROM translations WHERE id = ?'
    ).bind(id).first();

    if (!translation) return c.json({ error: 'Translation not found' }, 404);

    // Update status
    await env.DB.prepare(
      'UPDATE translations SET status = ?, updatedAt = datetime("now") WHERE id = ?'
    ).bind('approved', id).run();

    // Log approval
    await logHistory(id, translation.projectId as string, translation.language as string, translation.key as string, translation.value as string, payload.userId, 'approved');

    return c.json({ success: true });
  });

  // Delete a translation
  app.delete('/api/translations/:id', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const id = c.req.param('id');
    
    // Get translation details
    const translation = await env.DB.prepare(
      'SELECT * FROM translations WHERE id = ?'
    ).bind(id).first();

    if (!translation) return c.json({ error: 'Translation not found' }, 404);

    // Update status to deleted
    await env.DB.prepare(
      'UPDATE translations SET status = ?, updatedAt = datetime("now") WHERE id = ?'
    ).bind('deleted', id).run();

    // Log deletion
    await logHistory(id, translation.projectId as string, translation.language as string, translation.key as string, translation.value as string, payload.userId, 'deleted');

    return c.json({ success: true });
  });

  // Serve static logs (generated by GitHub Actions)
  app.get('/api/logs/history', async (c) => {
    // In production, this would fetch from GitHub Pages or CDN
    // For now, return from D1 directly
    const projectId = c.req.query('projectId');
    const language = c.req.query('language');
    const key = c.req.query('key');

    if (!projectId || !language || !key) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    const result = await env.DB.prepare(
      'SELECT * FROM translation_history WHERE projectId = ? AND language = ? AND key = ? ORDER BY createdAt DESC'
    ).bind(projectId, language, key).all();

    return c.json({ history: result.results });
  });

  // Upload project files from client (GitHub Actions)
  app.post('/api/projects/upload', async (c) => {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return c.json({ error: 'API key required' }, 401);
    }

    // Verify API key (should match a project's API key in database)
    // For now, accept any valid JWT token
    const payload = await validateToken(apiKey);
    if (!payload) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    const body = await c.req.json();
    const { repository, branch, commit, sourceLanguage, targetLanguages, files, generatedAt } = body;

    if (!repository || !files || !Array.isArray(files)) {
      return c.json({ error: 'Invalid payload' }, 400);
    }

    const projectId = repository; // e.g., "owner/repo"

    try {
      // Store each file
      for (const file of files) {
        const { filetype, filename, lang, contents, metadata } = file;

        const fileId = crypto.randomUUID();
        
        await env.DB.prepare(
          `INSERT OR REPLACE INTO project_files 
           (id, projectId, branch, commit, filename, filetype, lang, contents, metadata, uploadedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          fileId,
          projectId,
          branch,
          commit,
          filename,
          filetype,
          lang,
          JSON.stringify(contents),
          JSON.stringify(metadata || {})
        ).run();
      }

      return c.json({
        success: true,
        projectId,
        filesUploaded: files.length,
        uploadedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      return c.json({ error: 'Failed to store files' }, 500);
    }
  });

  // Get project files
  app.get('/api/projects/:projectId/files', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const projectId = c.req.param('projectId');
    const branch = c.req.query('branch') || 'main';
    const lang = c.req.query('lang');

    let query = 'SELECT * FROM project_files WHERE projectId = ? AND branch = ?';
    const params: any[] = [projectId, branch];

    if (lang) {
      query += ' AND lang = ?';
      params.push(lang);
    }

    query += ' ORDER BY uploadedAt DESC';

    const result = await env.DB.prepare(query).bind(...params).all();

    // Parse contents back to objects
    const files = result.results.map((row: any) => ({
      ...row,
      contents: JSON.parse(row.contents),
      metadata: JSON.parse(row.metadata || '{}')
    }));

    return c.json({ files });
  });





  app.get('/health', (c) => c.json({ status: 'ok', runtime: 'cloudflare-workers' }));
  app.get('/', (c) => c.json({ name: 'I18n Platform API', runtime: 'cloudflare-workers' }));

  return app;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const app = createWorkerApp(env);
      return await app.fetch(request, env, ctx);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
} satisfies ExportedHandler<Env>;
