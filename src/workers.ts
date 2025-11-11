/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import { Octokit } from '@octokit/rest';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { PrismaClient } from './generated/prisma/';
import { PrismaD1 } from '@prisma/adapter-d1';

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

  // Initialize Prisma with D1 adapter
  const getPrisma = () => {
    const adapter = new PrismaD1(env.DB);
    return new PrismaClient({ adapter });
  };

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
    const prisma = getPrisma();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    await prisma.oauthState.create({
      data: {
        state,
        timestamp: Date.now(),
        expiresAt,
      },
    });
    
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
    const prisma = getPrisma();
    const stateData = await prisma.oauthState.findFirst({
      where: {
        state,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    
    if (!stateData) {
      return c.json({ error: 'Invalid or expired OAuth state' }, 400);
    }

    // Delete used state immediately to prevent replay attacks
    await prisma.oauthState.delete({
      where: { state },
    });

    try {
      const auth = await oauth({ type: 'oauth-user', code, state });
      const octokit = new Octokit({ auth: auth.token });
      const { data: profile } = await octokit.rest.users.getAuthenticated();
      
      const email = profile.email || `${profile.id}+${profile.login}@users.noreply.github.com`;

      const existingUser = await prisma.user.findUnique({
        where: { githubId: profile.id },
        select: { id: true },
      });

      let userId = existingUser?.id;
      if (!userId) {
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
        await prisma.user.update({
          where: { id: userId },
          data: {
            username: profile.login,
            email,
            avatarUrl: profile.avatar_url,
          },
        });
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
    const prisma = getPrisma();
    const historyId = crypto.randomUUID();
    await prisma.translationHistory.create({
      data: {
        id: historyId,
        translationId,
        projectId,
        language,
        key,
        value,
        userId,
        action,
        commitSha: commitSha || null,
      },
    });
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
    const prisma = getPrisma();
    const id = crypto.randomUUID();
    await prisma.translation.create({
      data: {
        id,
        projectId,
        language,
        key,
        value,
        userId: payload.userId,
        status: 'pending',
      },
    });

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

    const prisma = getPrisma();
    const where: any = { status };
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (language) {
      where.language = language;
    }

    const translations = await prisma.translation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return c.json({ translations });
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

    const prisma = getPrisma();
    const history = await prisma.translationHistory.findMany({
      where: {
        projectId,
        language,
        key,
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({ history });
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

    const prisma = getPrisma();
    const where: any = {
      projectId,
      status: { not: 'deleted' },
    };
    
    if (language) {
      where.language = language;
    }

    const suggestions = await prisma.translation.findMany({
      where,
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return c.json({ suggestions });
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
    
    const prisma = getPrisma();
    // Get translation details
    const translation = await prisma.translation.findUnique({
      where: { id },
    });

    if (!translation) return c.json({ error: 'Translation not found' }, 404);

    // Update status
    await prisma.translation.update({
      where: { id },
      data: {
        status: 'approved',
        updatedAt: new Date(),
      },
    });

    // Log approval
    await logHistory(id, translation.projectId, translation.language, translation.key, translation.value, payload.userId, 'approved');

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
    
    const prisma = getPrisma();
    // Get translation details
    const translation = await prisma.translation.findUnique({
      where: { id },
    });

    if (!translation) return c.json({ error: 'Translation not found' }, 404);

    // Update status to deleted
    await prisma.translation.update({
      where: { id },
      data: {
        status: 'deleted',
        updatedAt: new Date(),
      },
    });

    // Log deletion
    await logHistory(id, translation.projectId, translation.language, translation.key, translation.value, payload.userId, 'deleted');

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

    const prisma = getPrisma();
    const history = await prisma.translationHistory.findMany({
      where: {
        projectId,
        language,
        key,
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({ history });
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

    const prisma = getPrisma();
    // 1. Get project by name
    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: {
        id: true,
        userId: true,
        repository: true,
      },
    });

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
      const isMemberOrOwner = await prisma.$queryRaw<Array<{ exists: number }>>`
        SELECT 1 as exists FROM ProjectMember 
        WHERE projectId = ${project.id} AND userId = ${jwtPayload.userId} AND status = 'approved'
        UNION
        SELECT 1 as exists FROM Project WHERE id = ${project.id} AND userId = ${jwtPayload.userId}
        LIMIT 1
      `;

      if (isMemberOrOwner.length > 0 || env.ENVIRONMENT === 'development') {
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
        
        await prisma.projectFile.upsert({
          where: {
            projectId_branch_filename_lang: {
              projectId,
              branch: branch || 'main',
              filename,
              lang,
            },
          },
          update: {
            commitSha: commitSha || '',
            filetype,
            contents: JSON.stringify(contents),
            metadata: JSON.stringify(metadata || {}),
            uploadedAt: new Date(),
          },
          create: {
            id: fileId,
            projectId,
            branch: branch || 'main',
            commitSha: commitSha || '',
            filename,
            filetype,
            lang,
            contents: JSON.stringify(contents),
            metadata: JSON.stringify(metadata || {}),
          },
        });
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

  // Upload JSON files directly (native JSON upload)
  app.post('/api/projects/:projectName/upload-json', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401);
    }

    const projectName = c.req.param('projectName');
    const body = await c.req.json();
    const { branch, commitSha, language, files } = body;

    if (!files || typeof files !== 'object') {
      return c.json({ error: 'Missing required field: files (object with filename -> content mapping)' }, 400);
    }

    // Size limits
    const MAX_FILES = 100;
    const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB
    const payloadSize = JSON.stringify(body).length;

    if (Object.keys(files).length > MAX_FILES) {
      return c.json({ error: `Too many files. Max ${MAX_FILES} files per upload` }, 400);
    }

    if (payloadSize > MAX_PAYLOAD_SIZE) {
      return c.json({ error: `Payload too large. Max ${MAX_PAYLOAD_SIZE / 1024 / 1024}MB` }, 400);
    }

    // 1. Get project by name
    const prisma2 = getPrisma();
    const project = await prisma2.project.findUnique({
      where: { name: projectName },
      select: {
        id: true,
        userId: true,
        repository: true,
      },
    });

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
      const isMemberOrOwner = await prisma2.$queryRaw<Array<{ exists: number }>>`
        SELECT 1 as exists FROM ProjectMember 
        WHERE projectId = ${project.id} AND userId = ${jwtPayload.userId} AND status = 'approved'
        UNION
        SELECT 1 as exists FROM Project WHERE id = ${project.id} AND userId = ${jwtPayload.userId}
        LIMIT 1
      `;

      if (isMemberOrOwner.length > 0 || env.ENVIRONMENT === 'development') {
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
    console.log('Authorized JSON upload:', { 
      projectName,
      repository,
      ...uploadInfo,
      projectOwner: project.userId
    });

    const projectId = repository;

    // Helper function to flatten nested objects
    const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(result, flattenObject(value, newKey));
        } else {
          result[newKey] = String(value);
        }
      }
      return result;
    };

    try {
      // Process and store each JSON file
      const fileCount = Object.keys(files).length;
      
      for (const [filename, content] of Object.entries(files)) {
        const fileId = crypto.randomUUID();
        
        // Parse JSON content and flatten it
        let parsedContent: any;
        try {
          if (typeof content === 'string') {
            parsedContent = JSON.parse(content);
          } else {
            parsedContent = content;
          }
        } catch (error) {
          return c.json({ error: `Invalid JSON in file ${filename}` }, 400);
        }

        const flattened = flattenObject(parsedContent);
        
        await prisma2.projectFile.upsert({
          where: {
            projectId_branch_filename_lang: {
              projectId,
              branch: branch || 'main',
              filename,
              lang: language || 'en',
            },
          },
          update: {
            commitSha: commitSha || '',
            filetype: 'json',
            contents: JSON.stringify(flattened),
            metadata: JSON.stringify({
              keys: Object.keys(flattened).length,
              uploadMethod: 'json-direct'
            }),
            uploadedAt: new Date(),
          },
          create: {
            id: fileId,
            projectId,
            branch: branch || 'main',
            commitSha: commitSha || '',
            filename,
            filetype: 'json',
            lang: language || 'en',
            contents: JSON.stringify(flattened),
            metadata: JSON.stringify({
              keys: Object.keys(flattened).length,
              uploadMethod: 'json-direct'
            }),
          },
        });
      }

      return c.json({
        success: true,
        projectId,
        filesUploaded: fileCount,
        uploadedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('JSON upload error:', error);
      return c.json({ error: 'Failed to store files' }, 500);
    }
  });

  // Download translations for a project
  app.get('/api/projects/:projectName/download', async (c) => {
    let token = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const cookieToken = getCookie(c, 'auth_token');
      if (cookieToken) {
        token = cookieToken;
      } else {
        return c.json({ error: 'Authorization token required' }, 401);
      }
    }

    const projectName = c.req.param('projectName');
    const branch = c.req.query('branch') || 'main';
    const language = c.req.query('language');

    // Get project by name
    const prisma = getPrisma();
    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: {
        id: true,
        userId: true,
        repository: true,
      },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    const repository = project.repository;

    // Verify token
    const jwtPayload = await validateToken(token);
    if (!jwtPayload) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // Check if user has access to project
    const hasAccessResult = await prisma.$queryRaw<Array<{ exists: number }>>`
      SELECT 1 as exists FROM ProjectMember 
      WHERE projectId = ${project.id} AND userId = ${jwtPayload.userId} AND status = 'approved'
      UNION
      SELECT 1 as exists FROM Project WHERE id = ${project.id} AND userId = ${jwtPayload.userId}
      LIMIT 1
    `;

    if (hasAccessResult.length === 0 && env.ENVIRONMENT !== 'development') {
      return c.json({ error: 'Access denied to this project' }, 403);
    }

    // Query files
    const where: any = {
      projectId: repository,
      branch,
    };
    
    if (language) {
      where.lang = language;
    }

    const projectFiles = await prisma.projectFile.findMany({
      where,
      orderBy: [
        { lang: 'asc' },
        { filename: 'asc' },
      ],
    });

    // Group files by language and filename
    const filesByLang: Record<string, Record<string, any>> = {};
    
    for (const row of projectFiles) {
      const lang = row.lang;
      const filename = row.filename;
      const contents = JSON.parse(row.contents);
      
      if (!filesByLang[lang]) {
        filesByLang[lang] = {};
      }
      
      filesByLang[lang][filename] = contents;
    }

    return c.json({
      project: projectName,
      repository,
      branch,
      files: filesByLang,
      generatedAt: new Date().toISOString()
    });
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
    
    const prisma = getPrisma();
    // Try to find project by name first
    const project = await prisma.project.findUnique({
      where: { name: projectIdOrName },
      select: { repository: true },
    });
    
    if (project) {
      // Use repository as the actual projectId for file queries
      actualProjectId = project.repository;
    }

    const where: any = {
      projectId: actualProjectId,
      branch,
    };
    
    if (lang) {
      where.lang = lang;
    }

    const projectFiles = await prisma.projectFile.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    // Parse contents back to objects
    const files = projectFiles.map((row) => ({
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

    const prisma = getPrisma();
    // Check if name already exists
    const existingName = await prisma.project.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existingName) {
      return c.json({ error: 'Project name already taken' }, 400);
    }

    // Check if repository already registered
    const existingRepo = await prisma.project.findUnique({
      where: { repository },
      select: { id: true, name: true },
    });

    if (existingRepo) {
      return c.json({ 
        error: 'Repository already registered',
        existingProject: existingRepo.name
      }, 400);
    }

    try {
      await prisma.project.create({
        data: {
          id,
          userId: payload.userId,
          name,
          repository,
        },
      });

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
    const prisma = getPrisma();
    const owned = await prisma.project.findMany({
      where: { userId: payload.userId },
      select: {
        id: true,
        name: true,
        repository: true,
        userId: true,
        accessControl: true,
        createdAt: true,
      },
    });
    const ownedWithRole = owned.map(p => ({ ...p, role: 'owner' }));

    // Get projects user is a member of (approved only)
    const member = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: payload.userId,
            status: 'approved',
          },
        },
      },
      select: {
        id: true,
        name: true,
        repository: true,
        userId: true,
        accessControl: true,
        createdAt: true,
        members: {
          where: { userId: payload.userId },
          select: { role: true },
        },
      },
    });
    const memberWithRole = member.map(p => ({ 
      ...p, 
      role: p.members[0]?.role || 'member',
      members: undefined 
    }));

    const projects = [...ownedWithRole, ...memberWithRole];

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

    const prisma = getPrisma();
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: payload.userId,
      },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    await prisma.project.delete({
      where: { id },
    });

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

    const prisma = getPrisma();
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: payload.userId,
      },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    await prisma.project.update({
      where: { id },
      data: { accessControl },
    });

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

    const prisma = getPrisma();
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Check if already a member
    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: payload.userId,
        },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      return c.json({ error: 'Already requested or member', status: existing.status }, 400);
    }

    const memberId = crypto.randomUUID();
    await prisma.projectMember.create({
      data: {
        id: memberId,
        projectId,
        userId: payload.userId,
        status: 'pending',
        role: 'member',
      },
    });

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

    const prisma = getPrisma();
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Only project owner can see members
    if (project.userId !== payload.userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({ members });
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

    const prisma = getPrisma();
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Only project owner can approve
    if (project.userId !== payload.userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await prisma.projectMember.update({
      where: { id: memberId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

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

    const prisma = getPrisma();
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Only project owner can remove members
    if (project.userId !== payload.userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await prisma.projectMember.delete({
      where: { id: memberId },
    });

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

    const prisma = getPrisma();
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        repository: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({ projects });
  });

  app.get('/health', (c) => c.json({ status: 'ok', runtime: 'cloudflare-workers' }));

  // Prisma example endpoint - demonstrates using Prisma ORM with D1
  app.get('/api/prisma/users', async (c) => {
    try {
      const prisma = getPrisma();
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
        take: 10,
      });
      return c.json({ users, source: 'prisma-orm' });
    } catch (error) {
      console.error('Prisma error:', error);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }
  });

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
