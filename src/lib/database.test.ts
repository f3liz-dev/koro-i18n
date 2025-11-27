/**
 * Tests for database utility functions
 */
import { describe, it, expect, vi } from 'vitest';
import { flattenObject } from './database';

describe('database utilities', () => {
  describe('flattenObject', () => {
    it('should flatten a simple nested object', () => {
      const obj = {
        a: {
          b: 'value',
        },
      };
      const result = flattenObject(obj);
      
      expect(result).toEqual({ 'a.b': 'value' });
    });

    it('should handle deeply nested objects', () => {
      const obj = {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      };
      const result = flattenObject(obj);
      
      expect(result).toEqual({ 'level1.level2.level3': 'deep value' });
    });

    it('should handle multiple keys at each level', () => {
      const obj = {
        a: {
          b: 'value1',
          c: 'value2',
        },
        d: 'value3',
      };
      const result = flattenObject(obj);
      
      expect(result).toEqual({
        'a.b': 'value1',
        'a.c': 'value2',
        'd': 'value3',
      });
    });

    it('should convert non-string values to strings', () => {
      const obj = {
        number: 42,
        bool: true,
        nullVal: null,
      };
      const result = flattenObject(obj);
      
      expect(result).toEqual({
        'number': '42',
        'bool': 'true',
        'nullVal': 'null',
      });
    });

    it('should not flatten arrays', () => {
      const obj = {
        arr: [1, 2, 3],
      };
      const result = flattenObject(obj);
      
      expect(result).toEqual({ 'arr': '1,2,3' });
    });

    it('should handle empty objects', () => {
      const obj = {};
      const result = flattenObject(obj);
      
      expect(result).toEqual({});
    });

    it('should handle custom prefix', () => {
      const obj = {
        key: 'value',
      };
      const result = flattenObject(obj, 'prefix');
      
      expect(result).toEqual({ 'prefix.key': 'value' });
    });
  });
});

// Note: checkModerationAccess and other database functions that use prisma.$queryRaw
// cannot be easily unit tested without a real database or mocking the prisma client.
// Integration tests would be more appropriate for those functions.
// The key optimization here is reducing 2 queries to 1 via a single SQL query.
