/**
 * Translation types for the I18n Platform
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

export interface TranslationProgress {
  projectId: string;
  language: string;
  totalStrings: number;
  translatedStrings: number;
  draftStrings: number;
  submittedStrings: number;
  committedStrings: number;
  failedStrings: number;
  lastUpdated: Date;
}

export interface TranslationSubmission {
  projectId: string;
  stringKey: string;
  translatedText: string;
  language: string;
}

export interface TranslationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

