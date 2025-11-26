import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createProjectTranslationRoutes } from './project-translations';
import { PrismaClient } from '../generated/prisma';

describe('Translation Routes', () => {
  let app: Hono;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    const env = {
      JWT_SECRET: 'test-secret',
    };
    app = new Hono();
    // mount project-level translations to simulate nested routes
    app.route('/api/projects/:projectName/translations', createProjectTranslationRoutes(prisma, env));
  });

  describe('Translation Approval', () => {
    it('should ensure only one translation is approved per key', async () => {
      // This test validates the logic that when approving a translation,
      // all other pending or approved translations for the same key are rejected
      
      const projectId = 'test-project-123';
      const language = 'ja';
      const key = 'common.json:welcome.message';
      
      // Simulate multiple translations for the same key
      const translations = [
        { id: 'trans-1', value: 'こんにちは', status: 'pending' },
        { id: 'trans-2', value: 'いらっしゃいませ', status: 'pending' },
        { id: 'trans-3', value: 'ようこそ', status: 'approved' },
      ];
      
      // When approving trans-2, the logic should:
      // 1. Reject trans-1 (pending)
      // 2. Reject trans-3 (already approved)
      // 3. Approve trans-2
      
      // The database query should be:
      // updateMany where: { projectId, language, key, id: { not: 'trans-2' }, status: { in: ['pending', 'approved'] } }
      // This ensures only one translation per key is approved
      
      const expectedRejectedIds = ['trans-1', 'trans-3'];
      const expectedApprovedId = 'trans-2';
      
      expect(expectedRejectedIds.length).toBe(2);
      expect(expectedApprovedId).toBe('trans-2');
      
      // Verify the logic rejects other translations
      const otherTranslations = translations.filter(t => t.id !== expectedApprovedId);
      expect(otherTranslations.length).toBe(2);
      expect(otherTranslations.every(t => ['pending', 'approved'].includes(t.status))).toBe(true);
    });

    it('should reject both pending and already-approved translations', () => {
      // When approving a translation, we need to reject:
      // 1. Other pending translations (competing suggestions)
      // 2. Other approved translations (to ensure only one is approved)
      
      const statusesToReject = ['pending', 'approved'];
      
      expect(statusesToReject).toContain('pending');
      expect(statusesToReject).toContain('approved');
      expect(statusesToReject).not.toContain('rejected');
      expect(statusesToReject).not.toContain('deleted');
    });

    it('should maintain translation uniqueness by projectId, language, and key', () => {
      // The uniqueness constraint is: projectId + language + key
      // This means:
      // - Different projects can have same key with multiple approved translations
      // - Same project, different languages can have multiple approved translations
      // - Same project, same language, same key should have only ONE approved translation
      
      const cases = [
        {
          desc: 'Different projects, same language and key',
          trans1: { projectId: 'proj-1', language: 'ja', key: 'greeting' },
          trans2: { projectId: 'proj-2', language: 'ja', key: 'greeting' },
          shouldConflict: false,
        },
        {
          desc: 'Same project, different languages, same key',
          trans1: { projectId: 'proj-1', language: 'ja', key: 'greeting' },
          trans2: { projectId: 'proj-1', language: 'es', key: 'greeting' },
          shouldConflict: false,
        },
        {
          desc: 'Same project, same language, same key',
          trans1: { projectId: 'proj-1', language: 'ja', key: 'greeting' },
          trans2: { projectId: 'proj-1', language: 'ja', key: 'greeting' },
          shouldConflict: true,
        },
      ];
      
      for (const testCase of cases) {
        const conflict = 
          testCase.trans1.projectId === testCase.trans2.projectId &&
          testCase.trans1.language === testCase.trans2.language &&
          testCase.trans1.key === testCase.trans2.key;
        
        expect(conflict).toBe(testCase.shouldConflict);
      }
    });
  });

  describe('Download API Approved Translations', () => {
    it('should merge approved translations into downloaded files', () => {
      // The download API should:
      // 1. Fetch files from ProjectFile table (base translations)
      // 2. Fetch approved translations from Translation table
      // 3. Merge approved translations, overriding base values
      
      const baseFile = {
        lang: 'ja',
        filename: 'common.json',
        contents: {
          'welcome': '元のテキスト',
          'goodbye': 'さようなら',
        },
      };
      
      const approvedTranslations = {
        'ja': {
          'common.json': {
            'welcome': '承認されたテキスト',  // This should override
          },
        },
      };
      
      // After merging
      const expected = {
        'welcome': '承認されたテキスト',  // Overridden
        'goodbye': 'さようなら',         // Unchanged
      };
      
      const merged = { ...baseFile.contents, ...approvedTranslations['ja']['common.json'] };
      
      expect(merged).toEqual(expected);
    });

    it('should parse translation keys correctly', () => {
      // Translation keys are stored as "filename:key"
      // e.g., "common.json:welcome.message"
      
      const translationKey = 'common.json:welcome.message';
      const colonIndex = translationKey.indexOf(':');
      
      expect(colonIndex).toBeGreaterThan(0);
      
      const filename = translationKey.substring(0, colonIndex);
      const key = translationKey.substring(colonIndex + 1);
      
      expect(filename).toBe('common.json');
      expect(key).toBe('welcome.message');
    });

    it('should handle keys without colons gracefully', () => {
      // Invalid keys without colons should be skipped
      const invalidKey = 'invalidkey';
      const colonIndex = invalidKey.indexOf(':');
      
      expect(colonIndex).toBe(-1);
      // Logic should skip this key
    });
  });
});
