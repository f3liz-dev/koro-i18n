/**
 * Tests for OpenTelemetry integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { telemetry } from '@/api/telemetry/setup.js';

describe('OpenTelemetry Integration', () => {
  beforeAll(() => {
    // Initialize telemetry for testing
  });

  it('should create spans for operations', () => {
    const span = telemetry.createSpan('test.operation', { test: true });
    expect(span).toBeDefined();
    span.end();
  });

  it('should record authentication metrics', () => {
    expect(() => {
      telemetry.recordAuth('login', 'test-user', true);
    }).not.toThrow();
  });

  it('should record project metrics', () => {
    expect(() => {
      telemetry.recordProject('get', 'test-project', true);
    }).not.toThrow();
  });

  it('should record translation metrics', () => {
    expect(() => {
      telemetry.recordTranslation('submit', 'test-project', 'en', true);
    }).not.toThrow();
  });

  it('should record GitHub API metrics', () => {
    expect(() => {
      telemetry.recordGitHubAPI('get_repo', true, 200);
    }).not.toThrow();
  });

  it('should record error metrics', () => {
    expect(() => {
      telemetry.recordError('validation', { path: '/test' });
    }).not.toThrow();
  });

  it('should create traced functions', async () => {
    const testFunction = telemetry.traced('test.function', async (value: number) => {
      return value * 2;
    });

    const result = await testFunction(5);
    expect(result).toBe(10);
  });

  it('should handle traced function errors', async () => {
    const errorFunction = telemetry.traced('test.error', async () => {
      throw new Error('Test error');
    });

    await expect(errorFunction()).rejects.toThrow('Test error');
  });
});