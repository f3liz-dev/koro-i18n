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

    it('should include stale-while-revalidate when provided', () => {
      const result = buildCacheControl({ maxAge: 300, swr: 60 });
      expect(result).toContain('max-age=300');
      expect(result).toContain('stale-while-revalidate=60');
      expect(result).toContain('private');
    });

    it('should include must-revalidate when provided', () => {
      const result = buildCacheControl({ maxAge: 300, mustRevalidate: true });
      expect(result).toContain('max-age=300');
      expect(result).toContain('must-revalidate');
      expect(result).toContain('private');
    });

    it('should build cache control for projects config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.projects);
      expect(result).toContain('max-age=300');
      expect(result).toContain('stale-while-revalidate=60');
      expect(result).toContain('private');
    });

    it('should build cache control for project files config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.projectFiles);
      expect(result).toContain('max-age=600');
      expect(result).toContain('stale-while-revalidate=120');
      expect(result).toContain('private');
    });

    it('should build cache control for translations config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.translations);
      expect(result).toContain('max-age=60');
      expect(result).toContain('stale-while-revalidate=30');
      expect(result).toContain('private');
    });

    it('should build cache control for user config', () => {
      const result = buildCacheControl(CACHE_CONFIGS.user);
      expect(result).toContain('max-age=3600');
      expect(result).toContain('private');
    });
  });
});
