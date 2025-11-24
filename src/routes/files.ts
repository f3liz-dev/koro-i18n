import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { getFile } from '../lib/r2-storage';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { resolveActualProjectId, checkProjectAccess } from '../lib/database';
import { Octokit } from '@octokit/rest';
import {
    getUserGitHubToken,
    fetchTranslationFilesFromGitHub,
    processGitHubTranslationFiles,
    getLatestCommitSha,
    fetchGeneratedManifest,
    fetchFilesFromManifest,
} from '../lib/github-repo-fetcher';

interface Env {
    TRANSLATION_BUCKET: R2Bucket;
    JWT_SECRET: string;
    ENVIRONMENT: string;
    PLATFORM_URL?: string;
    COMPUTE_WORKER_URL?: string;
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
                    error: 'Generated manifest not found. Please ensure .koro-i18n/koro-i18n.repo.generated.json exists in your repository.' 
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
                    error: 'Generated manifest not found. Please ensure .koro-i18n/koro-i18n.repo.generated.json exists in your repository.' 
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



    // List files
    app.get('/', authMiddleware, async (c) => {
        const projectName = c.req.param('projectName');
        const branch = c.req.query('branch') || 'main';
        let language = c.req.query('language');

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { repository: true, sourceLanguage: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        if (language === 'source-language') {
            language = project.sourceLanguage;
        }

        const where: any = { projectId: project.repository, branch };
        if (language) where.lang = language;

        const files = await prisma.r2File.findMany({
            where,
            orderBy: { uploadedAt: 'desc' },
        });

        const latestUpdate = files.length > 0 ? Math.max(...files.map(f => f.lastUpdated.getTime())) : Date.now();
        const serverETag = `"${latestUpdate}"`;

        if (c.req.header('If-None-Match') === serverETag) {
            return c.body(null, 304, { 'ETag': serverETag, 'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles) });
        }

        const response = c.json({
            files: files.map(f => ({
                lang: f.lang,
                filename: f.filename,
                commitSha: f.commitSha,
                r2Key: f.r2Key,
                sourceHash: f.sourceHash,
                totalKeys: f.totalKeys,
                uploadedAt: f.uploadedAt,
            })),
        });
        response.headers.set('ETag', serverETag);
        response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));
        return response;
    });

    // Get file content
    app.get('/:lang/:filename', authMiddleware, async (c) => {
        const projectName = c.req.param('projectName');
        const lang = c.req.param('lang');
        const filename = c.req.param('filename');
        const branch = c.req.query('branch') || 'main';

        const actualProjectId = await resolveActualProjectId(prisma, projectName);

        const fileIndex = await prisma.r2File.findUnique({
            where: {
                projectId_branch_lang_filename: {
                    projectId: actualProjectId,
                    branch,
                    lang,
                    filename,
                },
            },
        });

        if (!fileIndex) return c.json({ error: 'File not found' }, 404);

        const serverETag = `"${fileIndex.lastUpdated.getTime()}"`;
        if (c.req.header('If-None-Match') === serverETag) {
            return c.body(null, 304, { 'ETag': serverETag, 'Cache-Control': buildCacheControl(CACHE_CONFIGS.projectFiles) });
        }

        const fileData = await getFile(env.TRANSLATION_BUCKET, fileIndex.r2Key);
        if (!fileData) return c.json({ error: 'File not found in R2' }, 404);

        const response = c.json({
            raw: fileData.raw,
            metadata: fileData.metadata,
            sourceHash: fileData.sourceHash,
            commitSha: fileData.commitSha,
            uploadedAt: fileData.uploadedAt,
            totalKeys: fileIndex.totalKeys,
        });
        response.headers.set('ETag', serverETag);
        response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projectFiles));
        return response;
    });

    return app;
}
