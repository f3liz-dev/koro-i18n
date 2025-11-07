/**
 * Logging service tests
 * Tests for comprehensive logging functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LoggingService, generateRequestId } from '@/api/services/LoggingService.js';

describe('LoggingService', () => {
  let logger: LoggingService;

  beforeEach(() => {
    logger = new LoggingService('debug');
  });

  describe('Basic logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { key: 'value' });
      const logs = logger.getLogs();
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].level).toBe('debug');
      expect(logs[0].message).toBe('Debug message');
      expect(logs[0].context).toEqual({ key: 'value' });
    });

    it('should log info messages', () => {
      logger.info('Info message');
      const logs = logger.getLogs();
      
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Info message');
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');
      const logs = logger.getLogs();
      
      expect(logs[0].level).toBe('warn');
      expect(logs[0].message).toBe('Warning message');
    });

    it('should log error messages with error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { context: 'test' });
      const logs = logger.getLogs();
      
      expect(logs[0].level).toBe('error');
      expect(logs[0].message).toBe('Error occurred');
      expect(logs[0].error).toBe(error);
      expect(logs[0].context).toEqual({ context: 'test' });
    });
  });

  describe('Specialized logging methods', () => {
    it('should log network failures (Requirement 2.5)', () => {
      const error = new Error('Network timeout');
      logger.logNetworkFailure('fetch data', error, 2, 3, true, 'req_123');
      
      const logs = logger.getLogs();
      expect(logs[0].level).toBe('warn');
      expect(logs[0].message).toContain('Network failure during fetch data');
      expect(logs[0].message).toContain('attempt 2/3');
      expect(logs[0].context?.willRetry).toBe(true);
      expect(logs[0].requestId).toBe('req_123');
    });

    it('should log commit failures (Requirement 2.5)', () => {
      const error = new Error('Commit failed');
      logger.logCommitFailure('project-1', 'es', error, 1, 3, 'req_456');
      
      const logs = logger.getLogs();
      expect(logs[0].level).toBe('error');
      expect(logs[0].message).toContain('Commit failed for project-1/es');
      expect(logs[0].context?.projectId).toBe('project-1');
      expect(logs[0].context?.language).toBe('es');
      expect(logs[0].context?.willRetry).toBe(true);
    });

    it('should log validation failures (Requirement 5.5)', () => {
      const errors = ['Field is required', 'Invalid format'];
      logger.logValidationFailure('translatedText', errors, { format: 'json' }, 'req_789');
      
      const logs = logger.getLogs();
      expect(logs[0].level).toBe('warn');
      expect(logs[0].message).toContain('Validation failed for translatedText');
      expect(logs[0].context?.errors).toEqual(errors);
      expect(logs[0].context?.errorCount).toBe(2);
      expect(logs[0].context?.format).toBe('json');
    });

    it('should log recovery attempts', () => {
      logger.logRecoveryAttempt('commit', 'retry', true, { attempt: 2 });
      
      const logs = logger.getLogs();
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toContain('Recovery succeeded');
      expect(logs[0].context?.strategy).toBe('retry');
    });

    it('should log API requests', () => {
      logger.logRequest('GET', '/api/projects', 200, 150, 'user-123', 'req_abc');
      
      const logs = logger.getLogs();
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toContain('GET /api/projects - 200 (150ms)');
      expect(logs[0].context?.statusCode).toBe(200);
      expect(logs[0].context?.duration).toBe(150);
      expect(logs[0].userId).toBe('user-123');
    });

    it('should log authentication events', () => {
      logger.logAuth('login', 'user-456', { provider: 'github' });
      
      const logs = logger.getLogs();
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toContain('Authentication event: login');
      expect(logs[0].context?.userId).toBe('user-456');
      expect(logs[0].context?.provider).toBe('github');
    });

    it('should log GitHub API interactions', () => {
      logger.logGitHubAPI('create-commit', true, 250, { repo: 'test/repo' });
      
      const logs = logger.getLogs();
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toContain('GitHub API: create-commit - success');
      expect(logs[0].context?.duration).toBe(250);
    });

    it('should log translation operations', () => {
      logger.logTranslation('commit', 'project-1', 'fr', true, { keys: ['key1'] });
      
      const logs = logger.getLogs();
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toContain('Translation commit: project-1/fr - success');
      expect(logs[0].context?.operation).toBe('commit');
    });
  });

  describe('Log filtering', () => {
    beforeEach(() => {
      logger.info('Info 1');
      logger.warn('Warning 1');
      logger.error('Error 1');
      logger.info('Info 2', { userId: 'user-123' });
    });

    it('should filter logs by level', () => {
      const errorLogs = logger.getLogs({ level: 'error' });
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].level).toBe('error');
    });

    it('should filter logs by userId', () => {
      const userLogs = logger.getLogs({ userId: 'user-123' });
      expect(userLogs.length).toBe(1);
      expect(userLogs[0].context?.userId).toBe('user-123');
    });

    it('should filter logs by time range', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000);
      const future = new Date(now.getTime() + 1000);
      
      const recentLogs = logger.getLogs({ startTime: past, endTime: future });
      expect(recentLogs.length).toBeGreaterThan(0);
    });

    it('should limit number of returned logs', () => {
      const logs = logger.getLogs(undefined, 2);
      expect(logs.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Log statistics', () => {
    beforeEach(() => {
      logger.info('Info 1');
      logger.info('Info 2');
      logger.warn('Warning 1');
      logger.error('Error 1');
      logger.error('Error 1'); // Duplicate error
    });

    it('should calculate log statistics', () => {
      const stats = logger.getStats();
      
      expect(stats.totalLogs).toBeGreaterThan(0);
      expect(stats.logsByLevel).toBeDefined();
      expect(stats.logsByLevel.info).toBeGreaterThanOrEqual(2);
      expect(stats.logsByLevel.warn).toBeGreaterThanOrEqual(1);
      expect(stats.logsByLevel.error).toBeGreaterThanOrEqual(2);
    });

    it('should calculate error rate', () => {
      const stats = logger.getStats();
      
      expect(stats.errorRate).toBeGreaterThan(0);
      expect(stats.errorRate).toBeLessThanOrEqual(100);
    });

    it('should identify top errors', () => {
      const stats = logger.getStats();
      
      expect(stats.topErrors).toBeDefined();
      expect(stats.topErrors.length).toBeGreaterThan(0);
      expect(stats.topErrors[0].message).toBe('Error 1');
      expect(stats.topErrors[0].count).toBe(2);
    });

    it('should provide recent activity', () => {
      const stats = logger.getStats();
      
      expect(stats.recentActivity).toBeDefined();
      expect(stats.recentActivity.length).toBeGreaterThan(0);
      expect(stats.recentActivity[0].timestamp).toBeDefined();
      expect(stats.recentActivity[0].level).toBeDefined();
      expect(stats.recentActivity[0].message).toBeDefined();
    });
  });

  describe('Log level filtering', () => {
    it('should respect configured log level', () => {
      const infoLogger = new LoggingService('info');
      
      infoLogger.debug('Debug message');
      infoLogger.info('Info message');
      
      const logs = infoLogger.getLogs();
      
      // Debug should be filtered out
      expect(logs.find(l => l.level === 'debug')).toBeUndefined();
      expect(logs.find(l => l.level === 'info')).toBeDefined();
    });

    it('should include higher severity levels', () => {
      const warnLogger = new LoggingService('warn');
      
      warnLogger.debug('Debug');
      warnLogger.info('Info');
      warnLogger.warn('Warning');
      warnLogger.error('Error');
      
      const logs = warnLogger.getLogs();
      
      expect(logs.find(l => l.level === 'debug')).toBeUndefined();
      expect(logs.find(l => l.level === 'info')).toBeUndefined();
      expect(logs.find(l => l.level === 'warn')).toBeDefined();
      expect(logs.find(l => l.level === 'error')).toBeDefined();
    });
  });

  describe('Log cleanup', () => {
    it('should cleanup old logs when limit is exceeded', () => {
      const smallLogger = new LoggingService('debug');
      
      // Add more than maxEntries logs
      for (let i = 0; i < 1100; i++) {
        smallLogger.info(`Message ${i}`);
        // Trigger cleanup every 1000 logs
        if (i % 1000 === 0) {
          smallLogger.cleanup();
        }
      }
      
      // Final cleanup
      smallLogger.cleanup();
      const logs = smallLogger.getLogs(undefined, 10000);
      
      // After cleanup, should have at most maxEntries (1000)
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Log export', () => {
    beforeEach(() => {
      logger.info('Info message', { key: 'value' });
      logger.error('Error message', new Error('Test error'));
    });

    it('should export logs as JSON lines', () => {
      const exported = logger.exportLogs();
      
      expect(exported).toBeDefined();
      expect(exported.length).toBeGreaterThan(0);
      
      const lines = exported.split('\n').filter(l => l.length > 0);
      expect(lines.length).toBeGreaterThan(0);
      
      const firstLog = JSON.parse(lines[0]);
      expect(firstLog.timestamp).toBeDefined();
      expect(firstLog.level).toBeDefined();
      expect(firstLog.message).toBeDefined();
    });

    it('should include error stack traces in export', () => {
      const exported = logger.exportLogs();
      const lines = exported.split('\n').filter(l => l.length > 0);
      
      const errorLog = lines.find(line => {
        const log = JSON.parse(line);
        return log.error !== undefined;
      });
      
      expect(errorLog).toBeDefined();
      const parsed = JSON.parse(errorLog!);
      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.stack).toBeDefined();
    });
  });
});

describe('generateRequestId', () => {
  it('should generate unique request IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^req_/);
    expect(id2).toMatch(/^req_/);
  });

  it('should generate IDs with consistent format', () => {
    const id = generateRequestId();
    
    expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
  });
});
