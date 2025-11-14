/**
 * Tests for ETag generation and validation
 */
import { describe, it, expect } from 'vitest';
import { generateETag, withETag, checkIfNoneMatch } from './etag';

describe('ETag utilities', () => {
  describe('generateETag', () => {
    it('should generate consistent ETags for same content', async () => {
      const content = JSON.stringify({ test: 'data' });
      const etag1 = await generateETag(content);
      const etag2 = await generateETag(content);
      expect(etag1).toBe(etag2);
    });

    it('should generate different ETags for different content', async () => {
      const content1 = JSON.stringify({ test: 'data1' });
      const content2 = JSON.stringify({ test: 'data2' });
      const etag1 = await generateETag(content1);
      const etag2 = await generateETag(content2);
      expect(etag1).not.toBe(etag2);
    });

    it('should return ETag in quoted format', async () => {
      const content = JSON.stringify({ test: 'data' });
      const etag = await generateETag(content);
      expect(etag).toMatch(/^"[a-f0-9]+"$/);
    });

    it('should generate 16-character hash', async () => {
      const content = JSON.stringify({ test: 'data' });
      const etag = await generateETag(content);
      // Format is "hash", so length should be 18 (16 + 2 quotes)
      expect(etag.length).toBe(18);
    });
  });

  describe('withETag', () => {
    it('should add ETag header to response', async () => {
      const content = JSON.stringify({ test: 'data' });
      const response = new Response(content, { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const responseWithETag = await withETag(response, content);
      const etag = responseWithETag.headers.get('ETag');
      
      expect(etag).toBeTruthy();
      expect(etag).toMatch(/^"[a-f0-9]+"$/);
    });

    it('should preserve existing headers', async () => {
      const content = JSON.stringify({ test: 'data' });
      const response = new Response(content, { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300'
        }
      });
      
      const responseWithETag = await withETag(response, content);
      
      expect(responseWithETag.headers.get('Content-Type')).toBe('application/json');
      expect(responseWithETag.headers.get('Cache-Control')).toBe('max-age=300');
      expect(responseWithETag.headers.get('ETag')).toBeTruthy();
    });
  });

  describe('checkIfNoneMatch', () => {
    it('should return false when If-None-Match header is not present', () => {
      const request = new Request('https://example.com/api/test');
      const result = checkIfNoneMatch(request, '"abc123"');
      expect(result).toBe(false);
    });

    it('should return true when ETags match', () => {
      const request = new Request('https://example.com/api/test', {
        headers: { 'If-None-Match': '"abc123"' }
      });
      const result = checkIfNoneMatch(request, '"abc123"');
      expect(result).toBe(true);
    });

    it('should return false when ETags do not match', () => {
      const request = new Request('https://example.com/api/test', {
        headers: { 'If-None-Match': '"abc123"' }
      });
      const result = checkIfNoneMatch(request, '"def456"');
      expect(result).toBe(false);
    });

    it('should handle multiple ETags in If-None-Match', () => {
      const request = new Request('https://example.com/api/test', {
        headers: { 'If-None-Match': '"abc123", "def456", "ghi789"' }
      });
      const result = checkIfNoneMatch(request, '"def456"');
      expect(result).toBe(true);
    });

    it('should return false when checking ETag not in list', () => {
      const request = new Request('https://example.com/api/test', {
        headers: { 'If-None-Match': '"abc123", "def456"' }
      });
      const result = checkIfNoneMatch(request, '"xyz999"');
      expect(result).toBe(false);
    });
  });
});
