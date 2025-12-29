/**
 * File routes
 * 
 * Simplified file access from GitHub repositories:
 * - Manifest: Get project configuration and file list
 * - Files: Stream translation file content
 * - Summary: Get translation progress per language
 */
import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { createProjectMiddleware } from '../lib/project-middleware';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import type { Env, AppEnv, GitHubContext, ProjectContext } from '../lib/context';
import {
  fetchTranslationFilesFromGitHub,
  processGitHubTranslationFiles,
  getLatestCommitSha,
  fetchGeneratedManifest,
  fetchFilesFromManifest,
  streamSingleFileFromGitHub,
  streamFileFromGitHub,
  fetchManifestJsonlStream,
  fetchProgressTranslatedFile,
} from '../lib/github-repo-fetcher';

// ============================================================================
// Helper Types
// ============================================================================

interface FileRouteContext {
  project: ProjectContext;
  github: GitHubContext;
}

function getContext(c: any): FileRouteContext {
  return {
    project: c.get('project') as ProjectContext,
    github: c.get('github') as GitHubContext,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine content type from file extension
 */
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json': return 'application/json';
    case 'jsonl': return 'application/x-ndjson';
    case 'toml': return 'application/toml';
    case 'md': return 'text/markdown';
    default: return 'application/octet-stream';
  }
}

/**
 * Create a streaming response with standard headers
 */
function streamingResponse(
  stream: ReadableStream<Uint8Array>,
  contentType: string,
  etag?: string
): Response {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Transfer-Encoding': 'chunked',
    'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
  };
  if (etag) headers['ETag'] = etag;
  return new Response(stream, { headers });
}

// ============================================================================
// Route Factory
// ============================================================================

