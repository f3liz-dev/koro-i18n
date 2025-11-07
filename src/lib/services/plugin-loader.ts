/**
 * Plugin loader utility for registering built-in plugins
 */

import { pluginRegistry } from './plugin-registry.js';
import { jsonPlugin } from '../plugins/json-plugin.js';
import { markdownPlugin } from '../plugins/markdown-plugin.js';

/**
 * Load and register all built-in format plugins
 * @returns Array of registration results
 */
export function loadBuiltinPlugins() {
  const results = [];

  // Register JSON plugin
  const jsonResult = pluginRegistry.register(jsonPlugin);
  results.push({
    plugin: 'json-plugin',
    ...jsonResult
  });

  // Register Markdown plugin
  const markdownResult = pluginRegistry.register(markdownPlugin);
  results.push({
    plugin: 'markdown-plugin',
    ...markdownResult
  });

  return results;
}

/**
 * Initialize plugin system with built-in plugins
 * @returns Promise that resolves when plugins are loaded
 */
export async function initializePlugins(): Promise<void> {
  const results = loadBuiltinPlugins();
  
  // Log registration results
  for (const result of results) {
    if (result.success) {
      console.log(`✓ Registered plugin: ${result.plugin}`);
    } else {
      console.error(`✗ Failed to register plugin ${result.plugin}: ${result.error}`);
    }
  }

  // Verify essential plugins are available
  const supportedFormats = pluginRegistry.getSupportedFormats();
  if (!supportedFormats.includes('json')) {
    throw new Error('JSON plugin failed to register - this is required for basic functionality');
  }

  console.log(`Plugin system initialized with formats: ${supportedFormats.join(', ')}`);
}