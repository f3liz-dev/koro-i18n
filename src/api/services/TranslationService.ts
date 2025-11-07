/**
 * Translation service with plugin-based format support
 */

import { pluginRegistry } from '@/lib/services/plugin-registry.js';
import { TranslationStrings, PluginRegistryError } from '@/lib/types/plugin.js';
import { Translation, TranslationProgress, TranslationSubmission, TranslationValidationResult } from '@/lib/types/Translation.js';
import { Project } from '@/lib/types/Project.js';
import { GitHubRepositoryService } from './GitHubService.js';

export class TranslationService {
  private translations = new Map<string, Translation>();
  private translationProgress = new Map<string, TranslationProgress>();
  private autoSaveIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private githubService: GitHubRepositoryService
  ) {}

  /**
   * Extract translation strings from source files using format plugins
   * @param project Project configuration
   * @param sourceFilePath Path to source file
   * @returns Extracted translation strings
   */
  async extractTranslationStrings(project: Project, sourceFilePath: string): Promise<TranslationStrings> {
    try {
      // Get file content from repository
      const fileContent = await this.githubService.readFile(
        project.repository.owner,
        project.repository.name,
        sourceFilePath,
        project.repository.branch
      );

      // Decode base64 content if needed
      const content = fileContent.encoding === 'base64' 
        ? atob(fileContent.content) 
        : fileContent.content;

      // Determine format from file extension or configuration
      const format = this.detectFormat(sourceFilePath, project);
      
      // Use plugin to parse content
      return pluginRegistry.parse(content, format);
    } catch (error) {
      if (error instanceof PluginRegistryError) {
        throw new Error(`Failed to extract translation strings: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate translation content using format plugins
   * @param content Content to validate
   * @param format File format
   * @returns Validation result
   */
  validateTranslation(content: string, format: string): TranslationValidationResult {
    try {
      const result = pluginRegistry.validate(content, format);
      return {
        isValid: result.isValid,
        errors: result.errors.map(e => e.message),
        warnings: result.warnings.map(w => w.message)
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * Generate output content from translation strings using format plugins
   * @param strings Translation strings
   * @param format Target format
   * @returns Generated content
   */
  generateTranslationFile(strings: TranslationStrings, format: string): string {
    try {
      return pluginRegistry.generate(strings, format);
    } catch (error) {
      if (error instanceof PluginRegistryError) {
        throw new Error(`Failed to generate translation file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Submit a translation with plugin-based validation
   * @param submission Translation submission
   * @param project Project configuration
   * @returns Created translation
   */
  async submitTranslation(submission: TranslationSubmission, project: Project): Promise<Translation> {
    // Create translation record
    const translation: Translation = {
      id: this.generateId(),
      projectId: submission.projectId,
      stringKey: submission.stringKey,
      sourceText: await this.getSourceText(project, submission.stringKey),
      translatedText: submission.translatedText,
      language: submission.language,
      status: 'draft',
      contributor: {
        userId: 'current-user', // TODO: Get from auth context
        username: 'current-username' // TODO: Get from auth context
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    // Validate translation using appropriate format plugin
    const format = this.getFormatForProject(project, submission.stringKey);
    const validationResult = this.validateTranslation(submission.translatedText, format);
    
    if (!validationResult.isValid) {
      translation.status = 'failed';
      // Store validation errors in metadata (simplified for now)
    }

    // Store translation
    this.translations.set(translation.id, translation);

    // Update progress tracking
    this.updateTranslationProgress(project.id, submission.language);

    // Start auto-save if not already running
    this.startAutoSave(translation.id);

    return translation;
  }

  /**
   * Get translation progress for a project and language
   * @param projectId Project ID
   * @param language Target language
   * @returns Translation progress
   */
  getTranslationProgress(projectId: string, language: string): TranslationProgress | undefined {
    const key = `${projectId}-${language}`;
    return this.translationProgress.get(key);
  }

  /**
   * Get translations by project and language
   * @param projectId Project ID
   * @param language Target language
   * @returns Array of translations
   */
  getTranslations(projectId: string, language?: string): Translation[] {
    return Array.from(this.translations.values()).filter(t => {
      if (t.projectId !== projectId) return false;
      if (language && t.language !== language) return false;
      return true;
    });
  }

  /**
   * Update translation status
   * @param translationId Translation ID
   * @param status New status
   * @param commitSha Optional commit SHA for committed translations
   */
  updateTranslationStatus(translationId: string, status: Translation['status'], commitSha?: string): void {
    const translation = this.translations.get(translationId);
    if (!translation) {
      throw new Error(`Translation not found: ${translationId}`);
    }

    translation.status = status;
    translation.metadata.updatedAt = new Date();
    
    if (commitSha) {
      translation.metadata.commitSha = commitSha;
    }

    this.translations.set(translationId, translation);

    // Update progress tracking
    this.updateTranslationProgress(translation.projectId, translation.language);
  }

  /**
   * Get supported formats from plugin registry
   * @returns Array of supported format strings
   */
  getSupportedFormats(): string[] {
    return pluginRegistry.getSupportedFormats();
  }

  /**
   * Check if a format is supported
   * @param format Format to check
   * @returns True if format is supported
   */
  isFormatSupported(format: string): boolean {
    return pluginRegistry.isFormatSupported(format);
  }

  /**
   * Detect file format from path and project configuration
   * @param filePath File path
   * @param project Project configuration
   * @returns Detected format
   */
  private detectFormat(filePath: string, project: Project): string {
    // Check if specific format is configured for this file
    const sourceFile = project.config?.sourceFiles?.find(sf => sf.path === filePath);
    if (sourceFile?.format) {
      return sourceFile.format;
    }

    // Fallback to file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'json':
        return 'json';
      case 'md':
      case 'markdown':
        return 'markdown';
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  /**
   * Get format for a specific string key in a project
   * @param _project Project configuration
   * @param _stringKey String key
   * @returns Format string
   */
  private getFormatForProject(_project: Project, _stringKey: string): string {
    // For now, default to JSON format
    // TODO: Implement logic to determine format based on string key and project config
    return 'json';
  }

  /**
   * Get source text for a translation key
   * @param _project Project configuration
   * @param stringKey String key
   * @returns Source text
   */
  private async getSourceText(_project: Project, stringKey: string): Promise<string> {
    // TODO: Implement logic to extract source text from project files
    return `Source text for ${stringKey}`;
  }

  /**
   * Update translation progress tracking
   * @param projectId Project ID
   * @param language Target language
   */
  private updateTranslationProgress(projectId: string, language: string): void {
    const key = `${projectId}-${language}`;
    const translations = this.getTranslations(projectId, language);
    
    const progress: TranslationProgress = {
      projectId,
      language,
      totalStrings: translations.length,
      translatedStrings: translations.filter(t => t.status === 'committed').length,
      draftStrings: translations.filter(t => t.status === 'draft').length,
      submittedStrings: translations.filter(t => t.status === 'submitted').length,
      committedStrings: translations.filter(t => t.status === 'committed').length,
      failedStrings: translations.filter(t => t.status === 'failed').length,
      lastUpdated: new Date()
    };

    this.translationProgress.set(key, progress);
  }

  /**
   * Start auto-save for a translation (30-second intervals)
   * @param translationId Translation ID
   */
  private startAutoSave(translationId: string): void {
    if (this.autoSaveIntervals.has(translationId)) {
      return; // Already running
    }

    const interval = setInterval(() => {
      const translation = this.translations.get(translationId);
      if (!translation || translation.status !== 'draft') {
        // Stop auto-save if translation is no longer draft
        this.stopAutoSave(translationId);
        return;
      }

      // Update timestamp to indicate auto-save
      translation.metadata.updatedAt = new Date();
      this.translations.set(translationId, translation);
    }, 30000); // 30 seconds

    this.autoSaveIntervals.set(translationId, interval);
  }

  /**
   * Stop auto-save for a translation
   * @param translationId Translation ID
   */
  private stopAutoSave(translationId: string): void {
    const interval = this.autoSaveIntervals.get(translationId);
    if (interval) {
      clearInterval(interval);
      this.autoSaveIntervals.delete(translationId);
    }
  }

  /**
   * Generate unique ID for translations
   * @returns Unique ID string
   */
  private generateId(): string {
    return `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all auto-save intervals
    for (const interval of Array.from(this.autoSaveIntervals.values())) {
      clearInterval(interval);
    }
    this.autoSaveIntervals.clear();
  }
}