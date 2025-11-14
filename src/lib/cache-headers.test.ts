/**
 * Tests for cache functionality
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildCacheControl, CACHE_CONFIGS } from './cache-headers';

describe('Cache Headers', () => {
  describe('buildCacheControl', () => {
    it('should build cache control with max-age', () => {
      const result = buildCacheControl({ maxAge: 300 });
      expect(result).toContain('max-age=300');
      expect(result).toContain('private');
    });

    it('should include no-cache when provided', () => {
      const result = buildCacheControl({ maxAge: 0, noCache: true });
      expect(result).toContain('max-age=0');
      expect(result).toContain('no-cache');
      expect(result).toContain('private');
    });

    it('should include no-store when provided', () => {
      const result = buildCacheControl({ maxAge: 0, noStore: true });
      expect(result).toContain('max-age=0');
      expect(result).toContain('no-store');
      expect(result).toContain('private');
    });

    it('should include must-revalidate when provided', () => {
      const result = buildCacheControl({ maxAge: 0, mustRevalidate: true });
      expect(result).toContain('max-age=0');
      expect(result).toContain('must-revalidate');
      expect(result).toContain('private');
    });

    it('should build cache control for projects config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.projects);
      expect(result).toContain('max-age=0');
      expect(result).toContain('no-cache');
      expect(result).toContain('private');
    });

    it('should build cache control for project files config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.projectFiles);
      expect(result).toContain('max-age=0');
      expect(result).toContain('no-cache');
      expect(result).toContain('private');
    });

    it('should build cache control for translations config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.translations);
      expect(result).toContain('max-age=0');
      expect(result).toContain('no-cache');
      expect(result).toContain('private');
    });

    it('should build cache control for translation suggestions config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.translationSuggestions);
      expect(result).toContain('max-age=0');
      expect(result).toContain('no-cache');
      expect(result).toContain('private');
    });

    it('should build cache control for user config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.user);
      expect(result).toContain('max-age=0');
      expect(result).toContain('no-cache');
      expect(result).toContain('private');
    });

    it('should build cache control for noCache config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.noCache);
      expect(result).toContain('max-age=0');
      expect(result).toContain('no-cache');
      expect(result).toContain('must-revalidate');
      expect(result).toContain('private');
    });

    it('should build cache control for noStore config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.noStore);
      expect(result).toContain('max-age=0');
      expect(result).toContain('no-store');
      expect(result).toContain('private');
      expect(result).not.toContain('no-cache');
    });
  });
});
