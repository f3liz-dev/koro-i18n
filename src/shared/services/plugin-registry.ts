/**
 * Plugin registry for managing format plugins
 */

import {
  FormatPlugin,
  PluginMetadata,
  PluginRegistrationResult,
  PluginError,
  PluginRegistryError,
  TranslationStrings,
  ValidationResult
} from '../types/plugin.js';

/**
 * Central registry for managing format plugins
 */
export class PluginRegistry {
  private plugins = new Map<string, FormatPlugin>();
  private formatMap = new Map<string, string[]>(); // format -> plugin names

  /**
   * Register a new format plugin
   * @param plugin Plugin instance to register
   * @returns Registration result
   */
  register(plugin: FormatPlugin): PluginRegistrationResult {
    try {
      // Validate plugin interface
      this.validatePlugin(plugin);

      // Check for name conflicts
      if (this.plugins.has(plugin.name)) {
        return {
          success: false,
          error: `Plugin with name '${plugin.name}' is already registered`
        };
      }

      // Check for format conflicts
      const conflictingFormats = plugin.supportedFormats.filter(format => {
        const existingPlugins = this.formatMap.get(format) || [];
        return existingPlugins.length > 0;
      });

      if (conflictingFormats.length > 0) {
        return {
          success: false,
          error: `Format conflicts detected: ${conflictingFormats.join(', ')} already handled by other plugins`
        };
      }

      // Register plugin
      this.plugins.set(plugin.name, plugin);

      // Update format mapping
      plugin.supportedFormats.forEach(format => {
        const plugins = this.formatMap.get(format) || [];
        plugins.push(plugin.name);
        this.formatMap.set(format, plugins);
      });

      return {
        success: true,
        metadata: {
          name: plugin.name,
          version: plugin.version,
          supportedFormats: [...plugin.supportedFormats]
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown registration error'
      };
    }
  }

  /**
   * Unregister a plugin by name
   * @param pluginName Name of plugin to unregister
   * @returns True if plugin was found and removed
   */
  unregister(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return false;
    }

    // Remove from plugins map
    this.plugins.delete(pluginName);

    // Remove from format mapping
    plugin.supportedFormats.forEach(format => {
      const plugins = this.formatMap.get(format) || [];
      const filtered = plugins.filter(name => name !== pluginName);
      if (filtered.length === 0) {
        this.formatMap.delete(format);
      } else {
        this.formatMap.set(format, filtered);
      }
    });

    return true;
  }

  /**
   * Get plugin by name
   * @param pluginName Name of plugin to retrieve
   * @returns Plugin instance or undefined
   */
  getPlugin(pluginName: string): FormatPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get plugin for a specific format
   * @param format File format (e.g., 'json', 'markdown')
   * @returns Plugin instance or undefined
   */
  getPluginForFormat(format: string): FormatPlugin | undefined {
    const pluginNames = this.formatMap.get(format);
    if (!pluginNames || pluginNames.length === 0) {
      return undefined;
    }

    // Return first available plugin for format
    return this.plugins.get(pluginNames[0]);
  }

  /**
   * Get all registered plugins
   * @returns Array of plugin metadata
   */
  listPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      supportedFormats: [...plugin.supportedFormats]
    }));
  }

  /**
   * Get all supported formats
   * @returns Array of supported format strings
   */
  getSupportedFormats(): string[] {
    return Array.from(this.formatMap.keys());
  }

  /**
   * Check if a format is supported
   * @param format Format to check
   * @returns True if format is supported
   */
  isFormatSupported(format: string): boolean {
    return this.formatMap.has(format);
  }

  /**
   * Parse content using appropriate plugin with error isolation
   * @param content Content to parse
   * @param format File format
   * @returns Parsed translation strings
   * @throws PluginRegistryError if no plugin available or parsing fails
   */
  parse(content: string, format: string): TranslationStrings {
    const plugin = this.getPluginForFormat(format);
    if (!plugin) {
      throw new PluginRegistryError(`No plugin available for format: ${format}`);
    }

    try {
      return plugin.parse(content);
    } catch (error) {
      if (error instanceof PluginError) {
        throw new PluginRegistryError(`Plugin parsing failed: ${error.message}`, error);
      }
      throw new PluginRegistryError(
        `Unexpected error during parsing with plugin ${plugin.name}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Generate content using appropriate plugin with error isolation
   * @param strings Translation strings to generate
   * @param format Target format
   * @returns Generated content
   * @throws PluginRegistryError if no plugin available or generation fails
   */
  generate(strings: TranslationStrings, format: string): string {
    const plugin = this.getPluginForFormat(format);
    if (!plugin) {
      throw new PluginRegistryError(`No plugin available for format: ${format}`);
    }

    try {
      return plugin.generate(strings);
    } catch (error) {
      if (error instanceof PluginError) {
        throw new PluginRegistryError(`Plugin generation failed: ${error.message}`, error);
      }
      throw new PluginRegistryError(
        `Unexpected error during generation with plugin ${plugin.name}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Validate content using appropriate plugin with error isolation
   * @param content Content to validate
   * @param format File format
   * @returns Validation result
   * @throws PluginRegistryError if no plugin available
   */
  validate(content: string, format: string): ValidationResult {
    const plugin = this.getPluginForFormat(format);
    if (!plugin) {
      throw new PluginRegistryError(`No plugin available for format: ${format}`);
    }

    try {
      return plugin.validate(content);
    } catch (error) {
      // If validation itself fails, return invalid result
      return {
        isValid: false,
        errors: [{
          message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        warnings: []
      };
    }
  }

  /**
   * Clear all registered plugins
   */
  clear(): void {
    this.plugins.clear();
    this.formatMap.clear();
  }

  /**
   * Validate plugin interface compliance
   * @param plugin Plugin to validate
   * @throws PluginRegistryError if plugin is invalid
   */
  private validatePlugin(plugin: FormatPlugin): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new PluginRegistryError('Plugin must have a valid name');
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new PluginRegistryError('Plugin must have a valid version');
    }

    if (!Array.isArray(plugin.supportedFormats) || plugin.supportedFormats.length === 0) {
      throw new PluginRegistryError('Plugin must support at least one format');
    }

    if (typeof plugin.parse !== 'function') {
      throw new PluginRegistryError('Plugin must implement parse method');
    }

    if (typeof plugin.generate !== 'function') {
      throw new PluginRegistryError('Plugin must implement generate method');
    }

    if (typeof plugin.validate !== 'function') {
      throw new PluginRegistryError('Plugin must implement validate method');
    }
  }
}

/**
 * Global plugin registry instance
 */
export const pluginRegistry = new PluginRegistry();