export function createFileRoutes(prisma: PrismaClient, _env: Env) {
  const app = new Hono<AppEnv>();
  
  // All file routes require authentication and project context with GitHub access
  app.use('*', authMiddleware, createProjectMiddleware(prisma, { 
    requireAccess: true, 
    withOctokit: true 
  }));

  // ============================================================================
  // Manifest Routes
  // ============================================================================

  /**
   * Get the manifest file listing all translation files
   */
  app.get('/manifest', async (c) => {
    const branch = c.req.query('branch') || 'main';
    const { github } = getContext(c);

    try {
      const manifest = await fetchGeneratedManifest(
        github.octokit, github.owner, github.repo, branch
      );

      if (!manifest) {
        return c.json({
          error: 'Generated manifest not found. Please ensure .koro-i18n/koro-i18n.repo.generated.jsonl exists in your repository.'
        }, 404);
      }

      return c.json({ success: true, manifest });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching manifest:', msg);
      return c.json({ error: `Failed to fetch manifest: ${msg}` }, 500);
    }
  });

  /**
   * Stream manifest as JSONL for efficient parsing
   */
  app.get('/manifest/stream', async (c) => {
    const branch = c.req.query('branch') || 'main';
    const { github } = getContext(c);

    try {
      const stream = await fetchManifestJsonlStream(
        github.octokit, github.owner, github.repo, branch
      );

      if (!stream) {
        return c.json({
          error: 'Manifest not found. Please run the koro-i18n CLI to generate the manifest.'
        }, 404);
      }

      return streamingResponse(stream, 'application/x-ndjson');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error streaming manifest:', msg);
      return c.json({ error: `Failed to stream manifest: ${msg}` }, 500);
    }
  });

  // ============================================================================
  // Refresh Files from GitHub
  // ============================================================================

  /**
   * Refresh translation files from GitHub
   * Reads koro.config.json directly from the repository
   * This is the simplified flow - no preprocessing needed
   */
  app.post('/refresh', async (c) => {
    const branch = c.req.query('branch') || 'main';
    const { project, github } = getContext(c);

    // Config structure for koro.config.json
    interface KoroConfig {
      version?: number;
      sourceLanguage?: string;
      targetLanguages?: string[];
      files?: {
        include?: string[];
        exclude?: string[];
      };
    }

    try {
      // Try to read koro.config.json from the repository
      let config: KoroConfig | null = null;
      try {
        const configStream = await streamFileFromGitHub(
          github.octokit, github.owner, github.repo, 'koro.config.json', branch
        );
        if (configStream) {
          const reader = configStream.getReader();
          const decoder = new TextDecoder();
          let configContent = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            configContent += decoder.decode(value, { stream: true });
          }
          configContent += decoder.decode();
          config = JSON.parse(configContent) as KoroConfig;
        }
      } catch (e) {
        console.warn('Could not read koro.config.json, trying legacy config');
      }

      // Fall back to legacy manifest if config not found
      if (!config) {
        const manifest = await fetchGeneratedManifest(
          github.octokit, github.owner, github.repo, branch
        );
        if (manifest) {
          return c.json({
            success: true,
            filesRefreshed: manifest.files.length,
            message: 'Using legacy manifest. Consider migrating to koro.config.json',
            useLegacy: true,
          });
        }
        return c.json({
          error: 'No koro.config.json or legacy manifest found. Please add a koro.config.json to your repository.',
        }, 404);
      }

      // Read files based on the include pattern
      const sourceLanguage = config.sourceLanguage || 'en';
      const includePatterns = config.files?.include || ['locales/{lang}/**/*.json'];
      
      // For now, just acknowledge the refresh request
      // The actual file reading happens when the frontend requests files
      return c.json({
        success: true,
        filesRefreshed: 0,
        config: {
          sourceLanguage,
          targetLanguages: config.targetLanguages || [],
          includePatterns,
        },
        message: 'Config loaded successfully. Files will be fetched on demand.',
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error refreshing files:', msg);
      return c.json({ error: `Failed to refresh files: ${msg}` }, 500);
    }
  });

  // ============================================================================
  // Store/Source/Progress Streaming
  // ============================================================================

  /**
   * Stream store file (translation entries)
   */
  app.get('/store/stream/:lang', async (c) => {
    const lang = c.req.param('lang');
    const branch = c.req.query('branch') || 'main';
    const { github } = getContext(c);

    try {
      const path = `.koro-i18n/store/${lang}.jsonl`;
      const stream = await streamFileFromGitHub(
        github.octokit, github.owner, github.repo, path, branch
      );

      if (!stream) {
        return c.json({ error: 'Store file not found' }, 404);
      }

      return streamingResponse(stream, 'application/x-ndjson');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error streaming store file:', msg);
      return c.json({ error: `Failed to stream store file: ${msg}` }, 500);
    }
  });

  /**
   * Stream progress file (translation status)
   */
  app.get('/progress/stream/:lang', async (c) => {
    const lang = c.req.param('lang');
    const branch = c.req.query('branch') || 'main';
    const { github } = getContext(c);

    try {
      const path = `.koro-i18n/progress-translated/${lang}.jsonl`;
      const stream = await streamFileFromGitHub(
        github.octokit, github.owner, github.repo, path, branch
      );

      if (!stream) {
        return c.json({ error: 'Progress file not found' }, 404);
      }

      return streamingResponse(stream, 'application/x-ndjson');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error streaming progress file:', msg);
      return c.json({ error: `Failed to stream progress file: ${msg}` }, 500);
    }
  });

  /**
   * Stream source file (pre-parsed key-value pairs)
   */
  app.get('/source/stream/:lang', async (c) => {
    const lang = c.req.param('lang');
    const branch = c.req.query('branch') || 'main';
    const { github } = getContext(c);

    try {
      const path = `.koro-i18n/source/${lang}.jsonl`;
      const stream = await streamFileFromGitHub(
        github.octokit, github.owner, github.repo, path, branch
      );

      if (!stream) {
        return c.json({ error: 'Source file not found' }, 404);
      }

      return streamingResponse(stream, 'application/x-ndjson');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error streaming source file:', msg);
      return c.json({ error: `Failed to stream source file: ${msg}` }, 500);
    }
  });

  /**
   * Stream any file by path
   */
  app.get('/stream/:path{.+}', async (c) => {
    const filePath = c.req.param('path');
    const branch = c.req.query('branch') || 'main';
    const { github } = getContext(c);

    if (!filePath) {
      return c.json({ error: 'File path is required' }, 400);
    }

    try {
      const stream = await streamFileFromGitHub(
        github.octokit, github.owner, github.repo, filePath, branch
      );

      if (!stream) {
        return c.json({ error: 'File not found or could not be streamed' }, 404);
      }

      return streamingResponse(stream, getContentType(filePath));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error streaming file:', msg);
      return c.json({ error: `Failed to stream file: ${msg}` }, 500);
    }
  });

  // ============================================================================
  // File Fetching (for processing)
  // ============================================================================

  /**
   * Fetch files using the generated manifest (RECOMMENDED)
   */
  app.post('/fetch-from-manifest', async (c) => {
    const { branch = 'main' } = await c.req.json().catch(() => ({}));
    const { project, github } = getContext(c);

    try {
      const manifest = await fetchGeneratedManifest(
        github.octokit, github.owner, github.repo, branch
      );

      if (!manifest) {
        return c.json({
          error: 'Generated manifest not found. Please ensure .koro-i18n/koro-i18n.repo.generated.jsonl exists in your repository.'
        }, 404);
      }

      const commitSha = await getLatestCommitSha(
        github.octokit, github.owner, github.repo, branch
      );

      const githubFiles = await fetchFilesFromManifest(
        github.octokit, github.owner, github.repo, manifest, branch
      );

      if (githubFiles.length === 0) {
        return c.json({ error: 'No translation files found from manifest' }, 404);
      }

      const processedFiles = await processGitHubTranslationFiles(
        github.octokit, github.owner, github.repo,
        githubFiles, commitSha, branch
      );

      return c.json({
        success: true,
        projectName: project.name,
        repository: project.repository,
        branch,
        commitSha,
        filesFound: processedFiles.length,
        files: processedFiles,
        manifest,
        message: 'Files fetched successfully using generated manifest.'
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching from manifest:', msg);
      return c.json({ error: `Failed to fetch files from manifest: ${msg}` }, 500);
    }
  });

  /**
   * Fetch files from GitHub (LEGACY - uses directory traversal)
   */
  app.post('/fetch-from-github', async (c) => {
    const { path = 'locales', branch = 'main' } = await c.req.json().catch(() => ({}));
    const { project, github } = getContext(c);

    try {
      const commitSha = await getLatestCommitSha(
        github.octokit, github.owner, github.repo, branch
      );

      const githubFiles = await fetchTranslationFilesFromGitHub(
        github.octokit, github.owner, github.repo, path, branch
      );

      if (githubFiles.length === 0) {
        return c.json({
          error: `No translation files found in ${github.owner}/${github.repo} at path: ${path}`
        }, 404);
      }

      const processedFiles = await processGitHubTranslationFiles(
        github.octokit, github.owner, github.repo,
        githubFiles, commitSha, branch
      );

      return c.json({
        success: true,
        projectName: project.name,
        repository: project.repository,
        branch,
        commitSha,
        filesFound: processedFiles.length,
        files: processedFiles,
        message: 'Files and git blame fetched successfully from GitHub.'
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching from GitHub:', msg);
      return c.json({ error: `Failed to fetch files from GitHub: ${msg}` }, 500);
    }
  });

  // ============================================================================
  // Summary and Listing
  // ============================================================================

  /**
   * Get translation summary with progress info
   * 
   * Translation percentage calculation:
   * The GitHub repository is the source of truth for translations.
   * The koro-i18n server only stores DIFFS (approved suggestions not yet committed).
   * 
   * translatedKeys = keys already in GitHub (from progress-translated files) + approved diffs from DB
   * translationPercentage = (translatedKeys / totalKeys) * 100
   */
  app.get('/summary', async (c) => {
    const branch = c.req.query('branch') || 'main';
    let language = c.req.query('lang');
    const { project, github } = getContext(c);

    if (language === 'source-language') {
      language = project.sourceLanguage;
    }

    try {
      const latestCommitSha = await getLatestCommitSha(
        github.octokit, github.owner, github.repo, branch
      );

      const serverETag = `"${latestCommitSha}"`;

      if (c.req.header('If-None-Match') === serverETag) {
        return c.body(null, 304, {
          'ETag': serverETag,
          'Cache-Control': 'public, max-age=60, s-maxage=60'
        });
      }

      const manifest = await fetchGeneratedManifest(
        github.octokit, github.owner, github.repo, branch
      );

      if (!manifest) {
        return c.json({
          files: [],
          message: 'No manifest found. Please run the koro-i18n CLI to generate the manifest.',
        });
      }

      const filteredFiles = language
        ? manifest.files.filter(f => f.language === language)
        : manifest.files;

      // Get approved translation DIFFS from koro-i18n DB (these are pending commit to GitHub)
      const translationCounts = await prisma.webTranslation.groupBy({
        by: ['language', 'filename'],
        where: {
          projectId: project.id,
          status: 'approved',
          isValid: true,
          ...(language ? { language } : {}),
        },
        _count: { id: true },
      });

      const dbDiffCountMap = new Map<string, number>();
      for (const tc of translationCounts) {
        dbDiffCountMap.set(`${tc.language}:${tc.filename}`, tc._count.id);
      }

      // Fetch progress-translated files from GitHub for each language
      // This tells us which keys are already translated in the repository
      const languagesInManifest = new Set(filteredFiles.map(f => f.language));
      const progressByLanguage = new Map<string, Record<string, string[]>>();
      
      for (const lang of languagesInManifest) {
        if (lang === project.sourceLanguage) continue; // Skip source language
        
        const progressData = await fetchProgressTranslatedFile(
          github.octokit, github.owner, github.repo, lang, branch
        );
        if (progressData) {
          progressByLanguage.set(lang, progressData);
        }
      }

      const filesWithProgress = filteredFiles.map(mf => {
        const totalKeys = mf.totalKeys || 0;
        
        // Count keys already translated in GitHub repository
        let githubTranslatedCount = 0;
        if (mf.language !== project.sourceLanguage) {
          const progressData = progressByLanguage.get(mf.language);
          if (progressData) {
            // Find the progress entry for this file
            // The filepath in progress uses <lang> placeholder (e.g., "locales/<lang>/common.json")
            // The manifest filename is just the base name (e.g., "common.json")
            // Match by checking if the progress filepath ends with the manifest filename
            for (const [filepath, keys] of Object.entries(progressData)) {
              const progressBasename = filepath.split('/').pop() || '';
              if (progressBasename === mf.filename || filepath.endsWith(`/${mf.filename}`) || filepath === mf.filename) {
                githubTranslatedCount = keys.length;
                break;
              }
            }
          }
        } else {
          // Source language is always 100% translated
          githubTranslatedCount = totalKeys;
        }

        // Count approved diffs from koro-i18n DB (not yet committed to GitHub)
        const dbDiffCount = dbDiffCountMap.get(`${mf.language}:${mf.filename}`) || 0;
        
        // Total translated = what's in GitHub + approved diffs pending commit
        const translatedKeys = Math.min(githubTranslatedCount + dbDiffCount, totalKeys);
        
        let lastUpdated: Date;
        try {
          lastUpdated = new Date(mf.lastUpdated);
          if (isNaN(lastUpdated.getTime())) lastUpdated = new Date();
        } catch (_) {
          // Invalid date format, use current time
          lastUpdated = new Date();
        }

        return {
          filename: mf.filename,
          lang: mf.language,
          totalKeys,
          translatedKeys,
          translationPercentage: totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0,
          lastUpdated,
          commitHash: mf.commitHash,
        };
      });

      filesWithProgress.sort((a, b) => a.filename.localeCompare(b.filename));

      const response = c.json({
        files: filesWithProgress,
        sourceLanguage: manifest.sourceLanguage,
      });

      response.headers.set('ETag', serverETag);
      response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
      return response;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching summary:', msg);
      return c.json({ error: `Failed to fetch summary: ${msg}` }, 500);
    }
  });

  /**
   * List files from manifest
   */
  app.get('/', async (c) => {
    const branch = c.req.query('branch') || 'main';
    let language = c.req.query('language');
    const { project, github } = getContext(c);

    if (language === 'source-language') {
      language = project.sourceLanguage;
    }

    try {
      const manifest = await fetchGeneratedManifest(
        github.octokit, github.owner, github.repo, branch
      );

      if (!manifest) {
        return c.json({
          files: [],
          message: 'No manifest found. Please run the koro-i18n CLI to generate the manifest.',
        });
      }

      const manifestFiles = language
        ? manifest.files.filter(f => f.language === language)
        : manifest.files;

      const latestCommit = manifestFiles.length > 0
        ? manifestFiles.reduce((latest, f) => f.commitHash > latest ? f.commitHash : latest, '')
        : '';
      const serverETag = `"${latestCommit || Date.now()}"`;

      if (c.req.header('If-None-Match') === serverETag) {
        return c.body(null, 304, {
          'ETag': serverETag,
          'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles)
        });
      }

      const response = c.json({
        files: manifestFiles.map(f => ({
          lang: f.language,
          filename: f.filename,
          commitSha: f.commitHash,
          sourceFilename: f.sourceFilename,
          lastUpdated: f.lastUpdated,
        })),
      });
      response.headers.set('ETag', serverETag);
      response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));
      return response;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error listing files from GitHub:', msg);
      return c.json({ error: `Failed to list files from GitHub: ${msg}` }, 500);
    }
  });

  /**
   * Get specific file content
   */
  app.get('/:lang/:filename', async (c) => {
    const lang = c.req.param('lang');
    const filename = c.req.param('filename');
    const branch = c.req.query('branch') || 'main';
    const { github } = getContext(c);

    try {
      const result = await streamSingleFileFromGitHub(
        github.octokit, github.owner, github.repo, lang, filename, branch
      );

      if (!result) {
        return c.json({ error: 'File not found in GitHub repository' }, 404);
      }

      const { stream, contentType, commitSha } = result;
      const serverETag = `"${commitSha}"`;

      if (c.req.header('If-None-Match') === serverETag) {
        return c.body(null, 304, {
          'ETag': serverETag,
          'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles)
        });
      }

      return new Response(stream, {
        headers: {
          'Content-Type': contentType,
          'Transfer-Encoding': 'chunked',
          'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
          'ETag': serverETag,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching file from GitHub:', msg);
      return c.json({ error: `Failed to fetch file from GitHub: ${msg}` }, 500);
    }
  });

  return app;
}
