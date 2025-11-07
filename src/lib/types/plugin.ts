/**
 * Plugin system types for the I18n Platform
 */

/**
 * Translation strings structure supporting nested keys
 */
export interface TranslationStrings {
  [key: string]: string | TranslationStrings;
}

/**
 * Validation error details
 */
export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  key?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  message: string;
  line?: number;
  column?: number;
  key?: string;
}

/**
 * Result of validation operation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Core plugin interface that all format plugins must implement
 */
export interface FormatPlugin {
  /** Unique plugin name */
  name: string;
  
  /** Plugin version */
  version: string;
  
  /** List of supported file formats (e.g., ['json', 'markdown']) */
  supportedFormats: string[];
  
  /**
   * Parse content from source format into translation strings
   * @param content Raw file content
   * @returns Parsed translation strings
   * @throws PluginError if parsing fails
   */
  parse(content: string): TranslationStrings;
  
  /**
   * Generate output content from translation strings
   * @param strings Translation strings to generate
   * @returns Generated content in target format
   * @throws PluginError if generation fails
   */
  generate(strings: TranslationStrings): string;
  
  /**
   * Validate content format and structure
   * @param content Content to validate
   * @returns Validation result with errors and warnings
   */
  validate(content: string): ValidationResult;
}

/**
 * Plugin metadata for registration
 */
export interface PluginMetadata {
  name: string;
  version: string;
  supportedFormats: string[];
  description?: string;
  author?: string;
}

/**
 * Plugin registration result
 */
export interface PluginRegistrationResult {
  success: boolean;
  error?: string;
  metadata?: PluginMetadata;
}

/**
 * Plugin-specific error class
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly pluginName: string,
    public readonly operation: 'parse' | 'generate' | 'validate',
    public readonly cause?: Error
  ) {
    super(`Plugin ${pluginName} ${operation} error: ${message}`);
    this.name = 'PluginError';
  }
}

/**
 * Plugin registry error class
 */
export class PluginRegistryError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'PluginRegistryError';
  }
}