/**
 * Integration tests for the plugin system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { pluginRegistry } from '@/lib/plugins/index.js';
import { loadBuiltinPlugins } from '@/lib/services/plugin-loader.js';

describe('Plugin System Integration', () => {
  beforeEach(() => {
    pluginRegistry.clear();
  });

  it('should load and use built-in plugins', () => {
    // Load built-in plugins
    const results = loadBuiltinPlugins();
    
    // Verify all plugins loaded successfully
    expect(results.every(r => r.success)).toBe(true);
    
    // Verify supported formats
    const formats = pluginRegistry.getSupportedFormats();
    expect(formats).toContain('json');
    expect(formats).toContain('markdown');
    expect(formats).toContain('md');
  });

  it('should handle JSON workflow end-to-end', () => {
    loadBuiltinPlugins();
    
    const jsonContent = '{"ui": {"button": {"save": "Save", "cancel": "Cancel"}}}';
    
    // Parse JSON
    const parsed = pluginRegistry.parse(jsonContent, 'json');
    expect(parsed).toEqual({
      ui: {
        button: {
          save: 'Save',
          cancel: 'Cancel'
        }
      }
    });
    
    // Generate JSON
    const generated = pluginRegistry.generate(parsed, 'json');
    expect(generated).toContain('"save": "Save"');
    expect(generated).toContain('"cancel": "Cancel"');
    
    // Validate JSON
    const validation = pluginRegistry.validate(jsonContent, 'json');
    expect(validation.isValid).toBe(true);
  });

  it('should handle Markdown workflow end-to-end', () => {
    loadBuiltinPlugins();
    
    const markdownContent = `
# UI
## Buttons
- save: Save
- cancel: Cancel
    `.trim();
    
    // Parse Markdown
    const parsed = pluginRegistry.parse(markdownContent, 'markdown');
    expect(parsed.ui).toBeDefined();
    
    // Generate Markdown
    const generated = pluginRegistry.generate(parsed, 'markdown');
    expect(generated).toContain('save: Save');
    expect(generated).toContain('cancel: Cancel');
    
    // Validate Markdown
    const validation = pluginRegistry.validate(markdownContent, 'markdown');
    expect(validation.isValid).toBe(true);
  });

  it('should handle format conversion between JSON and Markdown', () => {
    loadBuiltinPlugins();
    
    // Start with JSON
    const jsonContent = '{"greeting": "Hello", "farewell": "Goodbye"}';
    const parsed = pluginRegistry.parse(jsonContent, 'json');
    
    // Convert to Markdown
    const markdownGenerated = pluginRegistry.generate(parsed, 'markdown');
    expect(markdownGenerated).toContain('greeting: Hello');
    expect(markdownGenerated).toContain('farewell: Goodbye');
    
    // Parse the generated Markdown back
    const reparsed = pluginRegistry.parse(markdownGenerated, 'markdown');
    expect(reparsed).toEqual(parsed);
  });
});