/**
 * Configuration validation schema using io-ts
 */
import * as t from 'io-ts';
import { pipe } from 'fp-ts/function';
import { fold } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';

// Source file configuration codec
export const SourceFileConfigCodec = t.type({
  path: t.string,
  format: t.union([t.literal('json'), t.literal('markdown'), t.literal('toml')]),
  keyPattern: t.union([t.string, t.undefined]),
  outputPath: t.union([t.string, t.undefined])
});

// Plugin configuration codec
export const PluginConfigCodec = t.type({
  enabled: t.array(t.string),
  settings: t.record(t.string, t.unknown)
});

// Project settings codec
export const ProjectSettingsCodec = t.type({
  submitAsPR: t.union([t.boolean, t.undefined]),
  requireReview: t.union([t.boolean, t.undefined]),
  autoMerge: t.union([t.boolean, t.undefined]),
  prTitleTemplate: t.union([t.string, t.undefined]),
  commitMessageTemplate: t.union([t.string, t.undefined])
});

// Main translation configuration codec
export const TranslationConfigCodec = t.type({
  sourceLanguage: t.string,
  targetLanguages: t.array(t.string),
  outputPattern: t.string,
  excludePatterns: t.union([t.array(t.string), t.undefined]),
  includePatterns: t.union([t.array(t.string), t.undefined]),
  sourceFiles: t.array(SourceFileConfigCodec),
  settings: t.union([ProjectSettingsCodec, t.undefined]),
  plugins: t.union([PluginConfigCodec, t.undefined])
});

// Type inference from codecs
export type SourceFileConfig = t.TypeOf<typeof SourceFileConfigCodec>;
export type PluginConfig = t.TypeOf<typeof PluginConfigCodec>;
export type ProjectSettings = t.TypeOf<typeof ProjectSettingsCodec>;
export type TranslationConfig = t.TypeOf<typeof TranslationConfigCodec>;

// Validation result types
export interface ConfigValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ConfigParseResult {
  success: boolean;
  config?: TranslationConfig;
  errors: ConfigValidationError[];
}

/**
 * Validates configuration object against the schema
 */
export function validateConfig(input: unknown): ConfigParseResult {
  return pipe(
    TranslationConfigCodec.decode(input),
    fold(
      (errors: any): ConfigParseResult => ({
        success: false,
        errors: PathReporter.report({ _tag: 'Left', left: errors }).map((msg: string) => ({
          field: 'config',
          message: msg
        }))
      }),
      (config: TranslationConfig): ConfigParseResult => ({
        success: true,
        config,
        errors: []
      })
    )
  );
}

/**
 * Creates a default configuration object
 */
export function createDefaultConfig(): TranslationConfig {
  return {
    sourceLanguage: 'en',
    targetLanguages: [],
    outputPattern: 'locales/{lang}/{namespace}.toml',
    excludePatterns: undefined,
    includePatterns: undefined,
    sourceFiles: [],
    settings: {
      submitAsPR: true,
      requireReview: true,
      autoMerge: false,
      prTitleTemplate: 'feat(i18n): update translations for {languages}',
      commitMessageTemplate: 'Update translations for {languages}'
    },
    plugins: {
      enabled: ['json-plugin', 'markdown-plugin'],
      settings: {}
    }
  };
}