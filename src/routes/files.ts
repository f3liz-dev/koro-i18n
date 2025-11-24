import { Hono } from 'hono';
import * as t from 'io-ts';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { validate } from '../lib/validator';
import { getFile, cleanupOrphanedFiles } from '../lib/r2-storage';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { resolveActualProjectId, checkProjectAccess } from '../lib/database';
import { createRustWorker } from '../lib/rust-worker-client';
import { invalidateOutdatedTranslations } from '../lib/translation-validation';
import { Octokit } from '@octokit/rest';
import {
    getUserGitHubToken,
    fetchTranslationFilesFromGitHub,
    processGitHubTranslationFiles,
    getLatestCommitSha,
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

const FileSchema = t.type({
    lang: t.string,
    filename: t.string,
    contents: t.union([t.string, t.undefined]),
    metadata: t.union([t.record(t.string, t.unknown), t.undefined]),
    sourceHash: t.union([t.string, t.undefined]),
    packedData: t.union([t.array(t.number), t.undefined]),
});

const UploadSchema = t.intersection([
    t.type({
        files: t.array(FileSchema),
    }),
    t.partial({
        branch: t.string,
        commitSha: t.string,
        sourceLanguage: t.string,
        chunked: t.type({
            chunkIndex: t.number,
            totalChunks: t.number,
            isLastChunk: t.boolean,
        }),
    }),
]);

const CleanupSchema = t.type({
    allSourceFiles: t.array(t.string),
    branch: t.union([t.string, t.undefined]),
});

export function createFileRoutes(prisma: PrismaClient, env: Env) {
    const app = new Hono<{ Bindings: Env }>();

    // Initialize Rust worker
    const rustWorker = createRustWorker(env);

    // Middleware to check project access
    // Note: We assume this router is mounted at /api/projects/:projectName/files
    // So c.req.param('projectName') is available? 
    // Hono's app.route preserves params if configured correctly, but usually we need to access it carefully.
    // If mounted as app.route('/:projectName/files', filesApp), then :projectName is a param.

    // Fetch files from GitHub repository (NEW PREFERRED METHOD)
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

    // Upload files
    // @deprecated This endpoint is deprecated. Use /fetch-from-github instead to fetch files directly from GitHub.
    // This endpoint will be removed in a future version.
    app.post('/upload', authMiddleware, validate('json', UploadSchema), async (c) => {
        console.warn('[DEPRECATED] /upload endpoint is deprecated. Use /fetch-from-github instead.');
        
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const { branch, commitSha, sourceLanguage, files, chunked } = c.req.valid('json');

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, userId: true, repository: true, sourceLanguage: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // TODO: Validate OIDC vs JWT access more strictly if needed
        // For now, we assume authMiddleware checks valid token.
        // We should check if the user has write access.
        // If OIDC, we need to verify repository match.
        // If JWT, check DB access.

        // Simplified check for now:
        if (user.repository && user.repository !== project.repository) {
            return c.json({ error: 'Repository mismatch' }, 403);
        }
        if (!user.repository) {
            const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
            if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);
        }

        // Update source language
        if (sourceLanguage && sourceLanguage !== project.sourceLanguage && (!chunked || chunked.chunkIndex === 1)) {
            await prisma.project.update({
                where: { id: project.id },
                data: { sourceLanguage },
            });
        }

        const projectId = project.repository;
        const branchName = branch || 'main';
        const commitHash = commitSha || `upload-${Date.now()}`;

        // Upload logic using Rust worker
        let r2Keys: string[] = [];
        if (rustWorker) {
            try {
                const uploadResult = await rustWorker.upload({
                    project_id: projectId,
                    branch: branchName,
                    commit_sha: commitHash,
                    files: files.map(f => ({
                        lang: f.lang,
                        filename: f.filename,
                        contents: f.contents,
                        metadata: f.metadata,
                        source_hash: f.sourceHash,
                        packed_data: f.packedData,
                    })),
                });
                r2Keys = uploadResult.r2_keys;
            } catch (error) {
                console.error('Rust worker upload failed:', error);
                return c.json({ error: 'Upload failed' }, 503);
            }
        } else {
            return c.json({ error: 'Rust worker not configured' }, 503);
        }

        // Invalidation logic
        const invalidationResults: Record<string, any> = {};
        if (!chunked || chunked.isLastChunk) {
            for (const file of files) {
                if (file.lang === project.sourceLanguage || file.lang === sourceLanguage) {
                    const result = await invalidateOutdatedTranslations(
                        prisma,
                        env.TRANSLATION_BUCKET,
                        projectId,
                        file.lang,
                        file.filename,
                        rustWorker || undefined
                    );
                    if (result.invalidated > 0) {
                        invalidationResults[`${file.lang}/${file.filename}`] = result;
                    }
                }
            }
        }

        return c.json({
            success: true,
            projectId,
            commitSha: commitHash,
            filesUploaded: files.length,
            r2Keys,
            invalidationResults: (!chunked || chunked.isLastChunk) ? invalidationResults : undefined,
        });
    });

    // Cleanup
    app.post('/cleanup', authMiddleware, validate('json', CleanupSchema), async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const { branch, allSourceFiles } = c.req.valid('json');

        const project = await prisma.project.findUnique({
            where: { name: projectName },
            select: { id: true, repository: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Auth check
        if (user.repository && user.repository !== project.repository) {
            return c.json({ error: 'Repository mismatch' }, 403);
        }
        if (!user.repository) {
            const hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
            if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);
        }

        const cleanupResult = await cleanupOrphanedFiles(
            env.TRANSLATION_BUCKET,
            prisma,
            project.repository,
            branch || 'main',
            new Set(allSourceFiles)
        );

        return c.json({ success: true, cleanupResult });
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
