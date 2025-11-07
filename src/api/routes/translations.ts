/**
 * Translation API endpoints with Hono
 */

import { Hono, type Context } from 'hono';
import { TranslationService } from '../services/TranslationService.js';
import { GitHubRepositoryService, createTranslationBotService } from '../services/GitHubService.js';
import { createProjectService } from '../services/ProjectService.js';
import { createHonoAuthMiddleware } from '../middleware/hono-auth.js';
import { userFriendlyErrorMiddleware } from '../middleware/user-friendly-errors.js';
import { AuthService } from '../services/AuthService.js';
import { TranslationSubmission } from '@/lib/types/Translation.js';
import { User } from '@/lib/types/User.js';
import { pluginRegistry, jsonPlugin, markdownPlugin } from '@/lib/plugins/index.js';
import { logger } from '../services/LoggingService.js';
import { ErrorRecoveryStrategy } from '@/lib/utils/error-handler.js';

// Initialize built-in plugins
pluginRegistry.register(jsonPlugin);
pluginRegistry.register(markdownPlugin);

export function createTranslationRoutes(authService: AuthService) {
  const translationRoutes = new Hono();
  const { authenticate } = createHonoAuthMiddleware(authService);

  // Apply user-friendly error handling middleware
  translationRoutes.use('*', userFriendlyErrorMiddleware());

  // Apply authentication middleware to all routes
  translationRoutes.use('*', authenticate);

  /**
   * Helper function to create user object from session
   */
  const createUserFromSession = (session: any): User => ({
    id: session.userId,
    githubId: session.githubId,
    username: session.username,
    email: '', // Not needed for GitHub operations
    avatarUrl: '',
    accessToken: session.accessToken,
    refreshToken: '',
    lastActive: new Date(),
    preferences: {
      language: 'en',
      theme: 'auto' as const,
      autoSave: true,
      notifications: true
    }
  });

  /**
   * Get translation strings for a project with plugin support
   * GET /api/translations/projects/:projectId/strings
   */
  translationRoutes.get('/projects/:projectId/strings', async (c: Context) => {
    const requestId = c.get('requestId');
    const session = c.get('user');
    if (!session) {
      throw new Error('Unauthorized');
    }

    const projectId = c.req.param('projectId');
    const language = c.req.query('language');
    const sourceFile = c.req.query('sourceFile');

    if (!projectId) {
      const error = new Error('Project ID is required');
      error.name = 'ValidationError';
      throw error;
    }

    const user = createUserFromSession(session);
    const projectService = createProjectService(user);
    const githubService = new GitHubRepositoryService(user.accessToken);
    const translationService = new TranslationService(githubService);

    // Get project from project service with retry on network failures
    const project = await ErrorRecoveryStrategy.recoverFromNetworkFailure(
      () => projectService.getProject(projectId),
      {
        maxAttempts: 3,
        onRetry: (attempt, error) => {
          logger.logNetworkFailure(
            `Get project ${projectId}`,
            error,
            attempt,
            3,
            attempt < 3,
            requestId
          );
        }
      }
    );

    if (!project) {
      throw new Error('Not found');
    }

    // Validate user has access to this project
    const hasAccess = await projectService.validateProjectAccess(projectId);
    if (!hasAccess) {
      throw new Error('Forbidden');
    }

    if (sourceFile) {
      // Extract strings from specific source file
      const strings = await translationService.extractTranslationStrings(project, sourceFile, requestId);
      
      logger.info(`Retrieved translation strings from source file`, {
        projectId,
        sourceFile,
        stringCount: Object.keys(strings).length
      }, requestId);

      return c.json({ 
        projectId,
        sourceFile,
        strings,
        supportedFormats: translationService.getSupportedFormats()
      });
    } else {
      // Get existing translations
      const translations = translationService.getTranslations(projectId, language);
      const progress = language ? translationService.getTranslationProgress(projectId, language) : null;
      
      logger.info(`Retrieved translations`, {
        projectId,
        language,
        translationCount: translations.length
      }, requestId);

      return c.json({
        projectId,
        language,
        translations,
        progress,
        supportedFormats: translationService.getSupportedFormats()
      });
    }
  });

  /**
   * Submit translation with plugin-based validation and commit creation
   * POST /api/translations
   */
  translationRoutes.post('/', async (c: Context) => {
    const requestId = c.get('requestId');
    const session = c.get('user');
    if (!session) {
      throw new Error('Unauthorized');
    }

    const submission: TranslationSubmission = await c.req.json();

    // Validate required fields
    if (!submission.projectId || !submission.stringKey || !submission.translatedText || !submission.language) {
      const error = new Error('Missing required fields: projectId, stringKey, translatedText, language');
      error.name = 'ValidationError';
      throw error;
    }

    const user = createUserFromSession(session);
    const projectService = createProjectService(user);
    const githubService = new GitHubRepositoryService(user.accessToken);
    const translationService = new TranslationService(githubService);
    const translationBotService = createTranslationBotService(user);

    // Get project from project service with retry
    const project = await ErrorRecoveryStrategy.recoverFromNetworkFailure(
      () => projectService.getProject(submission.projectId),
      {
        maxAttempts: 3,
        onRetry: (attempt, error) => {
          logger.logNetworkFailure(
            `Get project ${submission.projectId}`,
            error,
            attempt,
            3,
            attempt < 3,
            requestId
          );
        }
      }
    );

    if (!project) {
      throw new Error('Not found');
    }

    // Validate user has access to this project
    const hasAccess = await projectService.validateProjectAccess(submission.projectId);
    if (!hasAccess) {
      throw new Error('Forbidden');
    }

    // Submit translation
    const translation = await translationService.submitTranslation(submission, project, requestId);

    // If translation is valid, create commit using Translation Bot Service
    if (translation.status !== 'failed') {
      // Update translation status to submitted
      translationService.updateTranslationStatus(translation.id, 'submitted');

      // Determine output file path and format
      const translationFile = project.translationFiles.find(tf => 
        tf.language === submission.language && 
        tf.sourcePath.includes(submission.stringKey.split('.')[0])
      );

      if (translationFile) {
        // Generate translation file content
        const translationStrings = { [submission.stringKey]: submission.translatedText };
        const fileContent = translationService.generateTranslationFile(translationStrings, translationFile.format);

        // Create commit with retry and recovery (Requirement 2.5)
        const commitResult = await ErrorRecoveryStrategy.recoverFromCommitFailure(
          () => translationBotService.commitTranslations(
            project.repository.owner,
            project.repository.name,
            [{
              filePath: translationFile.outputPath,
              content: fileContent,
              language: submission.language,
              keys: [submission.stringKey]
            }],
            {
              name: user.username,
              email: user.email || `${user.username}@users.noreply.github.com`,
              username: user.username
            },
            {
              branch: project.repository.branch,
              createPR: project.settings.submitAsPR,
              prTitle: project.settings.prTitleTemplate,
              baseBranch: project.repository.branch
            }
          )
        ).catch((commitError) => {
          // Update translation status to failed
          translationService.updateTranslationStatus(translation.id, 'failed');
          
          logger.logCommitFailure(
            project.id,
            submission.language,
            commitError,
            3,
            3,
            requestId
          );

          // Create user-friendly error
          const error: any = new Error('commit');
          error.code = 'COMMIT_FAILED';
          error.originalError = commitError;
          error.attempt = 3;
          error.maxAttempts = 3;
          throw error;
        });

        // Update translation status to committed
        const commitSha = 'sha' in commitResult ? commitResult.sha : undefined;
        translationService.updateTranslationStatus(translation.id, 'committed', commitSha);

        logger.logTranslation(
          'commit',
          project.id,
          submission.language,
          true,
          {
            translationId: translation.id,
            commitSha,
            stringKey: submission.stringKey
          },
          requestId
        );

        return c.json({
          success: true,
          translation,
          commit: commitResult,
          message: 'Translation submitted and committed successfully'
        }, 201);
      }
    }

    return c.json({
      success: true,
      translation,
      message: 'Translation submitted successfully'
    }, 201);
  });

  /**
   * Submit batch translations for multiple strings with commit creation
   * POST /api/translations/batch
   */
  translationRoutes.post('/batch', async (c: Context) => {
    try {
      const session = c.get('user');
      if (!session) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const { projectId, language, translations } = await c.req.json();

      if (!projectId || !language || !Array.isArray(translations)) {
        return c.json({ 
          error: 'Missing required fields: projectId, language, translations (array)' 
        }, 400);
      }

      const user = createUserFromSession(session);
      const projectService = createProjectService(user);
      const githubService = new GitHubRepositoryService(user.accessToken);
      const translationService = new TranslationService(githubService);
      const translationBotService = createTranslationBotService(user);

      // Get project from project service
      const project = await projectService.getProject(projectId);
      if (!project) {
        return c.json({ error: 'Project not found' }, 404);
      }

      // Validate user has access to this project
      const hasAccess = await projectService.validateProjectAccess(projectId);
      if (!hasAccess) {
        return c.json({ error: 'Access denied to project' }, 403);
      }

      const results = [];
      const errors = [];
      const translationsByFile = new Map<string, { strings: Record<string, string>; keys: string[] }>();

      // Process each translation
      for (const translationData of translations) {
        try {
          const submission: TranslationSubmission = {
            projectId,
            language,
            stringKey: translationData.stringKey,
            translatedText: translationData.translatedText
          };

          const translation = await translationService.submitTranslation(submission, project);
          results.push(translation);

          // Group translations by target file for batch commit
          if (translation.status !== 'failed') {
            const translationFile = project.translationFiles.find(tf => 
              tf.language === language && 
              tf.sourcePath.includes(translationData.stringKey.split('.')[0])
            );

            if (translationFile) {
              if (!translationsByFile.has(translationFile.outputPath)) {
                translationsByFile.set(translationFile.outputPath, { strings: {}, keys: [] });
              }
              const fileData = translationsByFile.get(translationFile.outputPath)!;
              fileData.strings[translationData.stringKey] = translationData.translatedText;
              fileData.keys.push(translationData.stringKey);
            }
          }
        } catch (error) {
          errors.push({
            stringKey: translationData.stringKey,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Create batch commit if there are valid translations
      let commitResult = null;
      if (translationsByFile.size > 0) {
        try {
          const filesToCommit = [];
          const allKeys: string[] = [];

          for (const [filePath, fileData] of translationsByFile.entries()) {
            const translationFile = project.translationFiles.find(tf => tf.outputPath === filePath);
            if (translationFile) {
              const fileContent = translationService.generateTranslationFile(fileData.strings, translationFile.format);
              filesToCommit.push({
                filePath,
                content: fileContent,
                language,
                keys: fileData.keys
              });
              allKeys.push(...fileData.keys);
            }
          }

          if (filesToCommit.length > 0) {
            commitResult = await translationBotService.commitTranslations(
              project.repository.owner,
              project.repository.name,
              filesToCommit,
              {
                name: user.username,
                email: user.email || `${user.username}@users.noreply.github.com`,
                username: user.username
              },
              {
                branch: project.repository.branch,
                createPR: project.settings.submitAsPR,
                prTitle: project.settings.prTitleTemplate,
                baseBranch: project.repository.branch
              }
            );

            // Update all successful translations to committed status
            const commitSha = 'sha' in commitResult ? commitResult.sha : undefined;
            for (const translation of results) {
              if (translation.status !== 'failed') {
                translationService.updateTranslationStatus(translation.id, 'committed', commitSha);
              }
            }
          }
        } catch (commitError) {
          // Update all translations to failed status
          for (const translation of results) {
            if (translation.status !== 'failed') {
              translationService.updateTranslationStatus(translation.id, 'failed');
            }
          }

          console.error('Error creating batch commit:', commitError);
          return c.json({
            success: false,
            processed: results.length,
            errorCount: errors.length,
            results,
            errors,
            commitError: commitError instanceof Error ? commitError.message : String(commitError)
          }, 500);
        }
      }

      return c.json({
        success: true,
        processed: results.length,
        errorCount: errors.length,
        results,
        errors,
        commit: commitResult
      });
    } catch (error) {
      console.error('Error processing batch translations:', error);
      return c.json({ 
        error: 'Failed to process batch translations',
        details: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  /**
   * Get translation status and progress
   * GET /api/translations/projects/:projectId/status
   */
  translationRoutes.get('/projects/:projectId/status', async (c: Context) => {
    try {
      const session = c.get('user');
      if (!session) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const projectId = c.req.param('projectId');
      const language = c.req.query('language');

      if (!projectId) {
        return c.json({ error: 'Project ID is required' }, 400);
      }

      const user = createUserFromSession(session);
      const projectService = createProjectService(user);
      const githubService = new GitHubRepositoryService(user.accessToken);
      const translationService = new TranslationService(githubService);

      // Validate user has access to this project
      const hasAccess = await projectService.validateProjectAccess(projectId);
      if (!hasAccess) {
        return c.json({ error: 'Access denied to project' }, 403);
      }

      if (language) {
        // Get progress for specific language
        const progress = translationService.getTranslationProgress(projectId, language);
        return c.json({
          projectId,
          language,
          progress
        });
      } else {
        // Get overall project status
        const translations = translationService.getTranslations(projectId);
        const languages = Array.from(new Set(translations.map(t => t.language)));
        
        const progressByLanguage = languages.map(lang => ({
          language: lang,
          progress: translationService.getTranslationProgress(projectId, lang)
        }));

        return c.json({
          projectId,
          totalTranslations: translations.length,
          languages: progressByLanguage
        });
      }
    } catch (error) {
      console.error('Error retrieving translation status:', error);
      return c.json({ 
        error: 'Failed to retrieve translation status',
        details: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  /**
   * Validate translation content using format plugins
   * POST /api/translations/validate
   */
  translationRoutes.post('/validate', async (c: Context) => {
    const requestId = c.get('requestId');
    const session = c.get('user');
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { content, format } = await c.req.json();

    if (!content || !format) {
      const error = new Error('Missing required fields: content, format');
      error.name = 'ValidationError';
      throw error;
    }

    const user = createUserFromSession(session);
    const githubService = new GitHubRepositoryService(user.accessToken);
    const translationService = new TranslationService(githubService);

    // Check if format is supported
    if (!translationService.isFormatSupported(format)) {
      const error: any = new Error(`Unsupported format: ${format}`);
      error.name = 'ValidationError';
      error.details = {
        supportedFormats: translationService.getSupportedFormats()
      };
      throw error;
    }

    // Validate content (Requirement 5.5)
    const validationResult = translationService.validateTranslation(content, format, requestId);

    logger.info(`Translation validation completed`, {
      format,
      isValid: validationResult.isValid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length
    }, requestId);

    return c.json({
      format,
      validation: validationResult
    });
  });

  /**
   * Get supported formats from plugin registry
   * GET /api/translations/formats
   */
  translationRoutes.get('/formats', async (c: Context) => {
    try {
      const session = c.get('user');
      if (!session) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const user = createUserFromSession(session);
      const githubService = new GitHubRepositoryService(user.accessToken);
      const translationService = new TranslationService(githubService);

      const supportedFormats = translationService.getSupportedFormats();
      
      return c.json({
        supportedFormats,
        count: supportedFormats.length
      });
    } catch (error) {
      console.error('Error retrieving supported formats:', error);
      return c.json({ 
        error: 'Failed to retrieve supported formats',
        details: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  /**
   * Update translation status (for internal use by commit system)
   * PUT /api/translations/:translationId/status
   */
  translationRoutes.put('/:translationId/status', async (c: Context) => {
    try {
      const session = c.get('user');
      if (!session) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const translationId = c.req.param('translationId');
      const { status, commitSha } = await c.req.json();

      if (!translationId || !status) {
        return c.json({ 
          error: 'Missing required fields: translationId, status' 
        }, 400);
      }

      // Validate status
      const validStatuses = ['draft', 'submitted', 'committed', 'failed'];
      if (!validStatuses.includes(status)) {
        return c.json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        }, 400);
      }

      const user = createUserFromSession(session);
      const githubService = new GitHubRepositoryService(user.accessToken);
      const translationService = new TranslationService(githubService);

      // Update translation status
      translationService.updateTranslationStatus(translationId, status, commitSha);

      return c.json({
        success: true,
        translationId,
        status,
        commitSha,
        message: 'Translation status updated successfully'
      });
    } catch (error) {
      console.error('Error updating translation status:', error);
      return c.json({ 
        error: 'Failed to update translation status',
        details: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  return translationRoutes;
}