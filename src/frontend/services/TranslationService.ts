/**
 * Translation service for handling translation-related API calls
 */

import { TranslationString, TranslationProject, ValidationResult, ValidationError, ValidationWarning, TranslationProgress } from '../types/Translation';

export interface TranslationResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ProjectStringsResponse {
  success: boolean;
  strings?: TranslationString[];
  progress?: TranslationProgress;
  error?: string;
}

export interface SubmitTranslationRequest {
  projectId: string;
  language: string;
  stringKey: string;
  translatedText: string;
}

export class TranslationService {
  private static readonly API_BASE = '/api';

  /**
   * Get project details
   */
  static async getProject(projectId: string): Promise<{ success: boolean; project?: TranslationProject; error?: string }> {
    try {
      const response = await fetch(`${this.API_BASE}/projects/${projectId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, project: data.project };
    } catch (error) {
      console.error('Failed to fetch project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch project'
      };
    }
  }

  /**
   * Get translation strings for a project and language
   */
  static async getProjectStrings(
    projectId: string, 
    language: string
  ): Promise<ProjectStringsResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/projects/${projectId}/strings?language=${language}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch strings: ${response.statusText}`);
      }

      const data = await response.json();
      return { 
        success: true, 
        strings: data.strings,
        progress: data.progress
      };
    } catch (error) {
      console.error('Failed to fetch project strings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch strings'
      };
    }
  }

  /**
   * Submit a translation
   */
  static async submitTranslation(request: SubmitTranslationRequest): Promise<TranslationResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/translations`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit translation: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Failed to submit translation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit translation'
      };
    }
  }

  /**
   * Save translation draft (auto-save)
   */
  static async saveDraft(
    projectId: string,
    language: string,
    stringKey: string,
    translatedText: string
  ): Promise<TranslationResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/translations/draft`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          language,
          stringKey,
          translatedText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save draft: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Failed to save draft:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save draft'
      };
    }
  }

  /**
   * Validate translation text
   */
  static validateTranslation(
    sourceText: string,
    translatedText: string,
    maxLength?: number,
    placeholders?: string[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if translation is empty
    if (!translatedText.trim()) {
      errors.push({
        message: 'Translation cannot be empty',
        field: 'translatedText',
        code: 'EMPTY_TRANSLATION'
      });
    }

    // Check length constraints
    if (maxLength && translatedText.length > maxLength) {
      errors.push({
        message: `Translation exceeds maximum length of ${maxLength} characters`,
        field: 'translatedText',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    }

    // Check for placeholders
    if (placeholders && placeholders.length > 0) {
      for (const placeholder of placeholders) {
        if (sourceText.includes(placeholder) && !translatedText.includes(placeholder)) {
          warnings.push({
            message: `Missing placeholder: ${placeholder}`,
            field: 'translatedText',
            code: 'MISSING_PLACEHOLDER'
          });
        }
      }
    }

    // Check for common formatting issues
    if (sourceText.endsWith('.') && !translatedText.endsWith('.')) {
      warnings.push({
        message: 'Source text ends with period, but translation does not',
        field: 'translatedText',
        code: 'PUNCTUATION_MISMATCH'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get translation progress for a project
   */
  static async getTranslationProgress(
    projectId: string,
    language: string
  ): Promise<{ success: boolean; progress?: TranslationProgress; error?: string }> {
    try {
      const response = await fetch(`${this.API_BASE}/projects/${projectId}/progress?language=${language}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, progress: data.progress };
    } catch (error) {
      console.error('Failed to fetch translation progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch progress'
      };
    }
  }
}