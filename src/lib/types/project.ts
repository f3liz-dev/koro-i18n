/**
 * Project types for the I18n Platform
 */

import { TranslationConfig } from '../validation/config-schema.js';

export interface Project {
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
  config?: TranslationConfig;
}

export interface ProjectSettings {
  submitAsPR: boolean;
  requireReview: boolean;
  autoMerge: boolean;
  commitMessageTemplate: string;
  prTitleTemplate: string;
  plugins: PluginConfig;
}

export interface PluginConfig {
  enabled: string[];
  settings: Record<string, any>;
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