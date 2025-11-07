/**
 * Tests for Plugin Registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '@/lib/services/plugin-registry.js';
import { FormatPlugin, PluginError, PluginRegistryError } from '@/lib/types/plugin.js';

// Mock plugin for testing
class MockPlugin implements FormatPlugin {
  constructor(
    public name: string,
    public version: string = '1.0.0',
    public supportedFormats: string[] = ['mock']
  ) {}

  parse(content: string) {
    if (content === 'error') {
      throw new PluginError('Mock parse error', this.name, 'parse');
    }
    return { test: content };
  }

  generate(strings: any) {
    if (strings.error) {
      throw new PluginError('Mock generate error', this.name, 'generate');
    }
    return JSON.stringify(strings);
  }

  validate(content: string) {
    return {
      isValid: content !== 'invalid',
      errors: content === 'invalid' ? [{ message: 'Mock validation error' }] : [],
      warnings: []
    };
  }
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('register', () => {
    it('should register a valid plugin', () => {
      const plugin = new MockPlugin('test-plugin');
      const result = registry.register(plugin);

      expect(result.success).toBe(true);
      expect(result.metadata?.name).toBe('test-plugin');
      expect(result.metadata?.supportedFormats).toEqual(['mock']);
    });

    it('should reject plugin with duplicate name', () => {
      const plugin1 = new MockPlugin('test-plugin');
      const plugin2 = new MockPlugin('test-plugin');

      registry.register(plugin1);
      const result = registry.register(plugin2);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('should reject plugin with conflicting formats', () => {
      const plugin1 = new MockPlugin('plugin1', '1.0.0', ['json']);
      const plugin2 = new MockPlugin('plugin2', '1.0.0', ['json']);

      registry.register(plugin1);
      const result = registry.register(plugin2);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Format conflicts');
    });

    it('should reject invalid plugin', () => {
      const invalidPlugin = { name: 'invalid' } as any;
      const result = registry.register(invalidPlugin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('must have a valid version');
    });
  });

  describe('unregister', () => {
    it('should unregister existing plugin', () => {
      const plugin = new MockPlugin('test-plugin');
      registry.register(plugin);

      const result = registry.unregister('test-plugin');
      expect(result).toBe(true);
      expect(registry.getPlugin('test-plugin')).toBeUndefined();
    });

    it('should return false for non-existent plugin', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getPlugin', () => {
    it('should return registered plugin', () => {
      const plugin = new MockPlugin('test-plugin');
      registry.register(plugin);

      const retrieved = registry.getPlugin('test-plugin');
      expect(retrieved).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      const retrieved = registry.getPlugin('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getPluginForFormat', () => {
    it('should return plugin for supported format', () => {
      const plugin = new MockPlugin('test-plugin', '1.0.0', ['json']);
      registry.register(plugin);

      const retrieved = registry.getPluginForFormat('json');
      expect(retrieved).toBe(plugin);
    });

    it('should return undefined for unsupported format', () => {
      const retrieved = registry.getPluginForFormat('unsupported');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('parse', () => {
    it('should parse content using appropriate plugin', () => {
      const plugin = new MockPlugin('test-plugin', '1.0.0', ['mock']);
      registry.register(plugin);

      const result = registry.parse('test content', 'mock');
      expect(result).toEqual({ test: 'test content' });
    });

    it('should throw error for unsupported format', () => {
      expect(() => registry.parse('content', 'unsupported')).toThrow(PluginRegistryError);
    });

    it('should wrap plugin errors', () => {
      const plugin = new MockPlugin('test-plugin', '1.0.0', ['mock']);
      registry.register(plugin);

      expect(() => registry.parse('error', 'mock')).toThrow(PluginRegistryError);
    });
  });

  describe('generate', () => {
    it('should generate content using appropriate plugin', () => {
      const plugin = new MockPlugin('test-plugin', '1.0.0', ['mock']);
      registry.register(plugin);

      const result = registry.generate({ test: 'value' }, 'mock');
      expect(result).toBe('{"test":"value"}');
    });

    it('should throw error for unsupported format', () => {
      expect(() => registry.generate({}, 'unsupported')).toThrow(PluginRegistryError);
    });
  });

  describe('validate', () => {
    it('should validate content using appropriate plugin', () => {
      const plugin = new MockPlugin('test-plugin', '1.0.0', ['mock']);
      registry.register(plugin);

      const result = registry.validate('valid content', 'mock');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid result for validation errors', () => {
      const plugin = new MockPlugin('test-plugin', '1.0.0', ['mock']);
      registry.register(plugin);

      const result = registry.validate('invalid', 'mock');
      expect(result.isValid).toBe(false);
    });

    it('should throw error for unsupported format', () => {
      expect(() => registry.validate('content', 'unsupported')).toThrow(PluginRegistryError);
    });
  });

  describe('utility methods', () => {
    it('should list all plugins', () => {
      const plugin1 = new MockPlugin('plugin1', '1.0.0', ['format1']);
      const plugin2 = new MockPlugin('plugin2', '2.0.0', ['format2']);
      
      registry.register(plugin1);
      registry.register(plugin2);

      const plugins = registry.listPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins.map(p => p.name)).toContain('plugin1');
      expect(plugins.map(p => p.name)).toContain('plugin2');
    });

    it('should list supported formats', () => {
      const plugin = new MockPlugin('test-plugin', '1.0.0', ['json', 'yaml']);
      registry.register(plugin);

      const formats = registry.getSupportedFormats();
      expect(formats).toContain('json');
      expect(formats).toContain('yaml');
    });

    it('should check format support', () => {
      const plugin = new MockPlugin('test-plugin', '1.0.0', ['json']);
      registry.register(plugin);

      expect(registry.isFormatSupported('json')).toBe(true);
      expect(registry.isFormatSupported('yaml')).toBe(false);
    });

    it('should clear all plugins', () => {
      const plugin = new MockPlugin('test-plugin');
      registry.register(plugin);

      registry.clear();
      expect(registry.listPlugins()).toHaveLength(0);
      expect(registry.getSupportedFormats()).toHaveLength(0);
    });
  });
});