import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { createProjectMiddleware } from '../lib/project-middleware';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { Octokit } from '@octokit/rest';
import {
    fetchTranslationFilesFromGitHub,
    processGitHubTranslationFiles,
    getLatestCommitSha,
    fetchGeneratedManifest,
    fetchFilesFromManifest,
    fetchSingleFileFromGitHub,
    streamSingleFileFromGitHub,
    fetchProgressTranslatedFile,
    streamFileFromGitHub,
    fetchManifestJsonlStream,
    type GeneratedManifest,
    type ManifestFileEntry,
} from '../lib/github-repo-fetcher';

interface Env {
    JWT_SECRET: string;
    ENVIRONMENT: string;
    PLATFORM_URL?: string;

    Variables: {
        user: any;
    };
}

export function createFileRoutes(prisma: PrismaClient, env: Env) {
    const app = new Hono<{ Bindings: Env }>();
    // All file routes require authentication and project context
    app.use('*', authMiddleware, createProjectMiddleware(prisma, { requireAccess: true, withOctokit: true }));

    // Fetch the generated manifest from the repository
    // This endpoint returns the manifest file that lists all translation files
    app.get('/manifest', async (c) => {
        const branch = c.req.query('branch') || 'main';
        const project = (c as any).get('project');
        const octokit = (c as any).get('octokit') as Octokit;
        const owner = (c as any).get('owner') as string;
        const repo = (c as any).get('repo') as string;

        try {
            const manifest = await fetchGeneratedManifest(octokit, owner, repo, branch);

            if (!manifest) {
                return c.json({
                    error: 'Generated manifest not found. Please ensure .koro-i18n/koro-i18n.repo.generated.jsonl exists in your repository.'
                }, 404);
            }

            return c.json({ success: true, manifest });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error fetching manifest:', errorMessage);
            return c.json({ error: `Failed to fetch manifest: ${errorMessage}` }, 500);
        }
    });

    // Stream the manifest as JSONL format
    // This endpoint returns the manifest in streaming JSONL format for efficient parsing
    // Each line is a JSON object: first line is header, subsequent lines are file entries
    app.get('/manifest/stream', async (c) => {
        const branch = c.req.query('branch') || 'main';
        const octokit = (c as any).get('octokit') as Octokit;
        const owner = (c as any).get('owner') as string;
        const repo = (c as any).get('repo') as string;

        try {
            // Try to fetch JSONL directly from GitHub, fallback to JSON conversion
            const stream = await fetchManifestJsonlStream(octokit, owner, repo, branch);

            if (!stream) {
                return c.json({
                    error: 'Manifest not found in repository. Please run the koro-i18n CLI to generate the manifest.'
                }, 404);
            }

            return new Response(stream, {
                headers: {
                    'Content-Type': 'application/x-ndjson',
                    'Transfer-Encoding': 'chunked',
                    'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
                },
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error streaming manifest:', errorMessage);
            return c.json({
                error: `Failed to stream manifest: ${errorMessage}`
            }, 500);
        }
    });

    // Stream the store file as JSONL format
    app.get('/store/stream/:lang', async (c) => {
        const lang = c.req.param('lang');
        const branch = c.req.query('branch') || 'main';
        const octokit = (c as any).get('octokit') as Octokit;
        const owner = (c as any).get('owner') as string;
        const repo = (c as any).get('repo') as string;

        try {
            const storePath = `.koro-i18n/store/${lang}.jsonl`;
            const stream = await streamFileFromGitHub(octokit, owner, repo, storePath, branch);

            if (!stream) {
                return c.json({ error: 'Store file not found' }, 404);
            }

            return new Response(stream, {
                headers: {
                    'Content-Type': 'application/x-ndjson',
                    'Transfer-Encoding': 'chunked',
                    'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
                },
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error streaming store file:', errorMessage);
            return c.json({ error: `Failed to stream store file: ${errorMessage}` }, 500);
        }
    });

    // Stream the progress-translated file as JSONL format
    app.get('/progress/stream/:lang', async (c) => {
        const lang = c.req.param('lang');
        const branch = c.req.query('branch') || 'main';
        const octokit = (c as any).get('octokit') as Octokit;
        const owner = (c as any).get('owner') as string;
        const repo = (c as any).get('repo') as string;

        try {
            const progressPath = `.koro-i18n/progress-translated/${lang}.jsonl`;
            const stream = await streamFileFromGitHub(octokit, owner, repo, progressPath, branch);

            if (!stream) {
                return c.json({ error: 'Progress file not found' }, 404);
            }

            return new Response(stream, {
                headers: {
                    'Content-Type': 'application/x-ndjson',
                    'Transfer-Encoding': 'chunked',
                    'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
                },
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error streaming progress file:', errorMessage);
            return c.json({ error: `Failed to stream progress file: ${errorMessage}` }, 500);
        }
    });

    // Stream a file directly from GitHub
    // This endpoint returns raw file content as a stream
    // Useful for large files that shouldn't be loaded entirely into memory
    app.get('/stream/:path{.+}', async (c) => {
        const filePath = c.req.param('path');
        const branch = c.req.query('branch') || 'main';

        if (!filePath) {
            return c.json({ error: 'File path is required' }, 400);
        }

        const octokit = (c as any).get('octokit') as unknown as Octokit;
        const owner = (c as any).get('owner') as unknown as string;
        const repo = (c as any).get('repo') as unknown as string;

        try {
            const stream = await streamFileFromGitHub(octokit, owner, repo, filePath, branch);

            if (!stream) {
                return c.json({ error: 'File not found or could not be streamed' }, 404);
            }

            // Determine content type based on file extension
            // Handle files with multiple dots or no extension
            const extParts = filePath.split('.');
            const ext = extParts.length > 1 ? extParts.pop()?.toLowerCase() : undefined;
            let contentType = 'application/octet-stream';
            if (ext === 'json') contentType = 'application/json';
            else if (ext === 'jsonl') contentType = 'application/x-ndjson';
            else if (ext === 'toml') contentType = 'application/toml';
            else if (ext === 'md') contentType = 'text/markdown';

            return new Response(stream, {
                headers: {
                    'Content-Type': contentType,
                    'Transfer-Encoding': 'chunked',
                    'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
                },
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error streaming file:', errorMessage);
            return c.json({ error: `Failed to stream file: ${errorMessage}` }, 500);
        }
    });

    // Fetch files using the generated manifest (RECOMMENDED METHOD)
    // This endpoint uses the pre-generated manifest to fetch specific files
    app.post('/fetch-from-manifest', async (c) => {
        const { branch = 'main' } = await c.req.json().catch(() => ({}));
        const project = (c as any).get('project');
        const octokit = (c as any).get('octokit') as Octokit;
        const owner = (c as any).get('owner') as string;
        const repo = (c as any).get('repo') as string;

        try {
            const manifest = await fetchGeneratedManifest(octokit, owner, repo, branch);

            if (!manifest) {
                return c.json({
                    error: 'Generated manifest not found. Please ensure .koro-i18n/koro-i18n.repo.generated.jsonl exists in your repository.'
                }, 404);
            }

            const commitSha = await getLatestCommitSha(octokit, owner, repo, branch);

            // Fetch files listed in the manifest
            const githubFiles = await fetchFilesFromManifest(octokit, owner, repo, manifest, branch);

            if (githubFiles.length === 0) {
                return c.json({
                    error: 'No translation files found from manifest'
                }, 404);
            }

            // Process files with metadata (git blame fetched from GitHub)
            const processedFiles = await processGitHubTranslationFiles(
                octokit,
                owner,
                repo,
                githubFiles,
                commitSha,
                branch
            );

            // Important: Never expose the GitHub token to the client
            return c.json({ success: true, projectName: project.name, repository: project.repository, branch, commitSha, filesFound: processedFiles.length, files: processedFiles, manifest, message: 'Files fetched successfully using generated manifest.' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error fetching from manifest:', errorMessage);
            return c.json({
                error: `Failed to fetch files from manifest: ${errorMessage}`
            }, 500);
        }
    });

    // Fetch files from GitHub repository (LEGACY METHOD - uses directory traversal)
    // This endpoint replaces the need for manual uploads
    app.post('/fetch-from-github', async (c) => {
        const { path = 'locales', branch = 'main' } = await c.req.json().catch(() => ({}));
        const project = (c as any).get('project');
        const octokit = (c as any).get('octokit') as Octokit;
        const owner = (c as any).get('owner') as string;
        const repo = (c as any).get('repo') as string;
        try {

            // Get latest commit SHA
            const commitSha = await getLatestCommitSha(octokit, owner, repo, branch);

            // Fetch translation files from GitHub
            const githubFiles = await fetchTranslationFilesFromGitHub(
                octokit,
                owner,
                repo,
                path,
                branch
            );

            if (githubFiles.length === 0) {
                return c.json({
                    error: `No translation files found in ${owner}/${repo} at path: ${path}`
                }, 404);
            }

            // Process files with metadata (git blame fetched from GitHub)
            const processedFiles = await processGitHubTranslationFiles(
                octokit,
                owner,
                repo,
                githubFiles,
                commitSha,
                branch
            );

            return c.json({ success: true, projectName: project.name, repository: project.repository, branch, commitSha, filesFound: processedFiles.length, files: processedFiles, message: 'Files and git blame fetched successfully from GitHub.' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error fetching from GitHub:', errorMessage);
            return c.json({
                error: `Failed to fetch files from GitHub: ${errorMessage}`
            }, 500);
        }
    });



    // Get files summary (translation status overview)
    // Returns file metadata with translation progress - used for file selection pages
    // OPTIMIZED: Uses GitHub commit SHA for ETag and Cloudflare caching
    app.get('/summary', async (c) => {
        const branch = c.req.query('branch') || 'main';
        let language = c.req.query('lang');
        const project = (c as any).get('project');
        const octokit = (c as any).get('octokit') as Octokit;
        const owner = (c as any).get('owner') as string;
        const repo = (c as any).get('repo') as string;

        // Handle source-language parameter
        if (language === 'source-language') {
            language = project.sourceLanguage;
        }

        try {
            const latestCommitSha = await getLatestCommitSha(octokit, owner, repo, branch);

            // 1. Lightweight check: Get latest commit SHA for the branch
            // This is fast and cheap compared to fetching the full manifest
            const serverETag = `"${latestCommitSha}"`;

            if (c.req.header('If-None-Match') === serverETag) {
                // Return 304 Not Modified
                // Cloudflare will serve the cached response if available
                return c.body(null, 304, {
                    'ETag': serverETag,
                    'Cache-Control': 'public, max-age=60, s-maxage=60' // Cache for 60s in browser and CDN
                });
            }

            // 2. Fetch Manifest (only if ETag didn't match)
            const manifest = await fetchGeneratedManifest(octokit, owner, repo, branch);

            if (!manifest) {
                return c.json({
                    files: [],
                    message: 'No manifest found. Please run the koro-i18n CLI to generate the manifest.',
                });
            }

            // Filter manifest files by language if specified
            const manifestFiles = manifest.files;
            const filteredManifestFiles = language
                ? manifestFiles.filter(f => f.language === language)
                : manifestFiles;

            // 3. Get translation counts from DB
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

            const countMap = new Map<string, number>();
            for (const tc of translationCounts) {
                countMap.set(`${tc.language}:${tc.filename}`, tc._count.id);
            }

            // 4. Use totalKeys from manifest entries when available
            // The generated manifest contains totalKeys per file (source counts). This avoids fetching
            // and streaming additional store/progress files for the summary endpoint.

            // 5. Build response
            const filesWithProgress = filteredManifestFiles.map(mf => {
                const translatedCount = countMap.get(`${mf.language}:${mf.filename}`) || 0;
                const totalKeys = mf.totalKeys || 0;

                const translationPercentage = totalKeys > 0
                    ? Math.round((translatedCount / totalKeys) * 100)
                    : 0;

                let lastUpdated: Date;
                try {
                    lastUpdated = new Date(mf.lastUpdated);
                    if (isNaN(lastUpdated.getTime())) lastUpdated = new Date();
                } catch {
                    lastUpdated = new Date();
                }

                return {
                    filename: mf.filename,
                    lang: mf.language,
                    totalKeys,
                    translatedKeys: Math.min(translatedCount, totalKeys),
                    translationPercentage,
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
            // Cache for 60 seconds in browser and Cloudflare (s-maxage)
            // This allows Cloudflare to shield the origin from excessive GitHub API calls
            response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');

            return response;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error fetching summary:', errorMessage);
            return c.json({
                error: `Failed to fetch summary: ${errorMessage}`
            }, 500);
        }
    });

    // List files - now uses GitHub manifest
    app.get('/', async (c) => {
        const branch = c.req.query('branch') || 'main';
        let language = c.req.query('language');
        const project = (c as any).get('project');
        const octokit = (c as any).get('octokit') as Octokit;
        const owner = (c as any).get('owner') as string;
        const repo = (c as any).get('repo') as string;

        if (language === 'source-language') {
            language = project.sourceLanguage;
        }

        try {
            // Fetch manifest from GitHub
            const manifest = await fetchGeneratedManifest(octokit, owner, repo, branch);

            if (!manifest) {
                return c.json({
                    files: [],
                    message: 'No manifest found. Please run the koro-i18n CLI to generate the manifest.',
                });
            }

            // Filter by language if specified
            const manifestFiles = language
                ? manifest.files.filter(f => f.language === language)
                : manifest.files;

            // Generate ETag from latest commit hash
            const latestCommit = manifestFiles.length > 0
                ? manifestFiles.reduce((latest, f) => f.commitHash > latest ? f.commitHash : latest, '')
                : '';
            const serverETag = `"${latestCommit || Date.now()}"`;

            if (c.req.header('If-None-Match') === serverETag) {
                return c.body(null, 304, { 'ETag': serverETag, 'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles) });
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error listing files from GitHub:', errorMessage);
            return c.json({
                error: `Failed to list files from GitHub: ${errorMessage}`
            }, 500);
        }
    });

    // Get file content - now fetches directly from GitHub
    app.get('/:lang/:filename', async (c) => {
        const lang = c.req.param('lang');
        const filename = c.req.param('filename');
        const branch = c.req.query('branch') || 'main';
        const project = (c as any).get('project');
        const octokit = (c as any).get('octokit') as Octokit;
        const owner = (c as any).get('owner') as string;
        const repo = (c as any).get('repo') as string;

        try {
            // Stream the file directly from GitHub
            // This endpoint now streams the raw file content directly.
            const result = await streamSingleFileFromGitHub(octokit, owner, repo, lang, filename, branch);

            if (!result) {
                return c.json({ error: 'File not found in GitHub repository' }, 404);
            }

            const { stream, contentType, commitSha } = result;

            // Generate ETag from commit SHA
            const serverETag = `"${commitSha}"`;
            if (c.req.header('If-None-Match') === serverETag) {
                return c.body(null, 304, { 'ETag': serverETag, 'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles) });
            }

            return new Response(stream, {
                headers: {
                    'Content-Type': contentType,
                    'Transfer-Encoding': 'chunked',
                    'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles),
                    'ETag': serverETag,
                    'X-Deprecation-Warning': 'This endpoint now streams raw content. The JSON wrapper format is deprecated.',
                },
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error fetching file from GitHub:', errorMessage);
            return c.json({
                error: `Failed to fetch file from GitHub: ${errorMessage}`
            }, 500);
        }
    });

    return app;
}
