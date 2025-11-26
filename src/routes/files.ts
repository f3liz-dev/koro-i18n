import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { checkProjectAccess } from '../lib/database';
import { Octokit } from '@octokit/rest';
import {
    getUserGitHubToken,
    fetchTranslationFilesFromGitHub,
    processGitHubTranslationFiles,
    getLatestCommitSha,
    fetchGeneratedManifest,
    fetchFilesFromManifest,
    fetchSingleFileFromGitHub,
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

    // Fetch the generated manifest from the repository
    // This endpoint returns the manifest file that lists all translation files
    app.get('/manifest', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const branch = c.req.query('branch') || 'main';

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Check access
        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        // Get user's GitHub access token
        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) {
            return c.json({
                error: 'GitHub access token not found. Please re-authenticate with GitHub.'
            }, 401);
        }

        try {
            const parts = project.repository.trim().split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                return c.json({
                    error: 'Invalid repository format. Expected: owner/repo'
                }, 400);
            }
            const [owner, repo] = parts;

            const octokit = new Octokit({ auth: githubToken });

            // Fetch the generated manifest
            const manifest = await fetchGeneratedManifest(octokit, owner, repo, branch);

            if (!manifest) {
                return c.json({
                    error: 'Generated manifest not found. Please ensure .koro-i18n/koro-i18n.repo.generated.jsonl exists in your repository.'
                }, 404);
            }

            return c.json({
                success: true,
                manifest,
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error fetching manifest:', errorMessage);
            return c.json({
                error: `Failed to fetch manifest: ${errorMessage}`
            }, 500);
        }
    });

    // Stream the manifest as JSONL format
    // This endpoint returns the manifest in streaming JSONL format for efficient parsing
    // Each line is a JSON object: first line is header, subsequent lines are file entries
    app.get('/manifest/stream', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const branch = c.req.query('branch') || 'main';

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Check access
        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        // Get user's GitHub access token
        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) {
            return c.json({
                error: 'GitHub access token not found. Please re-authenticate with GitHub.'
            }, 401);
        }

        try {
            const parts = project.repository.trim().split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                return c.json({
                    error: 'Invalid repository format. Expected: owner/repo'
                }, 400);
            }
            const [owner, repo] = parts;

            const octokit = new Octokit({ auth: githubToken });

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
    app.get('/store/stream/:lang', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const lang = c.req.param('lang');
        const branch = c.req.query('branch') || 'main';

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) return c.json({ error: 'GitHub access token not found' }, 401);

        try {
            const parts = project.repository.trim().split('/');
            const [owner, repo] = parts;
            const octokit = new Octokit({ auth: githubToken });

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
    app.get('/progress/stream/:lang', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const lang = c.req.param('lang');
        const branch = c.req.query('branch') || 'main';

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) return c.json({ error: 'GitHub access token not found' }, 401);

        try {
            const parts = project.repository.trim().split('/');
            const [owner, repo] = parts;
            const octokit = new Octokit({ auth: githubToken });

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
    app.get('/stream/:path{.+}', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const filePath = c.req.param('path');
        const branch = c.req.query('branch') || 'main';

        if (!filePath) {
            return c.json({ error: 'File path is required' }, 400);
        }

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Check access
        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        // Get user's GitHub access token
        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) {
            return c.json({
                error: 'GitHub access token not found. Please re-authenticate with GitHub.'
            }, 401);
        }

        try {
            const parts = project.repository.trim().split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                return c.json({
                    error: 'Invalid repository format. Expected: owner/repo'
                }, 400);
            }
            const [owner, repo] = parts;

            const octokit = new Octokit({ auth: githubToken });

            // Stream file directly from GitHub
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
            return c.json({
                error: `Failed to stream file: ${errorMessage}`
            }, 500);
        }
    });

    // Fetch files using the generated manifest (RECOMMENDED METHOD)
    // This endpoint uses the pre-generated manifest to fetch specific files
    app.post('/fetch-from-manifest', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const { branch = 'main' } = await c.req.json().catch(() => ({}));

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true, sourceLanguage: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Check access
        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        // Get user's GitHub access token
        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) {
            return c.json({
                error: 'GitHub access token not found. Please re-authenticate with GitHub.'
            }, 401);
        }

        try {
            const parts = project.repository.trim().split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                return c.json({
                    error: 'Invalid repository format. Expected: owner/repo'
                }, 400);
            }
            const [owner, repo] = parts;

            const octokit = new Octokit({ auth: githubToken });

            // Fetch the generated manifest
            const manifest = await fetchGeneratedManifest(octokit, owner, repo, branch);

            if (!manifest) {
                return c.json({
                    error: 'Generated manifest not found. Please ensure .koro-i18n/koro-i18n.repo.generated.jsonl exists in your repository.'
                }, 404);
            }

            // Get latest commit SHA
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
            return c.json({
                success: true,
                repository: project.repository,
                branch,
                commitSha,
                filesFound: processedFiles.length,
                files: processedFiles,
                manifest: manifest,
                message: 'Files fetched successfully using generated manifest.',
            });
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
    app.post('/fetch-from-github', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const { path = 'locales', branch = 'main' } = await c.req.json().catch(() => ({}));

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true, sourceLanguage: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Check access
        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        // Get user's GitHub access token
        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) {
            return c.json({
                error: 'GitHub access token not found. Please re-authenticate with GitHub.'
            }, 401);
        }

        try {
            // Parse repository (format: owner/repo)
            const parts = project.repository.trim().split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                return c.json({
                    error: 'Invalid repository format. Expected: owner/repo'
                }, 400);
            }
            const [owner, repo] = parts;

            // Initialize Octokit with user's token
            const octokit = new Octokit({ auth: githubToken });

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

            // Important: Never expose the GitHub token to the client
            // The token is used only server-side to fetch files and metadata
            return c.json({
                success: true,
                repository: project.repository,
                branch,
                commitSha,
                filesFound: processedFiles.length,
                files: processedFiles,
                message: 'Files and git blame fetched successfully from GitHub.',
            });
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
    app.get('/summary', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const branch = c.req.query('branch') || 'main';
        let language = c.req.query('lang');

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, repository: true, sourceLanguage: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Check access
        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        // Get user's GitHub access token
        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) {
            return c.json({ error: 'GitHub access token not found' }, 401);
        }

        // Handle source-language parameter
        if (language === 'source-language') {
            language = project.sourceLanguage;
        }

        try {
            const parts = project.repository.trim().split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                return c.json({ error: 'Invalid repository format' }, 400);
            }
            const [owner, repo] = parts;
            const octokit = new Octokit({ auth: githubToken });

            // 1. Lightweight check: Get latest commit SHA for the branch
            // This is fast and cheap compared to fetching the full manifest
            const latestCommitSha = await getLatestCommitSha(octokit, owner, repo, branch);

            // Generate ETag from commit SHA
            // This ensures that if the repo hasn't changed, we return 304 immediately
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

            // 4. Fetch progress-translated files
            const sourceLanguage = manifest.sourceLanguage;
            let progressData: Record<string, string[]> | null = null;
            try {
                progressData = await fetchProgressTranslatedFile(
                    octokit,
                    owner,
                    repo,
                    sourceLanguage,
                    branch
                );
            } catch (error) {
                console.warn('[summary] Failed to fetch progress-translated file:', error);
            }

            // 5. Build response
            const filesWithProgress = filteredManifestFiles.map(mf => {
                const translatedCount = countMap.get(`${mf.language}:${mf.filename}`) || 0;
                const progressKey = mf.filename.replace(new RegExp(mf.language, 'g'), '<lang>');
                const keys = progressData?.[progressKey] || [];
                const totalKeys = keys.length;

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
    app.get('/', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const branch = c.req.query('branch') || 'main';
        let language = c.req.query('language');

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true, sourceLanguage: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Check access
        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        // Get user's GitHub access token
        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) {
            return c.json({
                error: 'GitHub access token not found. Please re-authenticate with GitHub.'
            }, 401);
        }

        if (language === 'source-language') {
            language = project.sourceLanguage;
        }

        try {
            const parts = project.repository.trim().split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                return c.json({
                    error: 'Invalid repository format. Expected: owner/repo'
                }, 400);
            }
            const [owner, repo] = parts;

            const octokit = new Octokit({ auth: githubToken });

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
    app.get('/:lang/:filename', authMiddleware, async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const lang = c.req.param('lang');
        const filename = c.req.param('filename');
        const branch = c.req.query('branch') || 'main';

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Check access
        const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
        if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

        // Get user's GitHub access token
        const githubToken = await getUserGitHubToken(prisma, user.userId);
        if (!githubToken) {
            return c.json({
                error: 'GitHub access token not found. Please re-authenticate with GitHub.'
            }, 401);
        }

        try {
            const parts = project.repository.trim().split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                return c.json({
                    error: 'Invalid repository format. Expected: owner/repo'
                }, 400);
            }
            const [owner, repo] = parts;

            const octokit = new Octokit({ auth: githubToken });

            // Fetch the file directly from GitHub
            const fileData = await fetchSingleFileFromGitHub(
                octokit,
                owner,
                repo,
                lang,
                filename,
                branch
            );

            if (!fileData) {
                return c.json({ error: 'File not found in GitHub repository' }, 404);
            }

            // Generate ETag from commit SHA
            const serverETag = `"${fileData.commitSha}"`;
            if (c.req.header('If-None-Match') === serverETag) {
                return c.body(null, 304, { 'ETag': serverETag, 'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles) });
            }

            const response = c.json({
                raw: fileData.contents,
                metadata: fileData.metadata,
                sourceHash: fileData.sourceHash,
                commitSha: fileData.commitSha,
                fetchedAt: new Date().toISOString(),
                totalKeys: Object.keys(fileData.contents).length,
            });
            response.headers.set('ETag', serverETag);
            response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));
            return response;
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
