/**
 * Tests for database-optimized ETag generation
 */
import { describe, it, expect } from 'vitest';
import {
  generateETagFromTimestamp,
  generateProjectsETag,
  generateTranslationsETag,
  generateHistoryETag,
  generateFilesETag,
  checkETagMatch,
  create304Response,
} from './etag-db';

describe('Database-optimized ETag', () => {
  describe('generateETagFromTimestamp', () => {
    it('should generate ETag from single timestamp', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const etag = generateETagFromTimestamp(date);
      
      expect(etag).toMatch(/^"[a-z0-9]+"$/);
      expect(etag.length).toBeGreaterThan(2);
    });

    it('should generate same ETag for same timestamp', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const etag1 = generateETagFromTimestamp(date);
      const etag2 = generateETagFromTimestamp(date);
      
      expect(etag1).toBe(etag2);
    });

    it('should generate different ETags for different timestamps', () => {
      const date1 = new Date('2024-01-01T00:00:00Z');
      const date2 = new Date('2024-01-02T00:00:00Z');
      const etag1 = generateETagFromTimestamp(date1);
      const etag2 = generateETagFromTimestamp(date2);
      
      expect(etag1).not.toBe(etag2);
    });

    it('should use most recent timestamp from multiple inputs', () => {
      const date1 = new Date('2024-01-01T00:00:00Z');
      const date2 = new Date('2024-01-05T00:00:00Z');
      const date3 = new Date('2024-01-03T00:00:00Z');
      
      const etag = generateETagFromTimestamp(date1, date2, date3);
      const etagFromMostRecent = generateETagFromTimestamp(date2);
      
      expect(etag).toBe(etagFromMostRecent);
    });

    it('should handle ISO string timestamps', () => {
      const dateStr = '2024-01-01T00:00:00Z';
      const etag = generateETagFromTimestamp(dateStr);
      
      expect(etag).toMatch(/^"[a-z0-9]+"$/);
    });

    it('should filter out null and undefined timestamps', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const etag = generateETagFromTimestamp(date, null, undefined);
      const etagWithoutNulls = generateETagFromTimestamp(date);
      
      expect(etag).toBe(etagWithoutNulls);
    });

    it('should handle empty timestamp array', () => {
      const etag = generateETagFromTimestamp();
      
      // Should still generate a valid ETag (using current time as fallback)
      expect(etag).toMatch(/^"[a-z0-9]+"$/);
    });
  });

  describe('generateProjectsETag', () => {
    it('should generate ETag from project created dates', () => {
      const projects = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-02T00:00:00Z'),
      ];
      const etag = generateProjectsETag(projects);
      
      expect(etag).toMatch(/^"[a-z0-9]+"$/);
    });

    it('should include member updated dates when provided', () => {
      const projectDates = [new Date('2024-01-01T00:00:00Z')];
      const memberDates = [new Date('2024-01-05T00:00:00Z')];
      
      const etagWithMembers = generateProjectsETag(projectDates, memberDates);
      const etagWithoutMembers = generateProjectsETag(projectDates);
      
      // Should be different because member date is more recent
      expect(etagWithMembers).not.toBe(etagWithoutMembers);
    });
  });

  describe('generateTranslationsETag', () => {
    it('should generate ETag from translation updated dates', () => {
      const translations = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-02T00:00:00Z'),
      ];
      const etag = generateTranslationsETag(translations);
      
      expect(etag).toMatch(/^"[a-z0-9]+"$/);
    });

    it('should change when translation is updated', () => {
      const translations1 = [new Date('2024-01-01T00:00:00Z')];
      const translations2 = [new Date('2024-01-02T00:00:00Z')];
      
      const etag1 = generateTranslationsETag(translations1);
      const etag2 = generateTranslationsETag(translations2);
      
      expect(etag1).not.toBe(etag2);
    });
  });

  describe('generateHistoryETag', () => {
    it('should generate ETag from history created dates', () => {
      const history = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-02T00:00:00Z'),
      ];
      const etag = generateHistoryETag(history);
      
      expect(etag).toMatch(/^"[a-z0-9]+"$/);
    });
  });

  describe('generateFilesETag', () => {
    it('should generate ETag from file uploaded dates', () => {
      const files = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-02T00:00:00Z'),
      ];
      const etag = generateFilesETag(files);
      
      expect(etag).toMatch(/^"[a-z0-9]+"$/);
    });
  });

  describe('checkETagMatch', () => {
    it('should return true when ETag matches', () => {
      const etag = '"abc123"';
      const request = new Request('http://example.com', {
        headers: { 'If-None-Match': etag },
      });
      
      expect(checkETagMatch(request, etag)).toBe(true);
    });

    it('should return false when ETag does not match', () => {
      const etag = '"abc123"';
      const request = new Request('http://example.com', {
        headers: { 'If-None-Match': '"xyz789"' },
      });
      
      expect(checkETagMatch(request, etag)).toBe(false);
    });

    it('should return false when If-None-Match header is missing', () => {
      const etag = '"abc123"';
      const request = new Request('http://example.com');
      
      expect(checkETagMatch(request, etag)).toBe(false);
    });

    it('should handle multiple ETags in If-None-Match', () => {
      const etag = '"abc123"';
      const request = new Request('http://example.com', {
        headers: { 'If-None-Match': '"xyz789", "abc123", "def456"' },
      });
      
      expect(checkETagMatch(request, etag)).toBe(true);
    });
  });

  describe('create304Response', () => {
    it('should create 304 response with ETag', () => {
      const etag = '"abc123"';
      const response = create304Response(etag);
      
      expect(response.status).toBe(304);
      expect(response.headers.get('ETag')).toBe(etag);
    });

    it('should include Cache-Control when provided', () => {
      const etag = '"abc123"';
      const cacheControl = 'max-age=0, no-cache';
      const response = create304Response(etag, cacheControl);
      
      expect(response.status).toBe(304);
      expect(response.headers.get('ETag')).toBe(etag);
      expect(response.headers.get('Cache-Control')).toBe(cacheControl);
    });

    it('should have no body', async () => {
      const etag = '"abc123"';
      const response = create304Response(etag);
      
      const text = await response.text();
      expect(text).toBe('');
    });
  });
});
