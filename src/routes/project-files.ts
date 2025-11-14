import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { PrismaClient } from '../generated/prisma/';
import { verifyJWT, requireAuth } from '../lib/auth';
import { checkProjectAccess, flattenObject } from '../lib/database';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { generateFilesETag, checkETagMatch, create304Response } from '../lib/etag-db';

interface Env {
  JWT_SECRET: string;
  ENVIRONMENT: string;
  PLATFORM_URL?: string;
}

const MAX_FILES = 500;
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_CONTENT_SIZE = 1 * 1024 * 1024; // 1MB per file content (D1 parameter limit)

/**
 * Safely parse JSON with error handling and validation
 */
function safeJSONParse<T = any>(jsonString: string, fallback: T, context: string): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error: any) {
    console.error(`[${context}] JSON parse error:`, error.message);
    console.error(`[${context}] Problematic JSON (first 200 chars):`, jsonString.substring(0, 200));
    return fallback;
  }
}

/**
 * Safely stringify JSON with validation to ensure it can be parsed back
 */
function safeJSONStringify(data: any, context: string): string {
  try {
    const jsonString = JSON.stringify(data);
    
    // Validate that it can be parsed back
    JSON.parse(jsonString);
    
    // Check size limit
    if (jsonString.length > MAX_FILE_CONTENT_SIZE) {
      throw new Error(`JSON string exceeds size limit: ${jsonString.length} > ${MAX_FILE_CONTENT_SIZE}`);
    }
    
    return jsonString;
  } catch (error: any) {
    console.error(`[${context}] JSON stringify error:`, error.message);
    throw error;
  }
}

