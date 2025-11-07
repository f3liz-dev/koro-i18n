/**
 * Frontend translation types
 */

export interface Translation {
  id: string;
  projectId: string;
  stringKey: string;
  sourceText: string;
  translatedText: string;
  language: string;
  status: 'draft' | 'submitted' | 'committed' | 'failed';
  contributor: {
    userId: string;
    username: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    commitSha?: string;
    reviewStatus?: 'pending' | 'approved' | 'rejected';
  };
}

export interface TranslationString {
  key: string;
  sourceText: string;
  translatedText?: string;
  context?: string;
  maxLength?: number;
  isRequired?: boolean;
  placeholders?: string[];
}

export interface TranslationProject {
  id: string;
  name: string;
  repository: {
    owner: string;
    name: string;
    branch: string;
  };
  sourceLanguage: string;
  targetLanguages: string[];
  translationFiles: TranslationFile[];
  settings: ProjectSettings;
}

export interface TranslationFile {
  id: string;
  sourcePath: string;
  outputPath: string;
  language: string;
  format: string;
  lastUpdated: Date;
  stringCount: number;
  translatedCount: number;
}

export interface ProjectSettings {
  submitAsPR: boolean;
  requireReview: boolean;
  autoMerge: boolean;
  commitMessageTemplate: string;
  prTitleTemplate: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  message: string;
  field?: string;
  code?: string;
}

export interface ValidationWarning {
  message: string;
  field?: string;
  code?: string;
}

export interface TranslationProgress {
  totalStrings: number;
  translatedStrings: number;
  draftStrings: number;
  percentage: number;
}

export interface AutoSaveState {
  isDirty: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  error: string | null;
}