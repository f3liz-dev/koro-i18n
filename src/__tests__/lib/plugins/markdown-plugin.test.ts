/**
 * Tests for Markdown format plugin
 */

import { describe, it, expect } from 'vitest';
import { MarkdownPlugin } from '@/lib/plugins/markdown-plugin.js';
import { PluginError } from '@/lib/types/plugin.js';

describe('MarkdownPlugin', () => {
  const plugin = new MarkdownPlugin();

  describe('metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(plugin.name).toBe('markdown-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.supportedFormats).toEqual(['markdown', 'md']);
    });
  });

  describe('parse', () => {
    it('should parse simple key-value pairs', () => {
      const content = `
- hello: world
- foo: bar
      `.trim();
      
      const result = plugin.parse(content);
      expect(result).toEqual({
        hello: 'world',
        foo: 'bar'
      });
    });

    it('should parse nested structure with headers', () => {
      const content = `
# UI Translations

## Buttons
- save: Save
- cancel: Cancel

## Messages
- success: Operation completed
- error: Something went wrong
      `.trim();
      
      const result = plugin.parse(content);
      expect(result).toEqual({
        ui_translations: {
          buttons: {
            save: 'Save',
            cancel: 'Cancel'
          },
          messages: {
            success: 'Operation completed',
            error: 'Something went wrong'
          }
        }
      });
    });

    it('should handle dot notation keys', () => {
      const content = `
- ui.button.save: Save
- ui.button.cancel: Cancel
- messages.error: Error occurred
      `.trim();
      
      const result = plugin.parse(content);
      expect(result).toEqual({
        ui: {
          button: {
            save: 'Save',
            cancel: 'Cancel'
          }
        },
        messages: {
          error: 'Error occurred'
        }
      });
    });

    it('should handle empty content', () => {
      const result = plugin.parse('');
      expect(result).toEqual({});
    });

    it('should handle mixed list markers', () => {
      const content = `
- hello: world
* foo: bar
      `.trim();
      
      const result = plugin.parse(content);
      expect(result).toEqual({
        hello: 'world',
        foo: 'bar'
      });
    });

    it('should skip comments and empty lines', () => {
      const content = `
<!-- This is a comment -->

- hello: world

<!-- Another comment -->
- foo: bar
      `.trim();
      
      const result = plugin.parse(content);
      expect(result).toEqual({
        hello: 'world',
        foo: 'bar'
      });
    });
  });

  describe('generate', () => {
    it('should generate simple key-value pairs', () => {
      const strings = {
        hello: 'world',
        foo: 'bar'
      };
      
      const result = plugin.generate(strings);
      expect(result).toBe('- hello: world\n- foo: bar');
    });

    it('should generate nested structure with headers', () => {
      const strings = {
        ui: {
          buttons: {
            save: 'Save',
            cancel: 'Cancel'
          }
        }
      };
      
      const result = plugin.generate(strings);
      const lines = result.split('\n');
      
      expect(lines).toContain('# Ui');
      expect(lines).toContain('## Buttons');
      expect(lines).toContain('- save: Save');
      expect(lines).toContain('- cancel: Cancel');
    });

    it('should handle empty object', () => {
      const result = plugin.generate({});
      expect(result).toBe('');
    });
  });

  describe('validate', () => {
    it('should validate correct markdown', () => {
      const content = `
# Section
- key: value
      `.trim();
      
      const result = plugin.validate(content);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid key-value format', () => {
      const content = `
- invalid format without colon
      `.trim();
      
      const result = plugin.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid key-value format');
    });

    it('should detect empty keys', () => {
      const content = `
- : value without key
      `.trim();
      
      const result = plugin.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Empty key');
    });

    it('should warn about empty values', () => {
      const content = `
- key:
      `.trim();
      
      const result = plugin.validate(content);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Empty value');
    });

    it('should warn about empty content', () => {
      const result = plugin.validate('');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Empty Markdown content');
    });

    it('should detect invalid header format', () => {
      const content = `
#Invalid header without space
      `.trim();
      
      const result = plugin.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid header format');
    });

    it('should warn about unrecognized content', () => {
      const content = `
# Valid Header
- valid: key-value
Some unrecognized text
      `.trim();
      
      const result = plugin.validate(content);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Unrecognized content'))).toBe(true);
    });
  });
});