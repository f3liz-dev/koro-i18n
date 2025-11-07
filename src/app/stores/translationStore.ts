/**
 * Translation store using Solid.js reactive primitives
 */

import { createSignal, createEffect, createMemo } from 'solid-js';
import { TranslationString, TranslationProject, ValidationResult, TranslationProgress, AutoSaveState } from '../types/Translation';
import { TranslationService } from '../services/TranslationService';

// Translation state signals
const [project, setProject] = createSignal<TranslationProject | null>(null);
const [strings, setStrings] = createSignal<TranslationString[]>([]);
const [currentLanguage, setCurrentLanguage] = createSignal<string>('');
const [selectedStringIndex, setSelectedStringIndex] = createSignal<number>(0);
const [isLoading, setIsLoading] = createSignal<boolean>(false);
const [error, setError] = createSignal<string | null>(null);
const [progress, setProgress] = createSignal<TranslationProgress | null>(null);

// Auto-save state
const [autoSaveState, setAutoSaveState] = createSignal<AutoSaveState>({
  isDirty: false,
  lastSaved: null,
  isSaving: false,
  error: null
});

// Draft translations (key -> translated text)
const [draftTranslations, setDraftTranslations] = createSignal<Map<string, string>>(new Map());

// Validation results for current string
const [validationResult, setValidationResult] = createSignal<ValidationResult | null>(null);

// Computed values
const currentString = createMemo(() => {
  const stringsArray = strings();
  const index = selectedStringIndex();
  return stringsArray[index] || null;
});

const totalStrings = createMemo(() => strings().length);

const hasUnsavedChanges = createMemo(() => autoSaveState().isDirty);

/**
 * Translation store actions
 */
