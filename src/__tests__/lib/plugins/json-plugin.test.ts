/**
 * Tests for JSON format plugin
 */

import { describe, it, expect } from 'vitest';
import { JsonPlugin } from '@/lib/plugins/json-plugin.js';
import { PluginError } from '@/lib/types/plugin.js';

describe('JsonPlugin', () => {
  const plugin = new JsonPlugin();

  describe('metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(plugin.name).toBe('json-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.supportedFormats).toEqual(['json']);
    });
  });

  describe('parse', () => {
    it('should parse simple JSON object', () => {
      const content = '{"hello": "world", "foo": "bar"}';
      const result = plugin.parse(content);
      
      expect(result).toEqual({
        hello: 'world',
        foo: 'bar'
      });
    });

    it('should parse nested JSON object', () => {
      const content = '{"ui": {"buttons": {"save": "Save", "cancel": "Cancel"}}}';
      const result = plugin.parse(content);
      
      expect(result).toEqual({
        ui: {
          buttons: {
            save: 'Save',
            cancel: 'Cancel'
          }
        }
      });
    });

    it('should handle empty content', () => {
      const result = plugin.parse('');
      expect(result).toEqual({});
    });

    it('should handle whitespace-only content', () => {
      const result = plugin.parse('   \n  \t  ');
      expect(result).toEqual({});
    });

    it('should throw PluginError for invalid JSON', () => {
      expect(() => plugin.parse('{"invalid": json}')).toThrow(PluginError);
    });

    it('should throw PluginError for non-object JSON', () => {
      expect(() => plugin.parse('"string"')).toThrow(PluginError);
      expect(() => plugin.parse('123')).toThrow(PluginError);
      expect(() => plugin.parse('["array"]')).toThrow(PluginError);
    });
  });

  describe('generate', () => {
    it('should generate formatted JSON from simple object', () => {
      const strings = { hello: 'world', foo: 'bar' };
      const result = plugin.generate(strings);
      
      expect(result).toBe('{\n  "hello": "world",\n  "foo": "bar"\n}');
    });

    it('should generate formatted JSON from nested object', () => {
      const strings = {
        ui: {
          buttons: {
            save: 'Save',
            cancel: 'Cancel'
          }
        }
      };
      const result = plugin.generate(strings);
      
      const expected = '{\n  "ui": {\n    "buttons": {\n      "save": "Save",\n      "cancel": "Cancel"\n    }\n  }\n}';
      expect(result).toBe(expected);
    });

    it('should handle empty object', () => {
      const result = plugin.generate({});
      expect(result).toBe('{}');
    });
  });

  describe('validate', () => {
    it('should validate correct JSON', () => {
      const content = '{"hello": "world"}';
      const result = plugin.validate(content);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect syntax errors', () => {
      const content = '{"invalid": json}';
      const result = plugin.validate(content);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('JSON syntax error');
    });

    it('should detect non-object root', () => {
      const content = '"string"';
      const result = plugin.validate(content);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('JSON root must be an object');
    });

    it('should warn about empty content', () => {
      const result = plugin.validate('');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Empty JSON content');
    });

    it('should warn about formatting issues', () => {
      const content = '{"hello":"world"}'; // No spaces
      const result = plugin.validate(content);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('formatting'))).toBe(true);
    });

    it('should detect invalid value types', () => {
      const content = '{"string": "valid", "array": [1, 2, 3], "number": 123}';
      const result = plugin.validate(content);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid value type'))).toBe(true);
    });
  });
});