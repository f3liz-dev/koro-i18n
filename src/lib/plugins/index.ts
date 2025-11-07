/**
 * Built-in format plugins for the I18n Platform
 */

export { JsonPlugin, jsonPlugin } from './json-plugin.js';
export { MarkdownPlugin, markdownPlugin } from './markdown-plugin.js';

// Re-export plugin types for convenience
export type {
  FormatPlugin,
  TranslationStrings,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  PluginError,
  PluginRegistryError
} from '../types/plugin.js';

export { PluginRegistry, pluginRegistry } from '../services/plugin-registry.js';