export const translationStore = {
  // State getters
  get project() { return project(); },
  get strings() { return strings(); },
  get currentLanguage() { return currentLanguage(); },
  get selectedStringIndex() { return selectedStringIndex(); },
  get currentString() { return currentString(); },
  get isLoading() { return isLoading(); },
  get error() { return error(); },
  get progress() { return progress(); },
  get autoSaveState() { return autoSaveState(); },
  get validationResult() { return validationResult(); },
  get totalStrings() { return totalStrings(); },
  get hasUnsavedChanges() { return hasUnsavedChanges(); },

  // Actions
  async loadProject(projectId: string, language: string): Promise<{ success: boolean; error?: string }> {
    setIsLoading(true);
    setError(null);

    try {
      // Load project details
      const projectResponse = await TranslationService.getProject(projectId);
      if (!projectResponse.success) {
        setError(projectResponse.error || 'Failed to load project');
        setIsLoading(false);
        return { success: false, error: projectResponse.error };
      }

      setProject(projectResponse.project!);
      setCurrentLanguage(language);

      // Load translation strings
      const stringsResponse = await TranslationService.getProjectStrings(projectId, language);
      if (!stringsResponse.success) {
        setError(stringsResponse.error || 'Failed to load strings');
        setIsLoading(false);
        return { success: false, error: stringsResponse.error };
      }

      setStrings(stringsResponse.strings || []);
      setProgress(stringsResponse.progress || null);
      setSelectedStringIndex(0);
      setIsLoading(false);

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  },

  selectString(index: number): void {
    if (index >= 0 && index < strings().length) {
      setSelectedStringIndex(index);
      this.validateCurrentTranslation();
    }
  },

  selectNextString(): void {
    const current = selectedStringIndex();
    const total = strings().length;
    if (current < total - 1) {
      this.selectString(current + 1);
    }
  },

  selectPreviousString(): void {
    const current = selectedStringIndex();
    if (current > 0) {
      this.selectString(current - 1);
    }
  },

  updateTranslation(stringKey: string, translatedText: string): void {
    const drafts = new Map(draftTranslations());
    drafts.set(stringKey, translatedText);
    setDraftTranslations(drafts);

    // Mark as dirty for auto-save
    setAutoSaveState(prev => ({
      ...prev,
      isDirty: true
    }));

    // Update validation
    this.validateCurrentTranslation();
  },

  getTranslation(stringKey: string): string {
    const drafts = draftTranslations();
    const currentStr = strings().find(s => s.key === stringKey);
    return drafts.get(stringKey) || currentStr?.translatedText || '';
  },

  validateCurrentTranslation(): void {
    const current = currentString();
    if (!current) {
      setValidationResult(null);
      return;
    }

    const translatedText = this.getTranslation(current.key);
    const result = TranslationService.validateTranslation(
      current.sourceText,
      translatedText,
      current.maxLength,
      current.placeholders
    );

    setValidationResult(result);
  },

  async submitTranslation(stringKey: string): Promise<{ success: boolean; error?: string }> {
    const proj = project();
    const lang = currentLanguage();
    const translatedText = this.getTranslation(stringKey);

    if (!proj || !lang) {
      return { success: false, error: 'Project or language not set' };
    }

    try {
      const response = await TranslationService.submitTranslation({
        projectId: proj.id,
        language: lang,
        stringKey,
        translatedText
      });

      if (response.success) {
        // Remove from drafts after successful submission
        const drafts = new Map(draftTranslations());
        drafts.delete(stringKey);
        setDraftTranslations(drafts);

        // Update the string in the list
        const updatedStrings = strings().map(s => 
          s.key === stringKey 
            ? { ...s, translatedText }
            : s
        );
        setStrings(updatedStrings);

        // Update auto-save state
        setAutoSaveState(prev => ({
          ...prev,
          isDirty: false,
          lastSaved: new Date(),
          error: null
        }));

        return { success: true };
      }

      return { success: false, error: response.error };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit translation';
      return { success: false, error: errorMessage };
    }
  },

  async saveDraft(stringKey: string): Promise<{ success: boolean; error?: string }> {
    const proj = project();
    const lang = currentLanguage();
    const translatedText = this.getTranslation(stringKey);

    if (!proj || !lang) {
      return { success: false, error: 'Project or language not set' };
    }

    setAutoSaveState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const response = await TranslationService.saveDraft(
        proj.id,
        lang,
        stringKey,
        translatedText
      );

      if (response.success) {
        setAutoSaveState(prev => ({
          ...prev,
          isDirty: false,
          lastSaved: new Date(),
          isSaving: false,
          error: null
        }));

        return { success: true };
      }

      setAutoSaveState(prev => ({
        ...prev,
        isSaving: false,
        error: response.error || 'Failed to save draft'
      }));

      return { success: false, error: response.error };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save draft';
      setAutoSaveState(prev => ({
        ...prev,
        isSaving: false,
        error: errorMessage
      }));

      return { success: false, error: errorMessage };
    }
  },

  clearError(): void {
    setError(null);
    setAutoSaveState(prev => ({ ...prev, error: null }));
  },

  reset(): void {
    setProject(null);
    setStrings([]);
    setCurrentLanguage('');
    setSelectedStringIndex(0);
    setIsLoading(false);
    setError(null);
    setProgress(null);
    setDraftTranslations(new Map());
    setValidationResult(null);
    setAutoSaveState({
      isDirty: false,
      lastSaved: null,
      isSaving: false,
      error: null
    });
  }
};

// Auto-save effect - saves drafts every 30 seconds if dirty
let autoSaveTimer: number | null = null;

createEffect(() => {
  const state = autoSaveState();
  const current = currentString();

  if (state.isDirty && current && !state.isSaving) {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new timer for 30 seconds
    autoSaveTimer = window.setTimeout(() => {
      translationStore.saveDraft(current.key);
    }, 30000);
  }

  // Cleanup timer when component unmounts or state changes
  return () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
  };
});

// Export individual signals for direct access if needed
export { 
  project, 
  strings, 
  currentLanguage, 
  selectedStringIndex, 
  currentString,
  isLoading, 
  error, 
  progress,
  autoSaveState,
  validationResult,
  draftTranslations
};