/**
 * TOML Configuration Parser and Validator
 */
import * as TOML from 'toml';
import { validateConfig, createDefaultConfig } from '../validation/config-schema.js';
import type { ConfigParseResult, TranslationConfig, ConfigValidationError } from '../types/config.js';

export class ConfigParseError extends Error {
  constructor(
    message: string,
    public readonly errors: ConfigValidationError[]
  ) {
    super(message);
    this.name = 'ConfigParseError';
  }
}

/**
 * Parses TOML configuration string and validates it
 */
export function parseTomlConfig(tomlContent: string): ConfigParseResult {
  try {
    // Parse TOML content
    const parsed = TOML.parse(tomlContent);
    
    // Validate against schema
    const validationResult = validateConfig(parsed);
    
    if (!validationResult.success) {
      return {
        success: false,
        errors: validationResult.errors.map(error => ({
          field: error.field,
          message: `Configuration validation failed: ${error.message}`,
          value: error.value
        }))
      };
    }

    return validationResult;
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'toml',
        message: `TOML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: tomlContent
      }]
    };
  }
}

/**
 * Validates required fields are present and have valid values
 */
export function validateRequiredFields(config: TranslationConfig): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  // Validate source language
  if (!config.sourceLanguage || config.sourceLanguage.trim() === '') {
    errors.push({
      field: 'sourceLanguage',
      message: 'Source language is required and cannot be empty',
      value: config.sourceLanguage
    });
  }

  // Validate target languages
  if (!config.targetLanguages || config.targetLanguages.length === 0) {
    errors.push({
      field: 'targetLanguages',
      message: 'At least one target language is required',
      value: config.targetLanguages
    });
  }

  // Check for duplicate languages
  const allLanguages = [config.sourceLanguage, ...config.targetLanguages];
  const uniqueLanguages = new Set(allLanguages);
  if (uniqueLanguages.size !== allLanguages.length) {
    errors.push({
      field: 'targetLanguages',
      message: 'Source language cannot be included in target languages',
      value: config.targetLanguages
    });
  }

  // Validate output pattern
  if (!config.outputPattern || config.outputPattern.trim() === '') {
    errors.push({
      field: 'outputPattern',
      message: 'Output pattern is required and cannot be empty',
      value: config.outputPattern
    });
  }

  // Validate output pattern contains required placeholders
  if (config.outputPattern && !config.outputPattern.includes('{lang}')) {
    errors.push({
      field: 'outputPattern',
      message: 'Output pattern must contain {lang} placeholder',
      value: config.outputPattern
    });
  }

  // Validate source files
  if (!config.sourceFiles || config.sourceFiles.length === 0) {
    errors.push({
      field: 'sourceFiles',
      message: 'At least one source file is required',
      value: config.sourceFiles
    });
  }

  // Validate each source file
  config.sourceFiles?.forEach((sourceFile: any, index: number) => {
    if (!sourceFile.path || sourceFile.path.trim() === '') {
      errors.push({
        field: `sourceFiles[${index}].path`,
        message: 'Source file path is required and cannot be empty',
        value: sourceFile.path
      });
    }

    if (sourceFile.format !== 'toml') {
      errors.push({
        field: `sourceFiles[${index}].format`,
        message: 'Source file format must be "toml"',
        value: sourceFile.format
      });
    }
  });

  return errors;
}

/**
 * Parses and validates TOML configuration with comprehensive validation
 */
export function parseAndValidateConfig(tomlContent: string): ConfigParseResult {
  const parseResult = parseTomlConfig(tomlContent);
  
  if (!parseResult.success || !parseResult.config) {
    return parseResult;
  }

  // Additional validation for required fields
  const fieldErrors = validateRequiredFields(parseResult.config);
  
  if (fieldErrors.length > 0) {
    return {
      success: false,
      errors: [...parseResult.errors, ...fieldErrors]
    };
  }

  return parseResult;
}

/**
 * Merges user configuration with default values
 */
export function mergeWithDefaults(userConfig: Partial<TranslationConfig>): TranslationConfig {
  const defaultConfig = createDefaultConfig();
  
  return {
    ...defaultConfig,
    ...userConfig,
    settings: userConfig.settings ? {
      ...defaultConfig.settings,
      ...userConfig.settings
    } : defaultConfig.settings,
    plugins: userConfig.plugins ? {
      ...defaultConfig.plugins,
      ...userConfig.plugins
    } : defaultConfig.plugins
  };
}

/**
 * Generates a sample TOML configuration
 */
export function generateSampleConfig(): string {
  return `# I18n Platform Configuration
sourceLanguage = "en"
targetLanguages = ["es", "fr", "de"]
outputPattern = "locales/{lang}/{namespace}.toml"

[[sourceFiles]]
path = "src/locales/en/common.toml"
format = "toml"
keyPattern = "**"

[[sourceFiles]]
path = "src/locales/en/ui.toml"
format = "toml"
outputPath = "locales/{lang}/interface.toml"

[settings]
submitAsPR = true
requireReview = true
autoMerge = false
prTitleTemplate = "feat(i18n): update translations for {languages}"
commitMessageTemplate = "Update translations for {languages}"
`;
}