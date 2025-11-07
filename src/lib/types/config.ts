/**
 * Configuration types for the I18n Platform
 * Re-exports from validation schema
 */

export type {
  SourceFileConfig,
  ProjectSettings,
  TranslationConfig,
  ConfigValidationError,
  ConfigParseResult
} from '../validation/config-schema.js';

// Re-export auth types
export * from './auth.js';