export function createProjectFileRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();

  async function validateUploadAuth(token: string, projectId: string, repository: string, jwtSecret: string) {
    // Try OIDC verification first (OIDC tokens are more specific with GitHub issuer)
    try {
      const { verifyGitHubOIDCToken } = await import('../oidc.js');
      // Use platform URL as audience for OIDC token verification
      const platformUrl = env.PLATFORM_URL || 'https://koro.f3liz.workers.dev';
      const oidcPayload = await verifyGitHubOIDCToken(token, platformUrl, repository);

      if (oidcPayload.repository === repository) {
        return {
          authorized: true,
          method: 'OIDC',
          repository: oidcPayload.repository,
          actor: oidcPayload.actor,
          workflow: oidcPayload.workflow
        };
      }
      
      // OIDC token is valid but repository doesn't match
      return {
        authorized: false,
        error: `Repository mismatch: token is for ${oidcPayload.repository}, but project repository is ${repository}`
      };
    } catch (oidcError: any) {
      // OIDC verification failed, try JWT verification as fallback
      const jwtPayload = await verifyJWT(token, jwtSecret);
      
      if (jwtPayload) {
        // JWT upload is only allowed in development environment
        if (env.ENVIRONMENT === 'development') {
          const hasAccess = await checkProjectAccess(prisma, projectId, jwtPayload.userId);
          if (hasAccess) {
            return { authorized: true, method: 'JWT', userId: jwtPayload.userId, username: jwtPayload.username };
          }
        }
      }
      
      // If we get here, both OIDC and JWT verification failed
      return {
        authorized: false,
        error: `Authentication failed: ${oidcError.message}`
      };
    }
  }

  app.post('/:projectName/upload', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401);
    }

    const projectName = c.req.param('projectName');
    const body = await c.req.json();
    const { branch, commitSha, sourceLanguage, targetLanguages, files } = body;

    if (!files || !Array.isArray(files)) {
      return c.json({ error: 'Missing required field: files' }, 400);
    }

    if (files.length > MAX_FILES) {
      return c.json({ error: `Too many files. Max ${MAX_FILES} files per upload` }, 400);
    }

    if (JSON.stringify(body).length > MAX_PAYLOAD_SIZE) {
      return c.json({ error: `Payload too large. Max ${MAX_PAYLOAD_SIZE / 1024 / 1024}MB` }, 400);
    }

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true, sourceLanguage: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    try {
      const authResult = await validateUploadAuth(token, project.id, project.repository, env.JWT_SECRET);
      if (!authResult.authorized) {
        const errorMessage = authResult.error || 'Unauthorized to upload to this project';
        console.error(`[upload] Authorization failed: ${errorMessage}`);
        return c.json({ error: errorMessage }, 403);
      }

      // Update project sourceLanguage if provided in the upload payload
      if (sourceLanguage && sourceLanguage !== project.sourceLanguage) {
        // Validate sourceLanguage format (e.g., "en", "en-US", "zh-CN")
        if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(sourceLanguage)) {
          return c.json({ error: 'Invalid sourceLanguage format. Expected format: "en" or "en-US"' }, 400);
        }
        
        await prisma.project.update({
          where: { id: project.id },
          data: { sourceLanguage },
        });
        console.log(`[upload] Updated project ${projectName} sourceLanguage to: ${sourceLanguage}`);
      }

      const projectId = project.repository;
      
      // Get userId for creating translation entries
      const uploadUserId = authResult.userId || project.userId;

      // Pre-validate all files for size limits before processing
      const fileSizeErrors: string[] = [];
      for (const file of files) {
        const { filename, lang, contents, metadata, structureMap } = file;
        const flattened = flattenObject(contents || {});
        
        // Check contents size
        const contentsStr = JSON.stringify(flattened);
        if (contentsStr.length > MAX_FILE_CONTENT_SIZE) {
          const sizeMB = (contentsStr.length / 1024 / 1024).toFixed(2);
          const maxMB = (MAX_FILE_CONTENT_SIZE / 1024 / 1024).toFixed(2);
          fileSizeErrors.push(`${filename} (${lang}): contents ${sizeMB}MB exceeds ${maxMB}MB limit`);
        }
        
        // Check metadata size
        if (metadata) {
          const metadataStr = JSON.stringify(metadata);
          if (metadataStr.length > MAX_FILE_CONTENT_SIZE) {
            const sizeMB = (metadataStr.length / 1024 / 1024).toFixed(2);
            const maxMB = (MAX_FILE_CONTENT_SIZE / 1024 / 1024).toFixed(2);
            fileSizeErrors.push(`${filename} (${lang}): metadata ${sizeMB}MB exceeds ${maxMB}MB limit`);
          }
        }
        
        // Check structureMap size
        if (structureMap) {
          const structureMapStr = JSON.stringify(structureMap);
          if (structureMapStr.length > MAX_FILE_CONTENT_SIZE) {
            const sizeMB = (structureMapStr.length / 1024 / 1024).toFixed(2);
            const maxMB = (MAX_FILE_CONTENT_SIZE / 1024 / 1024).toFixed(2);
            fileSizeErrors.push(`${filename} (${lang}): structureMap ${sizeMB}MB exceeds ${maxMB}MB limit`);
          }
        }
      }
      
      // If any files exceed size limits, return error before processing
      if (fileSizeErrors.length > 0) {
        console.error(`[upload] File size limit exceeded for ${fileSizeErrors.length} file(s):`, fileSizeErrors);
        return c.json({ 
          error: 'One or more files exceed the size limit',
          details: fileSizeErrors,
          maxSizePerFile: `${MAX_FILE_CONTENT_SIZE / 1024 / 1024}MB`
        }, 400);
      }

      for (const file of files) {
        const { filetype, filename, lang, contents, metadata, history, structureMap, sourceHash } = file;
        
        // Flatten the contents if they are nested
        const flattened = flattenObject(contents || {});
        const keyCount = Object.keys(flattened).length;
        
        console.log(`[upload] Processing file: ${filename} (${lang}), keys: ${keyCount}`);
        
        if (keyCount === 0) {
          console.warn(`[upload] Warning: File ${filename} (${lang}) has 0 keys`);
        }
        
        // Safely stringify with validation
        const contentsJson = safeJSONStringify(flattened, `upload:${filename}:${lang}`);
        const metadataJson = safeJSONStringify(metadata || {}, `upload:${filename}:${lang}:metadata`);
        const structureMapJson = structureMap ? safeJSONStringify(structureMap, `upload:${filename}:${lang}:structureMap`) : null;
        
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
            contents: contentsJson,
            metadata: metadataJson,
            sourceHash: sourceHash || null,
            structureMap: structureMapJson,
            uploadedAt: new Date(),
          },
          create: {
            id: crypto.randomUUID(),
            projectId,
            branch: branch || 'main',
            commitSha: commitSha || '',
            filename,
            filetype,
            lang,
            contents: contentsJson,
            metadata: metadataJson,
            sourceHash: sourceHash || null,
            structureMap: structureMapJson,
          },
        });
        
        // Create approved translation entries for non-source language files
        if (lang !== project.sourceLanguage && lang !== sourceLanguage) {
          console.log(`[upload] Creating approved translations for ${filename} (${lang})`);
          
          for (const [key, value] of Object.entries(flattened)) {
            const translationKey = `${filename}:${key}`;
            const translationId = crypto.randomUUID();
            
            // Check if translation already exists
            const existing = await prisma.translation.findFirst({
              where: {
                projectId: project.id,
                language: lang,
                key: translationKey,
                status: { in: ['approved', 'committed'] }
              }
            });
            
            // Only create if no approved/committed translation exists
            if (!existing) {
              await prisma.translation.create({
                data: {
                  id: translationId,
                  projectId: project.id,
                  language: lang,
                  key: translationKey,
                  value: String(value),
                  userId: uploadUserId,
                  status: 'approved',
                },
              });
              
              // Extract git commit info for this key from history if available
              let gitAuthor: string | undefined;
              let gitEmail: string | undefined;
              let sourceContentHash: string | undefined;
              
              if (history && history.length > 0) {
                // Get the most recent commit info for this file
                const fileHistory = history.find(h => h.key === '__file__' || h.key === '__all_keys__' || h.key === key);
                if (fileHistory && fileHistory.commits.length > 0) {
                  const mostRecentCommit = fileHistory.commits[0];
                  gitAuthor = mostRecentCommit.author;
                  gitEmail = mostRecentCommit.email;
                }
              }
              
              // Get source content hash from structure map if available
              if (structureMap) {
                const mapEntry = structureMap.find((entry: any) => entry.flattenedKey === key);
                if (mapEntry) {
                  sourceContentHash = mapEntry.sourceHash;
                }
              }
              
              const { logTranslationHistory } = await import('../lib/database.js');
              await logTranslationHistory(
                prisma,
                translationId,
                project.id,
                lang,
                translationKey,
                String(value),
                uploadUserId,
                'imported',
                commitSha,
                sourceContentHash,
                gitAuthor,
                gitEmail
              );
            }
          }
        }
      }

      return c.json({
        success: true,
        projectId,
        filesUploaded: files.length,
        totalKeys: files.reduce((sum, f) => {
          const flattened = flattenObject(f.contents || {});
          return sum + Object.keys(flattened).length;
        }, 0),
        uploadedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[upload] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Provide more specific error messages for known error types
      let errorMessage = 'Failed to store files';
      
      if (error.message && error.message.includes('exceeds size limit')) {
        errorMessage = error.message;
        return c.json({ 
          error: errorMessage,
          details: env.ENVIRONMENT === 'development' ? error.stack : undefined
        }, 400);
      } else if (error.message && error.message.includes('JSON')) {
        errorMessage = 'Invalid JSON data in one or more files';
        return c.json({ 
          error: errorMessage,
          details: env.ENVIRONMENT === 'development' ? error.stack : undefined
        }, 400);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return c.json({ 
        error: errorMessage,
        details: env.ENVIRONMENT === 'development' ? error.stack : undefined
      }, 500);
    }
  });

  app.post('/:projectName/upload-json', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401);
    }

    // Add deprecation warning
    console.warn(`[DEPRECATED] /upload-json endpoint is deprecated. Please use /upload with structured format instead.`);

    const projectName = c.req.param('projectName');
    const body = await c.req.json();
    const { branch, commitSha, language, files } = body;

    if (!files || typeof files !== 'object') {
      return c.json({ error: 'Missing required field: files' }, 400);
    }

    if (Object.keys(files).length > MAX_FILES) {
      return c.json({ error: `Too many files. Max ${MAX_FILES} files per upload` }, 400);
    }

    if (JSON.stringify(body).length > MAX_PAYLOAD_SIZE) {
      return c.json({ error: `Payload too large. Max ${MAX_PAYLOAD_SIZE / 1024 / 1024}MB` }, 400);
    }

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true, sourceLanguage: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    try {
      const authResult = await validateUploadAuth(token, project.id, project.repository, env.JWT_SECRET);
      if (!authResult.authorized) {
        const errorMessage = authResult.error || 'Unauthorized to upload to this project';
        console.error(`[upload-json] Authorization failed: ${errorMessage}`);
        return c.json({ error: errorMessage }, 403);
      }

      const projectId = project.repository;
      
      // Get userId for creating translation entries
      const uploadUserId = authResult.userId || project.userId;

      // Pre-validate all files for size limits before processing
      const fileSizeErrors: string[] = [];
      for (const [filename, content] of Object.entries(files)) {
        const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
        const flattened = flattenObject(parsedContent);
        
        // Check contents size
        const contentsStr = JSON.stringify(flattened);
        if (contentsStr.length > MAX_FILE_CONTENT_SIZE) {
          const sizeMB = (contentsStr.length / 1024 / 1024).toFixed(2);
          const maxMB = (MAX_FILE_CONTENT_SIZE / 1024 / 1024).toFixed(2);
          fileSizeErrors.push(`${filename}: contents ${sizeMB}MB exceeds ${maxMB}MB limit`);
        }
      }
      
      // If any files exceed size limits, return error before processing
      if (fileSizeErrors.length > 0) {
        console.error(`[upload-json] File size limit exceeded for ${fileSizeErrors.length} file(s):`, fileSizeErrors);
        return c.json({ 
          error: 'One or more files exceed the size limit',
          details: fileSizeErrors,
          maxSizePerFile: `${MAX_FILE_CONTENT_SIZE / 1024 / 1024}MB`
        }, 400);
      }

      for (const [filename, content] of Object.entries(files)) {
        const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
        const flattened = flattenObject(parsedContent);
        const keyCount = Object.keys(flattened).length;
        
        console.log(`[upload-json] Processing file: ${filename}, keys: ${keyCount}`);
        
        if (keyCount === 0) {
          console.warn(`[upload-json] Warning: File ${filename} has 0 keys. Content:`, JSON.stringify(parsedContent).substring(0, 200));
        }
        
        const fileLang = language || project.sourceLanguage;
        
        // Safely stringify with validation
        const contentsJson = safeJSONStringify(flattened, `upload-json:${filename}:${fileLang}`);
        const metadataJson = safeJSONStringify({
          keys: keyCount,
          uploadMethod: 'json-direct'
        }, `upload-json:${filename}:${fileLang}:metadata`);
        
        await prisma.projectFile.upsert({
          where: {
            projectId_branch_filename_lang: {
              projectId,
              branch: branch || 'main',
              filename,
              lang: fileLang,
            },
          },
          update: {
            commitSha: commitSha || '',
            filetype: 'json',
            contents: contentsJson,
            metadata: metadataJson,
            uploadedAt: new Date(),
          },
          create: {
            id: crypto.randomUUID(),
            projectId,
            branch: branch || 'main',
            commitSha: commitSha || '',
            filename,
            filetype: 'json',
            lang: fileLang,
            contents: contentsJson,
            metadata: metadataJson,
          },
        });
        
        // Create approved translation entries for non-source language files
        if (fileLang !== project.sourceLanguage) {
          console.log(`[upload-json] Creating approved translations for ${filename} (${fileLang})`);
          
          for (const [key, value] of Object.entries(flattened)) {
            const translationKey = `${filename}:${key}`;
            const translationId = crypto.randomUUID();
            
            // Check if translation already exists
            const existing = await prisma.translation.findFirst({
              where: {
                projectId: project.id,
                language: fileLang,
                key: translationKey,
                status: { in: ['approved', 'committed'] }
              }
            });
            
            // Only create if no approved/committed translation exists
            if (!existing) {
              await prisma.translation.create({
                data: {
                  id: translationId,
                  projectId: project.id,
                  language: fileLang,
                  key: translationKey,
                  value: String(value),
                  userId: uploadUserId,
                  status: 'approved',
                },
              });
              
              const { logTranslationHistory } = await import('../lib/database.js');
              await logTranslationHistory(
                prisma,
                translationId,
                project.id,
                fileLang,
                translationKey,
                String(value),
                uploadUserId,
                'imported'
              );
            }
          }
        }
      }

      return c.json({
        success: true,
        projectId,
        filesUploaded: Object.keys(files).length,
        totalKeys: Object.keys(files).reduce((sum, filename) => {
          const content = files[filename];
          const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
          const flattened = flattenObject(parsedContent);
          return sum + Object.keys(flattened).length;
        }, 0),
        uploadedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[upload-json] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Provide more specific error messages for known error types
      let errorMessage = 'Failed to store files';
      
      if (error.message && error.message.includes('exceeds size limit')) {
        errorMessage = error.message;
        return c.json({ 
          error: errorMessage,
          details: env.ENVIRONMENT === 'development' ? error.stack : undefined
        }, 400);
      } else if (error.message && error.message.includes('JSON')) {
        errorMessage = 'Invalid JSON data in one or more files';
        return c.json({ 
          error: errorMessage,
          details: env.ENVIRONMENT === 'development' ? error.stack : undefined
        }, 400);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return c.json({ 
        error: errorMessage,
        details: env.ENVIRONMENT === 'development' ? error.stack : undefined
      }, 500);
    }
  });

  app.get('/:projectName/download', async (c) => {
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

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    const jwtPayload = await verifyJWT(token, env.JWT_SECRET);
    if (!jwtPayload) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const hasAccess = await checkProjectAccess(prisma, project.id, jwtPayload.userId);
    if (!hasAccess && env.ENVIRONMENT !== 'development') {
      return c.json({ error: 'Access denied to this project' }, 403);
    }

    const where: any = { projectId: project.repository, branch };
    if (language) where.lang = language;

    const projectFiles = await prisma.projectFile.findMany({
      where,
      orderBy: [{ lang: 'asc' }, { filename: 'asc' }],
    });

    // Generate ETag from file upload timestamps
    const fileTimestamps = projectFiles.map(f => f.uploadedAt);
    const etag = generateFilesETag(fileTimestamps);
    
    // Check if client has current version
    const cacheControl = buildCacheControl(CACHE_CONFIGS.projectFiles);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, cacheControl);
    }

    // Check if client wants unflattened structure
    const unflatten = c.req.query('unflatten') === 'true';
    const includeMetadata = c.req.query('includeMetadata') === 'true';

    const filesByLang: Record<string, Record<string, any>> = {};
    const metadataByLang: Record<string, Record<string, any>> = {};
    
    for (const row of projectFiles) {
      if (!filesByLang[row.lang]) {
        filesByLang[row.lang] = {};
        metadataByLang[row.lang] = {};
      }
      
      const contents = safeJSONParse(
        row.contents, 
        {}, 
        `download:${row.filename}:${row.lang}`
      );
      
      // If unflatten is requested and structure map is available, reconstruct original structure
      let finalContents = contents;
      if (unflatten && row.structureMap) {
        const structureMap = safeJSONParse(row.structureMap, [], `download:${row.filename}:${row.lang}:structureMap`);
        finalContents = unflattenWithStructureMap(contents, structureMap);
      }
      
      filesByLang[row.lang][row.filename] = finalContents;
      
      // Include metadata if requested
      if (includeMetadata) {
        metadataByLang[row.lang][row.filename] = {
          sourceHash: row.sourceHash,
          commitSha: row.commitSha,
          uploadedAt: row.uploadedAt,
          structureMapAvailable: !!row.structureMap,
        };
      }
    }

    const responseData: any = {
      project: projectName,
      repository: project.repository,
      branch,
      files: filesByLang,
      generatedAt: new Date().toISOString()
    };
    
    if (includeMetadata) {
      responseData.metadata = metadataByLang;
    }

    const response = c.json(responseData);
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('ETag', etag);
    return response;
  });

  // Helper function to unflatten using structure map
  function unflattenWithStructureMap(flattened: Record<string, any>, structureMap: any[]): Record<string, any> {
    const result: any = {};
    
    for (const [key, value] of Object.entries(flattened)) {
      const mapEntry = structureMap.find((entry: any) => entry.flattenedKey === key);
      
      if (mapEntry && mapEntry.originalPath) {
        // Reconstruct the nested structure using original path
        let current = result;
        const path = mapEntry.originalPath;
        
        for (let i = 0; i < path.length - 1; i++) {
          const part = path[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        
        current[path[path.length - 1]] = value;
      } else {
        // Fallback to dot notation unflattening if no structure map entry
        const parts = key.split('.');
        let current = result;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        
        current[parts[parts.length - 1]] = value;
      }
    }
    
    return result;
  }

  // Optimized endpoint for UI listing - returns only keys without values for statistics
  app.get('/:projectId/files/summary', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdOrName = c.req.param('projectId');
    const branch = c.req.query('branch') || 'main';
    let lang = c.req.query('lang');
    const filename = c.req.query('filename');

    let actualProjectId = projectIdOrName;
    let configuredSourceLanguage = 'en';
    
    const project = await prisma.project.findUnique({
      where: { name: projectIdOrName },
      select: { repository: true, sourceLanguage: true },
    });
    
    if (project) {
      actualProjectId = project.repository;
      configuredSourceLanguage = project.sourceLanguage;
    }

    // Detect actual source language from uploaded files if lang is 'source-language'
    if (lang === 'source-language') {
      // Get all distinct languages from uploaded files
      const languages = await prisma.projectFile.findMany({
        where: { 
          projectId: actualProjectId,
          branch 
        },
        select: { lang: true },
        distinct: ['lang'],
      });

      // Find the actual source language
      // Priority: 
      // 1. Exact match with configured sourceLanguage
      // 2. Language that starts with configured sourceLanguage (e.g., en-US for en)
      // 3. First language alphabetically (fallback)
      let actualSourceLanguage = configuredSourceLanguage;
      
      if (languages.length > 0) {
        const languageCodes = languages.map(l => l.lang);
        
        // Check for exact match
        if (languageCodes.includes(configuredSourceLanguage)) {
          actualSourceLanguage = configuredSourceLanguage;
        } else {
          // Check for languages that start with the configured source language
          const matching = languageCodes.find(l => 
            l.toLowerCase().startsWith(configuredSourceLanguage.toLowerCase() + '-')
          );
          
          if (matching) {
            actualSourceLanguage = matching;
          } else {
            // Use the first language alphabetically as fallback
            actualSourceLanguage = languageCodes.sort()[0];
          }
        }
      }
      
      lang = actualSourceLanguage;
    }

    const where: any = { projectId: actualProjectId, branch };
    if (lang) where.lang = lang;
    if (filename) where.filename = filename;

    const projectFiles = await prisma.projectFile.findMany({
      where,
      select: {
        id: true,
        projectId: true,
        branch: true,
        filename: true,
        filetype: true,
        lang: true,
        commitSha: true,
        uploadedAt: true,
        contents: true,
        metadata: true,
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Return summary with calculated statistics instead of all keys
    const filesSummary = projectFiles.map((row) => {
      const contents = safeJSONParse<Record<string, any>>(
        row.contents, 
        {}, 
        `files-summary:${row.filename}:${row.lang}`
      );
      const metadata = safeJSONParse<Record<string, any>>(
        row.metadata || '{}', 
        {}, 
        `files-summary:${row.filename}:${row.lang}:metadata`
      );
      
      // Calculate translation statistics
      const allKeys = Object.keys(contents);
      const totalKeys = allKeys.length;
      let translatedKeys = 0;
      
      for (const [key, value] of Object.entries(contents)) {
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          translatedKeys++;
        }
      }
      
      const translationPercentage = totalKeys > 0 
        ? Math.round((translatedKeys / totalKeys) * 100) 
        : 0;
      
      return {
        id: row.id,
        projectId: row.projectId,
        branch: row.branch,
        filename: row.filename,
        filetype: row.filetype,
        lang: row.lang,
        commitSha: row.commitSha,
        uploadedAt: row.uploadedAt,
        totalKeys,
        translatedKeys,
        translationPercentage,
        metadata,
      };
    });

    // Generate ETag from file upload timestamps
    const fileTimestamps = projectFiles.map(f => f.uploadedAt);
    const etag = generateFilesETag(fileTimestamps);
    
    // Check if client has current version
    const cacheControl = buildCacheControl(CACHE_CONFIGS.projectFiles);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, cacheControl);
    }

    const response = c.json({ files: filesSummary });
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('ETag', etag);
    return response;
  });

  app.get('/:projectId/files', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdOrName = c.req.param('projectId');
    const branch = c.req.query('branch') || 'main';
    const lang = c.req.query('lang');
    const filename = c.req.query('filename');

    let actualProjectId = projectIdOrName;
    const project = await prisma.project.findUnique({
      where: { name: projectIdOrName },
      select: { repository: true },
    });
    
    if (project) {
      actualProjectId = project.repository;
    }

    const where: any = { projectId: actualProjectId, branch };
    if (lang) where.lang = lang;
    if (filename) where.filename = filename;

    const projectFiles = await prisma.projectFile.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    // Generate ETag from file upload timestamps
    const fileTimestamps = projectFiles.map(f => f.uploadedAt);
    const etag = generateFilesETag(fileTimestamps);
    
    // Check if client has current version
    const cacheControl = buildCacheControl(CACHE_CONFIGS.projectFiles);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, cacheControl);
    }

    const files = projectFiles.map((row) => ({
      ...row,
      contents: safeJSONParse<Record<string, any>>(
        row.contents, 
        {}, 
        `files:${row.filename}:${row.lang}`
      ),
      metadata: safeJSONParse<Record<string, any>>(
        row.metadata || '{}', 
        {}, 
        `files:${row.filename}:${row.lang}:metadata`
      )
    }));

    const response = c.json({ files });
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('ETag', etag);
    return response;
  });

  // Endpoint to validate translation validity based on source content hash
  app.get('/:projectName/validate', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectName = c.req.param('projectName');
    const branch = c.req.query('branch') || 'main';
    const language = c.req.query('language');

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, repository: true, sourceLanguage: true },
    });

    if (!project) {
      return c.json({ error: `Project '${projectName}' not found` }, 404);
    }

    // Get source language files
    const sourceFiles = await prisma.projectFile.findMany({
      where: {
        projectId: project.repository,
        branch,
        lang: project.sourceLanguage,
      },
      select: {
        filename: true,
        contents: true,
        sourceHash: true,
        structureMap: true,
      },
    });

    // Get translation files for the specified language
    const where: any = {
      projectId: project.repository,
      branch,
    };
    if (language) {
      where.lang = language;
    } else {
      where.lang = { not: project.sourceLanguage };
    }

    const translationFiles = await prisma.projectFile.findMany({
      where,
      select: {
        filename: true,
        lang: true,
        contents: true,
        structureMap: true,
      },
    });

    // Build validation report
    const validationResults: any[] = [];

    for (const translationFile of translationFiles) {
      const sourceFile = sourceFiles.find(sf => sf.filename === translationFile.filename);
      
      if (!sourceFile) {
        validationResults.push({
          filename: translationFile.filename,
          language: translationFile.lang,
          status: 'no_source',
          message: 'Source file not found',
        });
        continue;
      }

      const sourceContents = safeJSONParse(sourceFile.contents, {}, 'validate:source');
      const translationContents = safeJSONParse(translationFile.contents, {}, 'validate:translation');
      const sourceMap = sourceFile.structureMap ? safeJSONParse(sourceFile.structureMap, [], 'validate:sourceMap') : [];
      const translationMap = translationFile.structureMap ? safeJSONParse(translationFile.structureMap, [], 'validate:translationMap') : [];

      const invalidKeys: string[] = [];
      const validKeys: string[] = [];
      const missingKeys: string[] = [];

      // Check each key in source
      for (const [key, sourceValue] of Object.entries(sourceContents)) {
        const translationValue = translationContents[key];
        
        if (translationValue === undefined) {
          missingKeys.push(key);
          continue;
        }

        // Find source hash for this key
        const sourceMapEntry = sourceMap.find((entry: any) => entry.flattenedKey === key);
        const translationMapEntry = translationMap.find((entry: any) => entry.flattenedKey === key);

        if (sourceMapEntry && translationMapEntry) {
          // Compare source hashes to see if source has changed
          if (sourceMapEntry.sourceHash !== translationMapEntry.sourceHash) {
            invalidKeys.push(key);
          } else {
            validKeys.push(key);
          }
        } else {
          // If no hash available, assume valid
          validKeys.push(key);
        }
      }

      validationResults.push({
        filename: translationFile.filename,
        language: translationFile.lang,
        status: invalidKeys.length === 0 && missingKeys.length === 0 ? 'valid' : 'invalid',
        totalKeys: Object.keys(sourceContents).length,
        validKeys: validKeys.length,
        invalidKeys: invalidKeys.length,
        missingKeys: missingKeys.length,
        invalidKeysList: invalidKeys,
        missingKeysList: missingKeys,
      });
    }

    return c.json({
      project: projectName,
      branch,
      sourceLanguage: project.sourceLanguage,
      validationResults,
      generatedAt: new Date().toISOString(),
    });
  });

  return app;
}
