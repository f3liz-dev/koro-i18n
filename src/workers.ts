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

    // Allow multiple suggestions per key from same or different users
    // Each suggestion is a separate entry
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
      `SELECT th.*, u.username, u.avatarUrl 
       FROM translation_history th 
       LEFT JOIN users u ON th.userId = u.id 
       WHERE th.projectId = ? AND th.language = ? AND th.key = ? 
       ORDER BY th.createdAt DESC`
    ).bind(projectId, language, key).all();

    return c.json({ history: result.results });
  });

  // Get all translation suggestions with user info (public view)
  app.get('/api/translations/suggestions', async (c) => {
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

    if (!projectId) {
      return c.json({ error: 'Missing projectId parameter' }, 400);
    }

    let query = `
      SELECT t.*, u.username, u.avatarUrl 
      FROM translations t 
      JOIN users u ON t.userId = u.id 
      WHERE t.projectId = ? AND t.status != 'deleted'
    `;
    const params: any[] = [projectId];

    if (language) {
      query += ' AND t.language = ?';
      params.push(language);
    }

    query += ' ORDER BY t.createdAt DESC LIMIT 500';

    const result = await env.DB.prepare(query).bind(...params).all();
    return c.json({ suggestions: result.results });
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

  // Upload project files from GitHub Actions (OIDC + Project Name)
  app.post('/api/projects/:projectName/upload', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401);
    }

    const projectName = c.req.param('projectName');
    const body = await c.req.json();
    const { branch, commitSha, files } = body;

    if (!files || !Array.isArray(files)) {
      return c.json({ error: 'Missing required field: files' }, 400);
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

    // 1. Get project by name
    const project = await env.DB.prepare(
      'SELECT id, userId, repository FROM projects WHERE name = ?'
    ).bind(projectName).first();

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    const repository = project.repository as string;

    // 2. Verify token (OIDC in production, JWT in development)
    let uploadAuthorized = false;
    let uploadInfo: any = {};

    // Try JWT first (for development/testing)
    const jwtPayload = await validateToken(token);
    if (jwtPayload) {
      // JWT authentication - check if user owns or is member of project
      const isMember = await env.DB.prepare(
        `SELECT 1 FROM project_members 
         WHERE projectId = ? AND userId = ? AND status = 'approved'
         UNION
         SELECT 1 FROM projects WHERE id = ? AND userId = ?`
      ).bind(project.id, jwtPayload.userId, project.id, jwtPayload.userId).first();

      if (isMember || env.ENVIRONMENT === 'development') {
        uploadAuthorized = true;
        uploadInfo = {
          method: 'JWT',
          userId: jwtPayload.userId,
          username: jwtPayload.username
        };
      }
    } else {
      // Try OIDC (for GitHub Actions)
      try {
        const { verifyGitHubOIDCToken } = await import('./oidc.js');
        const oidcPayload = await verifyGitHubOIDCToken(
          token,
          new URL(c.req.url).origin,
          repository
        );

        // Verify OIDC token repository matches project repository
        if (oidcPayload.repository === repository) {
          uploadAuthorized = true;
          uploadInfo = {
            method: 'OIDC',
            repository: oidcPayload.repository,
            actor: oidcPayload.actor,
            workflow: oidcPayload.workflow
          };
        } else {
          return c.json({ 
            error: 'Repository mismatch',
            projectRepository: repository,
            tokenRepository: oidcPayload.repository
          }, 403);
        }
      } catch (error: any) {
        return c.json({ error: `Authentication failed: ${error.message}` }, 401);
      }
    }

    if (!uploadAuthorized) {
      return c.json({ error: 'Unauthorized to upload to this project' }, 403);
    }

    // All checks passed! Upload is authorized.
    console.log('Authorized upload:', { 
      projectName,
      repository,
      ...uploadInfo,
      projectOwner: project.userId
    });

    const projectId = repository;

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

    const projectIdOrName = c.req.param('projectId');
    const branch = c.req.query('branch') || 'main';
    const lang = c.req.query('lang');

    // Look up repository from project name (projectId could be name or repository)
    let actualProjectId = projectIdOrName;
    
    // Try to find project by name first
    const project = await env.DB.prepare(
      'SELECT repository FROM projects WHERE name = ?'
    ).bind(projectIdOrName).first();
    
    if (project) {
      // Use repository as the actual projectId for file queries
      actualProjectId = project.repository as string;
    }

    let query = 'SELECT * FROM project_files WHERE projectId = ? AND branch = ?';
    const params: any[] = [actualProjectId, branch];

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





  // Create a project
  app.post('/api/projects', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const body = await c.req.json();
    const { name, repository } = body;

    if (!name || !repository) {
      return c.json({ error: 'Missing name or repository' }, 400);
    }

    // Validate project name (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return c.json({ error: 'Invalid project name. Use only letters, numbers, hyphens, and underscores' }, 400);
    }

    // Validate repository format
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(repository)) {
      return c.json({ error: 'Invalid repository format. Use: owner/repo' }, 400);
    }

    const id = crypto.randomUUID();

    // Check if name already exists
    const existingName = await env.DB.prepare(
      'SELECT id FROM projects WHERE name = ?'
    ).bind(name).first();

    if (existingName) {
      return c.json({ error: 'Project name already taken' }, 400);
    }

    // Check if repository already registered
    const existingRepo = await env.DB.prepare(
      'SELECT id, name FROM projects WHERE repository = ?'
    ).bind(repository).first();

    if (existingRepo) {
      return c.json({ 
        error: 'Repository already registered',
        existingProject: existingRepo.name
      }, 400);
    }

    try {
      await env.DB.prepare(
        'INSERT INTO projects (id, userId, name, repository) VALUES (?, ?, ?, ?)'
      ).bind(id, payload.userId, name, repository).run();

      return c.json({ success: true, id, name, repository });
    } catch (error: any) {
      console.error('Failed to create project:', error);
      return c.json({ error: 'Failed to create project' }, 500);
    }
  });

  // List user's projects (owned + member of)
  app.get('/api/projects', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    // Get owned projects
    const owned = await env.DB.prepare(
      'SELECT id, name, repository, userId, accessControl, createdAt, "owner" as role FROM projects WHERE userId = ?'
    ).bind(payload.userId).all();

    // Get projects user is a member of (approved only)
    const member = await env.DB.prepare(
      `SELECT p.id, p.name, p.repository, p.userId, p.accessControl, p.createdAt, pm.role 
       FROM projects p 
       JOIN project_members pm ON p.id = pm.projectId 
       WHERE pm.userId = ? AND pm.status = 'approved'`
    ).bind(payload.userId).all();

    const projects = [...owned.results, ...member.results];

    return c.json({ projects });
  });

  // Delete a project
  app.delete('/api/projects/:id', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const id = c.req.param('id');

    const project = await env.DB.prepare(
      'SELECT id FROM projects WHERE id = ? AND userId = ?'
    ).bind(id, payload.userId).first();

    if (!project) return c.json({ error: 'Project not found' }, 404);

    await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();

    return c.json({ success: true });
  });

  // Update project access control
  app.patch('/api/projects/:id', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const id = c.req.param('id');
    const body = await c.req.json();
    const { accessControl } = body;

    if (!accessControl || !['whitelist', 'blacklist'].includes(accessControl)) {
      return c.json({ error: 'Invalid accessControl value' }, 400);
    }

    const project = await env.DB.prepare(
      'SELECT id FROM projects WHERE id = ? AND userId = ?'
    ).bind(id, payload.userId).first();

    if (!project) return c.json({ error: 'Project not found' }, 404);

    await env.DB.prepare(
      'UPDATE projects SET accessControl = ? WHERE id = ?'
    ).bind(accessControl, id).run();

    return c.json({ success: true });
  });

  // Request to join a project
  app.post('/api/projects/:id/join', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const projectId = c.req.param('id');

    const project = await env.DB.prepare(
      'SELECT id, userId FROM projects WHERE id = ?'
    ).bind(projectId).first();

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Check if already a member
    const existing = await env.DB.prepare(
      'SELECT id, status FROM project_members WHERE projectId = ? AND userId = ?'
    ).bind(projectId, payload.userId).first();

    if (existing) {
      return c.json({ error: 'Already requested or member', status: existing.status }, 400);
    }

    const memberId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO project_members (id, projectId, userId, status, role) VALUES (?, ?, ?, ?, ?)'
    ).bind(memberId, projectId, payload.userId, 'pending', 'member').run();

    return c.json({ success: true, status: 'pending' });
  });

  // Get project members
  app.get('/api/projects/:id/members', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const projectId = c.req.param('id');

    const project = await env.DB.prepare(
      'SELECT id, userId FROM projects WHERE id = ?'
    ).bind(projectId).first();

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Only project owner can see members
    if (project.userId !== payload.userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const result = await env.DB.prepare(
      `SELECT pm.*, u.username, u.avatarUrl 
       FROM project_members pm 
       JOIN users u ON pm.userId = u.id 
       WHERE pm.projectId = ? 
       ORDER BY pm.createdAt DESC`
    ).bind(projectId).all();

    return c.json({ members: result.results });
  });

  // Approve/reject member
  app.post('/api/projects/:id/members/:memberId/approve', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const projectId = c.req.param('id');
    const memberId = c.req.param('memberId');
    const body = await c.req.json();
    const { status } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const project = await env.DB.prepare(
      'SELECT id, userId FROM projects WHERE id = ?'
    ).bind(projectId).first();

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Only project owner can approve
    if (project.userId !== payload.userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await env.DB.prepare(
      'UPDATE project_members SET status = ?, updatedAt = datetime("now") WHERE id = ? AND projectId = ?'
    ).bind(status, memberId, projectId).run();

    return c.json({ success: true });
  });

  // Remove member
  app.delete('/api/projects/:id/members/:memberId', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const projectId = c.req.param('id');
    const memberId = c.req.param('memberId');

    const project = await env.DB.prepare(
      'SELECT id, userId FROM projects WHERE id = ?'
    ).bind(projectId).first();

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Only project owner can remove members
    if (project.userId !== payload.userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await env.DB.prepare(
      'DELETE FROM project_members WHERE id = ? AND projectId = ?'
    ).bind(memberId, projectId).run();

    return c.json({ success: true });
  });

  // List all projects (for joining)
  app.get('/api/projects/all', async (c) => {
    let token = getCookie(c, 'auth_token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await validateToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    const result = await env.DB.prepare(
      'SELECT id, name, repository, userId, createdAt FROM projects ORDER BY createdAt DESC'
    ).bind().all();

    return c.json({ projects: result.results });
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
