import { Hono } from 'hono';
import * as t from 'io-ts';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { createProjectMiddleware } from '../lib/project-middleware';
import { validate } from '../lib/validator';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { generateTranslationsETag, generateHistoryETag, checkETagMatch, create304Response } from '../lib/etag-db';
import { Octokit } from '@octokit/rest';
import { getUserGitHubToken, fetchSingleFileFromGitHub } from '../lib/github-repo-fetcher';
import { ensureUserCanModerateTranslation } from '../lib/translation-access';

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

const serializeTranslation = (t: any, projectName?: string) => ({
    id: t.id,
    projectName: projectName ?? null,
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
    // All translation routes require project context for authorization
    app.use('*', authMiddleware, createProjectMiddleware(prisma, { requireAccess: true, withOctokit: false }));

    // Create Translation
    app.post('/', validate('json', CreateTranslationSchema), async (c) => {
        const user = (c as any).get('user');
        const { language, filename, key, value } = c.req.valid('json' as never) as t.TypeOf<typeof CreateTranslationSchema>;
        const project = (c as any).get('project');

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
    app.get('/', async (c) => {
        const project = (c as any).get('project');
        const language = c.req.query('language');
        const filename = c.req.query('filename');
        const status = c.req.query('status') || 'approved';
        const isValid = c.req.query('isValid');

        if (!project) return c.json({ error: 'Project not found' }, 404);

        const where: any = { status };
        where.projectId = project.id;

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

        const response = c.json({ translations: translations.map(t => serializeTranslation(t, project.name)) });
        response.headers.set('ETag', etag);
        response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
        return response;
    });

    // History
    app.get('/history', async (c) => {
        const project = (c as any).get('project');
        const language = c.req.query('language');
        const filename = c.req.query('filename');
        const key = c.req.query('key');

        if (!language || !filename || !key) {
            return c.json({ error: 'Missing required parameters' }, 400);
        }

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
    app.get('/suggestions', async (c) => {
        const project = (c as any).get('project');
        const language = c.req.query('language');
        const filename = c.req.query('filename');
        const key = c.req.query('key');

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

        const response = c.json({ suggestions: suggestions.map(t => serializeTranslation(t, project.name)) });
        response.headers.set('ETag', etag);
        response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translationSuggestions));
        return response;
    });

    // Get Translation Counts
    app.get('/counts', async (c) => {
        const project = (c as any).get('project');
        const language = c.req.query('language');

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

    // Get single translation
    app.get('/:id', async (c) => {
        const project = (c as any).get('project');
        const id = c.req.param('id');
        if (!project) return c.json({ error: 'Project not found' }, 404);

        const translation = await prisma.webTranslation.findUnique({
            where: { id },
            include: { user: { select: { username: true, avatarUrl: true } } },
        });
        if (!translation || translation.projectId !== project.id) return c.json({ error: 'Not found' }, 404);
        return c.json({ translation: serializeTranslation(translation, project.name) });
    });

    // Approve/Reject translation
    app.patch('/:id', async (c) => {
        const user = (c as any).get('user');
        const project = (c as any).get('project');
        const id = c.req.param('id');
        const body = await c.req.json();
        const status = body?.status;
        if (!['approved', 'rejected'].includes(status)) return c.json({ error: 'Invalid status' }, 400);

        const translation = await prisma.webTranslation.findUnique({ where: { id } });
        if (!translation) return c.json({ error: 'Translation not found' }, 404);
        if (translation.projectId !== (c as any).get('project')?.id) return c.json({ error: 'Not found' }, 404);

        try {
            await ensureUserCanModerateTranslation(prisma, translation.projectId, user);
        } catch (e) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        if (status === 'approved') {
            // Reject other pending/approved translations for same projectId+language+key
            await prisma.webTranslation.updateMany({
                where: {
                    projectId: translation.projectId,
                    language: translation.language,
                    key: translation.key,
                    id: { not: translation.id },
                    status: { in: ['pending', 'approved'] },
                },
                data: { status: 'rejected' },
            });
        }

        const updated = await prisma.webTranslation.update({ where: { id }, data: { status } });
        await prisma.webTranslationHistory.create({
            data: {
                id: crypto.randomUUID(),
                translationId: updated.id,
                projectId: updated.projectId,
                language: updated.language,
                filename: updated.filename,
                key: updated.key,
                value: updated.value,
                userId: user.userId,
                action: status === 'approved' ? 'approved' : 'rejected',
                sourceHash: updated.sourceHash,
            },
        });

        return c.json({ success: true, translation: serializeTranslation(updated, project.name) });
    });

    // Delete translation
    app.delete('/:id', async (c) => {
        const user = (c as any).get('user');
        const id = c.req.param('id');

        const translation = await prisma.webTranslation.findUnique({ where: { id } });
        if (!translation) return c.json({ error: 'Translation not found' }, 404);
        if (translation.projectId !== (c as any).get('project')?.id) return c.json({ error: 'Not found' }, 404);

        try {
            await ensureUserCanModerateTranslation(prisma, translation.projectId, user);
        } catch (e) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        await prisma.webTranslation.delete({ where: { id } });
        await prisma.webTranslationHistory.create({
            data: {
                id: crypto.randomUUID(),
                translationId: translation.id,
                projectId: translation.projectId,
                language: translation.language,
                filename: translation.filename,
                key: translation.key,
                value: translation.value,
                userId: user.userId,
                action: 'deleted',
                sourceHash: translation.sourceHash,
            },
        });

        return c.json({ success: true });
    });

    return app;
}

