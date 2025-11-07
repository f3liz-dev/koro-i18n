/**
 * Error handler utilities tests
 * Tests for Requirements 2.5 and 5.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorMessageFormatter,
  RetryHandler,
  ErrorRecoveryStrategy,
  DEFAULT_RETRY_OPTIONS
} from '@/lib/utils/error-handler.js';

describe('ErrorMessageFormatter', () => {
  describe('formatGitHubError', () => {
    it('should format rate limit errors', () => {
      const error = { status: 429, message: 'API rate limit exceeded' };
      const result = ErrorMessageFormatter.formatGitHubError(error);

      expect(result.errorCode).toBe('RATE_LIMIT');
      expect(result.retryable).toBe(true);
      expect(result.severity).toBe('medium');
      expect(result.actionableSteps).toContain('Wait for 1-2 minutes before retrying');
    });

    it('should format authentication errors', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const result = ErrorMessageFormatter.formatGitHubError(error);

      expect(result.errorCode).toBe('AUTH_FAILED');
      expect(result.retryable).toBe(false);
      expect(result.severity).toBe('high');
      expect(result.actionableSteps).toContain('Log out and log back in to refresh your authentication');
    });

    it('should format permission errors', () => {
      const error = { status: 403, message: 'Forbidden' };
      const result = ErrorMessageFormatter.formatGitHubError(error);

      expect(result.errorCode).toBe('ACCESS_DENIED');
      expect(result.retryable).toBe(false);
      expect(result.severity).toBe('high');
    });

    it('should format not found errors', () => {
      const error = { status: 404, message: 'Not found' };
      const result = ErrorMessageFormatter.formatGitHubError(error);

      expect(result.errorCode).toBe('NOT_FOUND');
      expect(result.retryable).toBe(false);
      expect(result.severity).toBe('medium');
    });

    it('should format server errors', () => {
      const error = { status: 503, message: 'Service unavailable' };
      const result = ErrorMessageFormatter.formatGitHubError(error);

      expect(result.errorCode).toBe('SERVER_ERROR');
      expect(result.retryable).toBe(true);
      expect(result.severity).toBe('medium');
    });
  });

  describe('formatValidationError', () => {
    it('should format validation errors with actionable steps', () => {
      const errors = ['Field is required', 'Invalid format'];
      const result = ErrorMessageFormatter.formatValidationError(errors);

      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.retryable).toBe(false);
      expect(result.severity).toBe('low');
      expect(result.technicalDetails).toContain('Field is required');
      expect(result.actionableSteps.length).toBeGreaterThan(0);
    });

    it('should include format-specific guidance', () => {
      const errors = ['Invalid JSON'];
      const result = ErrorMessageFormatter.formatValidationError(errors, { format: 'JSON' });

      expect(result.actionableSteps).toContain('Ensure your translation follows the JSON format');
    });
  });

  describe('formatCommitError', () => {
    it('should format commit errors with retry information (Requirement 2.5)', () => {
      const error = new Error('Commit failed');
      const result = ErrorMessageFormatter.formatCommitError(error, { attempt: 1, maxAttempts: 3 });

      expect(result.errorCode).toBe('COMMIT_FAILED');
      expect(result.retryable).toBe(true);
      expect(result.message).toContain('attempt 1 of 3');
      expect(result.actionableSteps).toContain('The system is automatically retrying the commit');
    });

    it('should indicate when retries are exhausted', () => {
      const error = new Error('Commit failed');
      const result = ErrorMessageFormatter.formatCommitError(error, { attempt: 3, maxAttempts: 3 });

      expect(result.severity).toBe('high');
      expect(result.message).toContain('after 3 attempts');
      expect(result.actionableSteps).toContain('Click the "Retry" button to try again');
    });
  });

  describe('formatNetworkError', () => {
    it('should format timeout errors', () => {
      const error = { message: 'Request timeout', code: 'ETIMEDOUT' };
      const result = ErrorMessageFormatter.formatNetworkError(error);

      expect(result.errorCode).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
      expect(result.actionableSteps).toContain('Check your internet connection');
    });

    it('should format connection errors', () => {
      const error = { message: 'Connection refused', code: 'ECONNREFUSED' };
      const result = ErrorMessageFormatter.formatNetworkError(error);

      expect(result.errorCode).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
      expect(result.severity).toBe('high');
    });
  });

  describe('format', () => {
    it('should route to appropriate formatter based on error type', () => {
      const validationError = { code: 'VALIDATION_ERROR', details: ['Error 1'] };
      const result1 = ErrorMessageFormatter.format(validationError);
      expect(result1.errorCode).toBe('VALIDATION_ERROR');

      const githubError = { status: 429 };
      const result2 = ErrorMessageFormatter.format(githubError);
      expect(result2.errorCode).toBe('RATE_LIMIT');

      const networkError = { code: 'ETIMEDOUT' };
      const result3 = ErrorMessageFormatter.format(networkError);
      expect(result3.errorCode).toBe('TIMEOUT');
    });
  });
});

describe('RetryHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should retry on network failures', async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        const error: any = new Error('Network error');
        error.code = 'NETWORK_ERROR';
        throw error;
      }
      return 'success';
    });

    const promise = RetryHandler.withRetry(operation, {
      maxAttempts: 3,
      initialDelay: 100,
      backoffMultiplier: 2
    });

    // Fast-forward through delays
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should not retry non-retryable errors', async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts++;
      const error: any = new Error('Validation error');
      error.code = 'VALIDATION_ERROR';
      throw error;
    });

    await expect(
      RetryHandler.withRetry(operation, {
        maxAttempts: 3,
        retryableErrors: ['NETWORK_ERROR']
      })
    ).rejects.toThrow('Validation error');

    expect(attempts).toBe(1);
  });

  it('should respect max attempts', async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts++;
      const error: any = new Error('Network error');
      error.code = 'NETWORK_ERROR';
      throw error;
    });

    const promise = RetryHandler.withRetry(operation, {
      maxAttempts: 2,
      initialDelay: 100
    });

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Network error');
    expect(attempts).toBe(2);
  });

  it('should use exponential backoff', async () => {
    const delays: number[] = [];
    let attempts = 0;

    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 4) {
        const error: any = new Error('Network error');
        error.code = 'NETWORK_ERROR';
        throw error;
      }
      return 'success';
    });

    // Mock setTimeout to capture delays
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((fn: any, delay: number) => {
      if (delay > 0) delays.push(delay);
      return originalSetTimeout(fn, 0);
    }) as any;

    const promise = RetryHandler.withRetry(operation, {
      maxAttempts: 4,
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000
    });

    await vi.runAllTimersAsync();
    await promise;

    global.setTimeout = originalSetTimeout;

    // Verify exponential backoff: 1000, 2000, 4000
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(2000);
    expect(delays[2]).toBe(4000);
  });
});

describe('ErrorRecoveryStrategy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should recover from commit failures (Requirement 2.5)', async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 2) {
        const error: any = new Error('Commit failed');
        error.code = 'COMMIT_FAILED';
        throw error;
      }
      return { sha: 'abc123' };
    });

    const promise = ErrorRecoveryStrategy.recoverFromCommitFailure(operation);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toEqual({ sha: 'abc123' });
    expect(attempts).toBe(2);
  });

  it('should use fallback operation if primary fails', async () => {
    const primaryOperation = vi.fn(async () => {
      throw new Error('Primary failed');
    });

    const fallbackOperation = vi.fn(async () => {
      return { sha: 'fallback123' };
    });

    const promise = ErrorRecoveryStrategy.recoverFromCommitFailure(
      primaryOperation,
      fallbackOperation
    );

    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toEqual({ sha: 'fallback123' });
    expect(primaryOperation).toHaveBeenCalled();
    expect(fallbackOperation).toHaveBeenCalled();
  });

  it('should recover from network failures with multiple retries', async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 4) {
        const error: any = new Error('Network timeout');
        error.code = 'TIMEOUT';
        throw error;
      }
      return 'success';
    });

    const promise = ErrorRecoveryStrategy.recoverFromNetworkFailure(operation, {
      maxAttempts: 5
    });

    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(attempts).toBe(4);
  });

  it('should handle rate limiting with reset time', async () => {
    const resetTime = new Date(Date.now() + 1000); // Shorter wait time for test
    let attempts = 0;

    const operation = vi.fn(async () => {
      attempts++;
      if (attempts === 1) {
        const error: any = new Error('Rate limited');
        error.code = 'RATE_LIMIT';
        throw error;
      }
      return 'success';
    });

    const promise = ErrorRecoveryStrategy.recoverFromRateLimit(operation, resetTime);
    
    // Fast-forward past the reset time
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  }, 10000); // Increase timeout to 10 seconds
});

describe('DEFAULT_RETRY_OPTIONS', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_RETRY_OPTIONS.maxAttempts).toBe(3);
    expect(DEFAULT_RETRY_OPTIONS.initialDelay).toBe(1000);
    expect(DEFAULT_RETRY_OPTIONS.maxDelay).toBe(10000);
    expect(DEFAULT_RETRY_OPTIONS.backoffMultiplier).toBe(2);
    expect(DEFAULT_RETRY_OPTIONS.retryableErrors).toContain('NETWORK_ERROR');
    expect(DEFAULT_RETRY_OPTIONS.retryableErrors).toContain('TIMEOUT');
    expect(DEFAULT_RETRY_OPTIONS.retryableErrors).toContain('RATE_LIMIT');
  });
});
