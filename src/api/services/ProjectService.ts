/**
 * Project Management Service
 * Handles project discovery, configuration, and management
 */

import { GitHubRepositoryService } from './GitHubService.js';
import { Project, ProjectSettings, TranslationFile } from '@/lib/types/Project.js';
import { TranslationConfig } from '@/lib/types/config.js';
import { User } from '@/lib/types/User.js';

export class ProjectService {
  private projects = new Map<string, Project>();
  private githubService: GitHubRepositoryService;

  constructor(githubService: GitHubRepositoryService) {
    this.githubService = githubService;
  }

  /**
   * Discover projects from user's repositories with valid i18n configuration
   */
  async discoverProjects(): Promise<Project[]> {
    try {
      const configuredRepos = await this.githubService.listConfiguredRepositories();
      const projects: Project[] = [];

      for (const repo of configuredRepos) {
        const project = await this.createProjectFromRepository(repo, repo.config);
        projects.push(project);
        this.projects.set(project.id, project);
      }

      return projects;
    } catch (error) {
      throw new Error(`Failed to discover projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    const cachedProject = this.projects.get(projectId);
    if (cachedProject) {
      return cachedProject;
    }

    // Try to reconstruct project from ID (format: owner-repo-branch)
    const parts = projectId.split('-');
    if (parts.length >= 3) {
      const owner = parts[0];
      const repo = parts.slice(1, -1).join('-');
      const branch = parts[parts.length - 1];

      try {
        const config = await this.githubService.getRepositoryConfig(owner, repo, branch);
        const repoInfo = await this.githubService.validateRepositoryAccess(owner, repo);
        
        if (repoInfo.hasAccess && repoInfo.repository) {
          const project = await this.createProjectFromRepository(
            { ...repoInfo.repository, config },
            config
          );
          this.projects.set(project.id, project);
          return project;
        }
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  /**
   * Get project by repository information
   */
  async getProjectByRepository(owner: string, repo: string, branch: string = 'main'): Promise<Project | null> {
    const projectId = this.generateProjectId(owner, repo, branch);
    return this.getProject(projectId);
  }

  /**
   * Create or update project settings
   */
  async updateProjectSettings(projectId: string, settings: Partial<ProjectSettings>): Promise<Project> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    project.settings = { ...project.settings, ...settings };
    this.projects.set(projectId, project);

    return project;
  }

  /**
   * Refresh project configuration from repository
   */
  async refreshProject(projectId: string): Promise<Project> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    try {
      // Clear cache and reload configuration
      this.githubService.clearConfigCache(
        project.repository.owner,
        project.repository.name,
        project.repository.branch
      );

      const config = await this.githubService.getRepositoryConfig(
        project.repository.owner,
        project.repository.name,
        project.repository.branch
      );

      // Update project with new configuration
      const updatedProject = await this.updateProjectFromConfig(project, config);
      this.projects.set(projectId, updatedProject);

      return updatedProject;
    } catch (error) {
      throw new Error(`Failed to refresh project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate project access for user
   */
  async validateProjectAccess(projectId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project) {
      return false;
    }

    try {
      const access = await this.githubService.validateRepositoryAccess(
        project.repository.owner,
        project.repository.name
      );

      return access.hasAccess && access.permissions.write;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get translation files for a project
   */
  async getTranslationFiles(projectId: string): Promise<TranslationFile[]> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return project.translationFiles;
  }

  /**
   * Get source files for a project
   */
  async getSourceFiles(projectId: string): Promise<Array<{ path: string; format: string }>> {
    const project = await this.getProject(projectId);
    if (!project || !project.config) {
      throw new Error(`Project not found or missing configuration: ${projectId}`);
    }

    return project.config.sourceFiles.map((sf: any) => ({
      path: sf.path,
      format: sf.format
    }));
  }

  /**
   * Create project from repository information
   */
  private async createProjectFromRepository(
    repo: { id: number; name: string; full_name: string; owner: { login: string }; default_branch: string; config: TranslationConfig },
    config: TranslationConfig
  ): Promise<Project> {
    const projectId = this.generateProjectId(repo.owner.login, repo.name, repo.default_branch);

    // Create translation files from configuration
    const translationFiles: TranslationFile[] = [];
    
    for (const sourceFile of config.sourceFiles) {
      for (const language of config.targetLanguages) {
        const outputPath = this.generateOutputPath(config.outputPattern, language, sourceFile.path);
        
        translationFiles.push({
          id: `${projectId}-${language}-${sourceFile.path}`,
          sourcePath: sourceFile.path,
          outputPath,
          language,
          format: sourceFile.format,
          lastUpdated: new Date(),
          stringCount: 0, // Will be populated when strings are extracted
          translatedCount: 0
        });
      }
    }

    const project: Project = {
      id: projectId,
      name: repo.name,
      repository: {
        owner: repo.owner.login,
        name: repo.name,
        branch: repo.default_branch
      },
      sourceLanguage: config.sourceLanguage,
      targetLanguages: config.targetLanguages,
      translationFiles,
      settings: {
        submitAsPR: config.settings?.submitAsPR ?? false,
        requireReview: config.settings?.requireReview ?? false,
        autoMerge: config.settings?.autoMerge ?? false,
        commitMessageTemplate: config.settings?.commitMessageTemplate ?? 'feat(i18n): Add {language} translation for {keys}',
        prTitleTemplate: config.settings?.prTitleTemplate ?? 'feat(i18n): Update {language} translations',
        plugins: {
          enabled: config.plugins?.enabled ?? ['json-plugin', 'markdown-plugin'],
          settings: config.plugins?.settings ?? {}
        }
      },
      config
    };

    return project;
  }

  /**
   * Update project from new configuration
   */
  private async updateProjectFromConfig(project: Project, config: TranslationConfig): Promise<Project> {
    // Update basic project properties
    project.sourceLanguage = config.sourceLanguage;
    project.targetLanguages = config.targetLanguages;
    project.config = config;

    // Update settings from configuration
    if (config.settings) {
      project.settings = {
        ...project.settings,
        submitAsPR: config.settings.submitAsPR ?? project.settings.submitAsPR,
        requireReview: config.settings.requireReview ?? project.settings.requireReview,
        autoMerge: config.settings.autoMerge ?? project.settings.autoMerge,
        commitMessageTemplate: config.settings.commitMessageTemplate ?? project.settings.commitMessageTemplate,
        prTitleTemplate: config.settings.prTitleTemplate ?? project.settings.prTitleTemplate
      };
    }

    if (config.plugins) {
      project.settings.plugins = {
        enabled: config.plugins.enabled ?? project.settings.plugins.enabled,
        settings: config.plugins.settings ?? project.settings.plugins.settings
      };
    }

    // Regenerate translation files
    const translationFiles: TranslationFile[] = [];
    
    for (const sourceFile of config.sourceFiles) {
      for (const language of config.targetLanguages) {
        const outputPath = this.generateOutputPath(config.outputPattern, language, sourceFile.path);
        
        // Try to preserve existing file data
        const existingFile = project.translationFiles.find(tf => 
          tf.sourcePath === sourceFile.path && tf.language === language
        );
        
        translationFiles.push({
          id: `${project.id}-${language}-${sourceFile.path}`,
          sourcePath: sourceFile.path,
          outputPath,
          language,
          format: sourceFile.format,
          lastUpdated: existingFile?.lastUpdated ?? new Date(),
          stringCount: existingFile?.stringCount ?? 0,
          translatedCount: existingFile?.translatedCount ?? 0
        });
      }
    }

    project.translationFiles = translationFiles;
    return project;
  }

  /**
   * Generate project ID from repository information
   */
  private generateProjectId(owner: string, repo: string, branch: string): string {
    return `${owner}-${repo}-${branch}`;
  }

  /**
   * Generate output path from pattern
   */
  private generateOutputPath(pattern: string, language: string, sourceFile: string): string {
    const fileName = sourceFile.split('/').pop() || sourceFile;
    const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');
    const fileExt = fileName.split('.').pop() || '';

    return pattern
      .replace(/{lang}/g, language)
      .replace(/{language}/g, language)
      .replace(/{file}/g, fileNameWithoutExt)
      .replace(/{filename}/g, fileName)
      .replace(/{ext}/g, fileExt);
  }

  /**
   * Clear project cache
   */
  clearCache(projectId?: string): void {
    if (projectId) {
      this.projects.delete(projectId);
    } else {
      this.projects.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { projectCount: number; projectIds: string[] } {
    return {
      projectCount: this.projects.size,
      projectIds: Array.from(this.projects.keys())
    };
  }
}

/**
 * Create project service with user authentication
 */
export function createProjectService(user: User): ProjectService {
  const githubService = new GitHubRepositoryService(user.accessToken);
  return new ProjectService(githubService);
}