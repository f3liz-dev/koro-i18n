import { Hono } from 'hono';
import * as t from 'io-ts';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { validate } from '../lib/validator';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { generateTranslationsETag, generateHistoryETag, checkETagMatch, create304Response } from '../lib/etag-db';
import { Octokit } from '@octokit/rest';
import { getUserGitHubToken, fetchSingleFileFromGitHub } from '../lib/github-repo-fetcher';

interface Env {
    JWT_SECRET: string;
    Variables: {
        user: any;
    };
}

const CreateTranslationSchema = t.type({
    language: t.string,
    filename: t.string,
    key: t.string,
    value: t.string,
});

const serializeTranslation = (t: any) => ({
    id: t.id,
    projectId: t.projectId,
    language: t.language,
    filename: t.filename,
    key: t.key,
    value: t.value,
    userId: t.userId,
    username: t.user?.username,
    avatarUrl: t.user?.avatarUrl,
    status: t.status,
    sourceHash: t.sourceHash,
    isValid: t.isValid,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
});

export function createProjectTranslationRoutes(prisma: PrismaClient, _env: Env) {
    const app = new Hono<{ Bindings: Env }>();

    // Create Translation
    app.post('/', authMiddleware, validate('json', CreateTranslationSchema), async (c) => {
        const user = c.get('user');
        const projectName = c.req.param('projectName');
        const { language, filename, key, value } = c.req.valid('json' as never) as t.TypeOf<typeof CreateTranslationSchema>;

        const project = await prisma.project.findFirst({
            where: { name: projectName },
            select: { id: true, repository: true, sourceLanguage: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        // Get source hash from GitHub to track source version
        // Note: This makes a GitHub API call per translation submission.
        // Consider caching source hashes in D1 or using the store files for better performance.
        // For now, this is acceptable as translations are submitted infrequently.
        let sourceHash: string | undefined;
        try {
            const githubToken = await getUserGitHubToken(prisma, user.userId);
            if (githubToken) {
                const parts = project.repository.trim().split('/');
                if (parts.length === 2 && parts[0] && parts[1]) {
                    const [owner, repo] = parts;
                    const octokit = new Octokit({ auth: githubToken });
                    const sourceFile = await fetchSingleFileFromGitHub(
                        octokit,
                        owner,
                        repo,
                        project.sourceLanguage,
                        filename,
                        'main'
                    );
                    if (sourceFile) {
                        sourceHash = sourceFile.metadata.sourceHashes?.[key];
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to get source hash from GitHub', e);
        }

        const id = crypto.randomUUID();
        await prisma.webTranslation.create({
            data: {
                id,
                projectId: project.id,
                language,
                filename,
                key,
                value,
                userId: user.userId,
                status: 'pending',
                sourceHash,
                isValid: true,
            },
        });

        await prisma.webTranslationHistory.create({
            data: {
                id: crypto.randomUUID(),
                translationId: id,
                projectId: project.id,
                language,
                filename,
                key,
                value,
                userId: user.userId,
                action: 'submitted',
                sourceHash,
            },
        });

        return c.json({ success: true, id });
    });

    // List Translations
    app.get('/', authMiddleware, async (c) => {
        const projectName = c.req.param('projectName');
        const language = c.req.query('language');
        const filename = c.req.query('filename');
        const status = c.req.query('status') || 'approved';
        const isValid = c.req.query('isValid');

        const project = await prisma.project.findFirst({
            where: { name: projectName },
            select: { id: true },
        });

        const where: any = { status };
        if (project) {
            where.projectId = project.id;
        } else {
            // Fallback if project not found by name (maybe it's an ID?)
            // But we enforce name now.
            return c.json({ error: 'Project not found' }, 404);
        }

        if (language) where.language = language;
        if (filename) where.filename = filename;
        if (isValid !== undefined) where.isValid = isValid === 'true';

        const translations = await prisma.webTranslation.findMany({
            where,
            include: { user: { select: { username: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
            take: 500,
        });

        const etag = generateTranslationsETag(translations.map(t => t.updatedAt));
        if (checkETagMatch(c.req.raw, etag)) {
            return create304Response(etag, buildCacheControl(CACHE_CONFIGS.translations));
        }

        const response = c.json({ translations: translations.map(serializeTranslation) });
        response.headers.set('ETag', etag);
        response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
        return response;
    });

    // History
    app.get('/history', authMiddleware, async (c) => {
        const projectName = c.req.param('projectName');
        const language = c.req.query('language');
        const filename = c.req.query('filename');
        const key = c.req.query('key');

        if (!language || !filename || !key) {
            return c.json({ error: 'Missing required parameters' }, 400);
        }

        const project = await prisma.project.findFirst({
            where: { name: projectName },
            select: { id: true },
        });
        if (!project) return c.json({ error: 'Project not found' }, 404);

        const history = await prisma.webTranslationHistory.findMany({
            where: { projectId: project.id, language, filename, key },
            include: { user: { select: { username: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
        });

        const etag = generateHistoryETag(history.map(h => h.createdAt));
        if (checkETagMatch(c.req.raw, etag)) {
            return create304Response(etag, buildCacheControl(CACHE_CONFIGS.translations));
        }

        const response = c.json({ history });
        response.headers.set('ETag', etag);
        response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
        return response;
    });

    // Suggestions
    app.get('/suggestions', authMiddleware, async (c) => {
        const projectName = c.req.param('projectName');
        const language = c.req.query('language');
        const filename = c.req.query('filename');
        const key = c.req.query('key');

        const project = await prisma.project.findFirst({
            where: { name: projectName },
            select: { id: true },
        });
        if (!project) return c.json({ error: 'Project not found' }, 404);

        const where: any = { projectId: project.id, status: { not: 'deleted' } };
        if (language) where.language = language;
        if (filename) where.filename = filename;
        if (key) where.key = key;

        const suggestions = await prisma.webTranslation.findMany({
            where,
            include: { user: { select: { username: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
            take: 500,
        });

        const etag = generateTranslationsETag(suggestions.map(s => s.updatedAt));
        if (checkETagMatch(c.req.raw, etag)) {
            return create304Response(etag, buildCacheControl(CACHE_CONFIGS.translationSuggestions));
        }

        const response = c.json({ suggestions: suggestions.map(serializeTranslation) });
        response.headers.set('ETag', etag);
        response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translationSuggestions));
        return response;
    });

    // Get Translation Counts
    app.get('/counts', authMiddleware, async (c) => {
        const projectName = c.req.param('projectName');
        const language = c.req.query('language');

        const project = await prisma.project.findFirst({
            where: { name: projectName },
            select: { id: true },
        });

        if (!project) return c.json({ error: 'Project not found' }, 404);

        const where: any = {
            projectId: project.id,
            status: 'approved',
            isValid: true,
        };
        if (language) where.language = language;

        const counts = await prisma.webTranslation.groupBy({
            by: ['language', 'filename'],
            where,
            _count: { id: true },
        });

        const result = counts.map(c => ({
            language: c.language,
            filename: c.filename,
            count: c._count.id,
        }));

        return c.json({ counts: result });
    });

    return app;
}
