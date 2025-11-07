/**
 * Project API endpoints with Hono
 */

import { Hono, type Context } from 'hono';
import { createProjectService } from '../services/ProjectService.js';
import { createHonoAuthMiddleware } from '../middleware/hono-auth.js';
import { createErrorHandler, createRequestValidator, type ValidationError } from '../middleware/error-handling.js';
import { AuthService } from '../services/AuthService.js';
import type { User } from '@/lib/types/User.js';

export function createProjectRoutes(authService: AuthService) {
  const projectRoutes = new Hono();
  const { authenticate } = createHonoAuthMiddleware(authService);
  const { errorHandler, asyncHandler } = createErrorHandler();
  const { validateRequest, validators } = createRequestValidator();

  // Apply middleware to all project routes
  projectRoutes.use('*', authenticate);
  projectRoutes.use('*', errorHandler);

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
   * List all projects accessible to the authenticated user
   * GET /api/projects
   */
  projectRoutes.get('/', asyncHandler(async (c: Context) => {
    const session = c.get('user');
    if (!session) {
      throw new Error('Authentication required');
    }

    const user = createUserFromSession(session);
    const projectService = createProjectService(user);
    const projects = await projectService.discoverProjects();

    return c.json({
      projects,
      count: projects.length,
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * Get specific project by ID
   * GET /api/projects/:projectId
   */
  projectRoutes.get('/:projectId', 
    validateRequest({
      params: {
        projectId: (value: string) => validators.required(value) && validators.isProjectId(value)
      }
    }),
    asyncHandler(async (c: Context) => {
      const session = c.get('user');
      if (!session) {
        throw new Error('Authentication required');
      }

      const projectId = c.req.param('projectId');
      const user = createUserFromSession(session);
      const projectService = createProjectService(user);
      
      // Validate user has access to this project
      const hasAccess = await projectService.validateProjectAccess(projectId);
      if (!hasAccess) {
        throw new Error('Access denied to project');
      }

      const project = await projectService.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      return c.json({ 
        project,
        timestamp: new Date().toISOString()
      });
    })
  );

  /**
   * Get translation files for a project
   * GET /api/projects/:projectId/files
   */
  projectRoutes.get('/:projectId/files',
    validateRequest({
      params: {
        projectId: (value: string) => validators.required(value) && validators.isProjectId(value)
      }
    }),
    asyncHandler(async (c: Context) => {
      const session = c.get('user');
      if (!session) {
        throw new Error('Authentication required');
      }

      const projectId = c.req.param('projectId');
      const user = createUserFromSession(session);
      const projectService = createProjectService(user);
      
      // Validate access
      const hasAccess = await projectService.validateProjectAccess(projectId);
      if (!hasAccess) {
        throw new Error('Access denied to project');
      }

      const translationFiles = await projectService.getTranslationFiles(projectId);

      return c.json({
        projectId,
        files: translationFiles,
        count: translationFiles.length,
        timestamp: new Date().toISOString()
      });
    })
  );

  /**
   * Get source files for a project
   * GET /api/projects/:projectId/sources
   */
  projectRoutes.get('/:projectId/sources',
    validateRequest({
      params: {
        projectId: (value: string) => validators.required(value) && validators.isProjectId(value)
      }
    }),
    asyncHandler(async (c: Context) => {
      const session = c.get('user');
      if (!session) {
        throw new Error('Authentication required');
      }

      const projectId = c.req.param('projectId');
      const user = createUserFromSession(session);
      const projectService = createProjectService(user);
      
      // Validate access
      const hasAccess = await projectService.validateProjectAccess(projectId);
      if (!hasAccess) {
        throw new Error('Access denied to project');
      }

      const sourceFiles = await projectService.getSourceFiles(projectId);

      return c.json({
        projectId,
        sourceFiles,
        count: sourceFiles.length,
        timestamp: new Date().toISOString()
      });
    })
  );

  /**
   * Update project settings
   * PUT /api/projects/:projectId/settings
   */
  projectRoutes.put('/:projectId/settings',
    validateRequest({
      params: {
        projectId: (value: string) => validators.required(value) && validators.isProjectId(value)
      },
      body: (body: any) => {
        const errors: ValidationError[] = [];
        
        if (!body || typeof body !== 'object') {
          errors.push({ field: 'body', message: 'Settings object is required' });
          return errors;
        }

        // Validate settings fields if present
        if (body.submitAsPR !== undefined && typeof body.submitAsPR !== 'boolean') {
          errors.push({ field: 'submitAsPR', message: 'Must be a boolean', value: body.submitAsPR });
        }
        
        if (body.requireReview !== undefined && typeof body.requireReview !== 'boolean') {
          errors.push({ field: 'requireReview', message: 'Must be a boolean', value: body.requireReview });
        }
        
        if (body.autoMerge !== undefined && typeof body.autoMerge !== 'boolean') {
          errors.push({ field: 'autoMerge', message: 'Must be a boolean', value: body.autoMerge });
        }
        
        if (body.commitMessageTemplate !== undefined && typeof body.commitMessageTemplate !== 'string') {
          errors.push({ field: 'commitMessageTemplate', message: 'Must be a string', value: body.commitMessageTemplate });
        }
        
        if (body.prTitleTemplate !== undefined && typeof body.prTitleTemplate !== 'string') {
          errors.push({ field: 'prTitleTemplate', message: 'Must be a string', value: body.prTitleTemplate });
        }

        return errors;
      }
    }),
    asyncHandler(async (c: Context) => {
      const session = c.get('user');
      if (!session) {
        throw new Error('Authentication required');
      }

      const projectId = c.req.param('projectId');
      const settings = await c.req.json();
      
      const user = createUserFromSession(session);
      const projectService = createProjectService(user);
      
      // Validate access
      const hasAccess = await projectService.validateProjectAccess(projectId);
      if (!hasAccess) {
        throw new Error('Access denied to project');
      }

      const updatedProject = await projectService.updateProjectSettings(projectId, settings);

      return c.json({
        success: true,
        project: updatedProject,
        message: 'Project settings updated successfully',
        timestamp: new Date().toISOString()
      });
    })
  );

  /**
   * Refresh project configuration from repository
   * POST /api/projects/:projectId/refresh
   */
  projectRoutes.post('/:projectId/refresh',
    validateRequest({
      params: {
        projectId: (value: string) => validators.required(value) && validators.isProjectId(value)
      }
    }),
    asyncHandler(async (c: Context) => {
      const session = c.get('user');
      if (!session) {
        throw new Error('Authentication required');
      }

      const projectId = c.req.param('projectId');
      const user = createUserFromSession(session);
      const projectService = createProjectService(user);
      
      // Validate access
      const hasAccess = await projectService.validateProjectAccess(projectId);
      if (!hasAccess) {
        throw new Error('Access denied to project');
      }

      const refreshedProject = await projectService.refreshProject(projectId);

      return c.json({
        success: true,
        project: refreshedProject,
        message: 'Project configuration refreshed successfully',
        timestamp: new Date().toISOString()
      });
    })
  );

  return projectRoutes;
}