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
  ASSETS?: Fetcher;
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
      ? ['http://localhost:5173', 'http://localhost:8787', 'http://localhost:3000']
      : ['https://i18n-platform.pages.dev'],
    credentials: true,
  }));

  app.get('/api/auth/github', async (c) => {
    const state = crypto.randomUUID();
    
    // Store state in database for verification (expires in 10 minutes)
    await env.DB.prepare(
      'INSERT INTO oauth_states (state, timestamp, expiresAt) VALUES (?, ?, datetime("now", "+10 minutes"))'
    ).bind(state, Date.now()).run();
    
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      state,
    });
    
    return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  app.get('/api/auth/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (!code || !state) {
      return c.json({ error: 'Missing code or state' }, 400);
    }

    // Verify state exists in database and hasn't expired
    const stateData = await env.DB.prepare(
      'SELECT * FROM oauth_states WHERE state = ? AND expiresAt > datetime("now")'
    ).bind(state).first();
    
    if (!stateData) {
      return c.json({ error: 'Invalid or expired OAuth state' }, 400);
    }

    // Delete used state immediately to prevent replay attacks
    await env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();

    try {
      const auth = await oauth({ type: 'oauth-user', code, state });
      const octokit = new Octokit({ auth: auth.token });
      const { data: profile } = await octokit.rest.users.getAuthenticated();
      
      const email = profile.email || `${profile.id}+${profile.login}@users.noreply.github.com`;

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
      setCookie(c, 'auth_token', token, { 
        httpOnly: true, 
        maxAge: 86400, 
        path: '/',
        sameSite: 'Lax',
        secure: false
      });

      // Redirect to frontend (same origin when using workers to serve frontend)
      return c.redirect('/dashboard');
    } catch (error) {
      console.error('OAuth error:', error);
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

  // Helper to hash API key
  const hashApiKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Helper to validate API key
  const validateApiKey = async (key: string, projectId: string): Promise<any> => {
    const keyHash = await hashApiKey(key);
    const apiKey = await env.DB.prepare(
      'SELECT * FROM api_keys WHERE keyHash = ? AND projectId = ? AND revoked = 0 AND (expiresAt IS NULL OR expiresAt > datetime("now"))'
    ).bind(keyHash, projectId).first();
    
    if (!apiKey) return null;
    
    // Update last used timestamp
    await env.DB.prepare(
      'UPDATE api_keys SET lastUsedAt = datetime("now") WHERE id = ?'
    ).bind(apiKey.id).run();
    
    return apiKey;
  };

  // Helper to check rate limit (100 uploads per hour)
  const checkRateLimit = async (apiKeyId: string): Promise<boolean> => {
    const result = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM api_key_usage WHERE apiKeyId = ? AND createdAt > datetime("now", "-1 hour")'
    ).bind(apiKeyId).first();
    
    return (result?.count as number || 0) < 100;
  };

  // Upload project files from client (GitHub Actions)
  app.post('/api/projects/upload', async (c) => {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return c.json({ error: 'API key required' }, 401);
    }

    const body = await c.req.json();
    const { repository, branch, commitSha, files } = body;

    if (!repository || !files || !Array.isArray(files)) {
      return c.json({ error: 'Invalid payload' }, 400);
    }

    // Size limits
    const MAX_FILES = 100;
    const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB
    const payloadSize = JSON.stringify(body).length;

    if (files.length > MAX_FILES) {
      return c.json({ error: `Too many files. Max ${MAX_FILES} files per upload` }, 400);
    }

    if (payloadSize > MAX_PAYLOAD_SIZE) {
      return c.json({ error: `Payload too large. Max ${MAX_PAYLOAD_SIZE / 1024 / 1024}MB` }, 400);
    }

    const projectId = repository; // e.g., "owner/repo"

    // Validate API key
    const validKey = await validateApiKey(apiKey, projectId);
    if (!validKey) {
      return c.json({ error: 'Invalid or revoked API key' }, 401);
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(validKey.id as string);
    if (!withinLimit) {
      return c.json({ error: 'Rate limit exceeded. Max 100 uploads per hour' }, 429);
    }

    try {
      // Store each file
      for (const file of files) {
        const { filetype, filename, lang, contents, metadata } = file;
        const fileId = crypto.randomUUID();
        
        await env.DB.prepare(
          `INSERT OR REPLACE INTO project_files 
           (id, projectId, branch, commitSha, filename, filetype, lang, contents, metadata, uploadedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          fileId,
          projectId,
          branch || 'main',
          commitSha || '',
          filename,
          filetype,
          lang,
          JSON.stringify(contents),
          JSON.stringify(metadata || {})
        ).run();
      }

      // Log usage
      const usageId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO api_key_usage (id, apiKeyId, endpoint, filesCount, payloadSize, success) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(usageId, validKey.id, '/api/projects/upload', files.length, payloadSize, 1).run();

      return c.json({
        success: true,
        projectId,
        filesUploaded: files.length,
        uploadedAt: new Date().toISOString()
      });
    } catch (error: any) {
      // Log failed usage
      const usageId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO api_key_usage (id, apiKeyId, endpoint, filesCount, payloadSize, success) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(usageId, validKey.id, '/api/projects/upload', files.length, payloadSize, 0).run();
      
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





  // Generate API key for a project
  app.post('/api/keys', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const body = await c.req.json();
    const { projectId, name } = body;

    if (!projectId || !name) {
      return c.json({ error: 'Missing projectId or name' }, 400);
    }

    // Generate random API key (32 bytes = 64 hex chars)
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    const apiKey = Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const keyHash = await hashApiKey(apiKey);

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO api_keys (id, userId, projectId, keyHash, name) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, payload.userId, projectId, keyHash, name).run();

    // Return the key only once (never stored in plain text)
    return c.json({
      success: true,
      id,
      key: apiKey,
      projectId,
      name,
      message: 'Save this key securely. It will not be shown again.'
    });
  });

  // List API keys for user
  app.get('/api/keys', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const result = await env.DB.prepare(
      'SELECT id, projectId, name, lastUsedAt, createdAt, expiresAt, revoked FROM api_keys WHERE userId = ? ORDER BY createdAt DESC'
    ).bind(payload.userId).all();

    return c.json({ keys: result.results });
  });

  // Revoke API key
  app.delete('/api/keys/:id', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const id = c.req.param('id');

    // Verify ownership
    const key = await env.DB.prepare(
      'SELECT id FROM api_keys WHERE id = ? AND userId = ?'
    ).bind(id, payload.userId).first();

    if (!key) return c.json({ error: 'Key not found' }, 404);

    await env.DB.prepare(
      'UPDATE api_keys SET revoked = 1 WHERE id = ?'
    ).bind(id).run();

    return c.json({ success: true });
  });

  app.get('/health', (c) => c.json({ status: 'ok', runtime: 'cloudflare-workers' }));

  return app;
}

// Serve static frontend files in production
async function serveStatic(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  let path = url.pathname;
  
  // Default to index.html for root and non-API routes
  if (path === '/' || (!path.startsWith('/api') && !path.includes('.'))) {
    path = '/index.html';
  }

  try {
    // In production, assets are bundled with the worker
    // @ts-ignore - assets is injected by Wrangler
    const asset = await env.ASSETS.fetch(new URL(path, request.url));
    return asset;
  } catch {
    // Fallback to index.html for SPA routing
    try {
      // @ts-ignore
      return await env.ASSETS.fetch(new URL('/index.html', request.url));
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // Handle API routes with Hono
      if (url.pathname.startsWith('/api') || url.pathname === '/health') {
        const app = createWorkerApp(env);
        return await app.fetch(request, env, ctx);
      }
      
      // Serve static frontend files
      if (env.ASSETS) {
        return await serveStatic(request, env);
      }
      
      // Development mode: proxy to Vite
      return new Response('Frontend not built. Run in dev mode with separate Vite server.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
} satisfies ExportedHandler<Env>;
