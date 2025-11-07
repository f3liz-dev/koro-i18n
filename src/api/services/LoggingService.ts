/**
 * Comprehensive logging service for monitoring and debugging
 */

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  duration?: number;
}

export interface LogFilter {
  level?: LogEntry['level'];
  startTime?: Date;
  endTime?: Date;
  userId?: string;
  path?: string;
  method?: string;
}

/**
 * In-memory logging service with structured logging
 * In production, this should be replaced with external logging service
 */
export class LoggingService {
  private logs: LogEntry[] = [];
  private readonly maxEntries = 10000;
  private readonly logLevel: LogEntry['level'];

  constructor(logLevel: LogEntry['level'] = 'info') {
    this.logLevel = logLevel;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>, requestId?: string) {
    this.log('debug', message, context, undefined, requestId);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>, requestId?: string) {
    this.log('info', message, context, undefined, requestId);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>, requestId?: string) {
    this.log('warn', message, context, undefined, requestId);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>, requestId?: string) {
    this.log('error', message, context, error, requestId);
  }

  /**
   * Log network failure with retry information
   */
  logNetworkFailure(operation: string, error: Error, attempt: number, maxAttempts: number, willRetry: boolean, requestId?: string) {
    this.log('warn', `Network failure during ${operation} (attempt ${attempt}/${maxAttempts})`, {
      operation,
      attempt,
      maxAttempts,
      willRetry,
      errorCode: (error as any).code,
      errorMessage: error.message
    }, error, requestId);
  }

  /**
   * Log commit failure with recovery information (Requirement 2.5)
   */
  logCommitFailure(projectId: string, language: string, error: Error, attempt: number, maxAttempts: number, requestId?: string) {
    this.log('error', `Commit failed for ${projectId}/${language} (attempt ${attempt}/${maxAttempts})`, {
      projectId,
      language,
      attempt,
      maxAttempts,
      errorCode: (error as any).code,
      errorMessage: error.message,
      willRetry: attempt < maxAttempts
    }, error, requestId);
  }

  /**
   * Log validation failure with detailed error information (Requirement 5.5)
   */
  logValidationFailure(field: string, errors: string[], context?: Record<string, any>, requestId?: string) {
    this.log('warn', `Validation failed for ${field}`, {
      field,
      errors,
      errorCount: errors.length,
      ...context
    }, undefined, requestId);
  }

  /**
   * Log error recovery attempt
   */
  logRecoveryAttempt(operation: string, strategy: string, success: boolean, context?: Record<string, any>, requestId?: string) {
    const level = success ? 'info' : 'warn';
    this.log(level, `Recovery ${success ? 'succeeded' : 'failed'} for ${operation} using ${strategy}`, {
      operation,
      strategy,
      success,
      ...context
    }, undefined, requestId);
  }

  /**
   * Log API request
   */
  logRequest(method: string, path: string, statusCode: number, duration: number, userId?: string, requestId?: string) {
    this.log('info', `${method} ${path} - ${statusCode} (${duration}ms)`, {
      method,
      path,
      statusCode,
      duration,
      userId
    }, undefined, requestId);
  }

  /**
   * Log authentication event
   */
  logAuth(event: 'login' | 'logout' | 'token_refresh' | 'auth_failure', userId?: string, context?: Record<string, any>, requestId?: string) {
    this.log('info', `Authentication event: ${event}`, {
      event,
      userId,
      ...context
    }, undefined, requestId);
  }

  /**
   * Log GitHub API interaction
   */
  logGitHubAPI(operation: string, success: boolean, duration: number, context?: Record<string, any>, requestId?: string) {
    const level = success ? 'info' : 'warn';
    this.log(level, `GitHub API: ${operation} - ${success ? 'success' : 'failed'} (${duration}ms)`, {
      operation,
      success,
      duration,
      ...context
    }, undefined, requestId);
  }

  /**
   * Log translation operation
   */
  logTranslation(operation: 'submit' | 'commit' | 'validate', projectId: string, language: string, success: boolean, context?: Record<string, any>, requestId?: string) {
    const level = success ? 'info' : 'warn';
    this.log(level, `Translation ${operation}: ${projectId}/${language} - ${success ? 'success' : 'failed'}`, {
      operation,
      projectId,
      language,
      success,
      ...context
    }, undefined, requestId);
  }

  /**
   * Get logs with optional filtering
   */
  getLogs(filter?: LogFilter, limit: number = 100): LogEntry[] {
    let filteredLogs = this.logs;

    if (filter) {
      filteredLogs = this.logs.filter(log => {
        if (filter.level && !this.isLevelIncluded(log.level, filter.level)) {
          return false;
        }
        if (filter.startTime && log.timestamp < filter.startTime) {
          return false;
        }
        if (filter.endTime && log.timestamp > filter.endTime) {
          return false;
        }
        if (filter.userId && log.userId !== filter.userId) {
          return false;
        }
        if (filter.path && log.path !== filter.path) {
          return false;
        }
        if (filter.method && log.method !== filter.method) {
          return false;
        }
        return true;
      });
    }

    return filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get log statistics
   */
  getStats(timeWindow: number = 3600000): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    errorRate: number;
    topErrors: Array<{ message: string; count: number }>;
    recentActivity: Array<{ timestamp: Date; level: string; message: string }>;
  } {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentLogs = this.logs.filter(log => log.timestamp >= cutoff);

    const logsByLevel: Record<string, number> = {};
    const errorMessages: Record<string, number> = {};

    recentLogs.forEach(log => {
      logsByLevel[log.level] = (logsByLevel[log.level] || 0) + 1;
      
      if (log.level === 'error') {
        errorMessages[log.message] = (errorMessages[log.message] || 0) + 1;
      }
    });

    const totalLogs = recentLogs.length;
    const errorCount = logsByLevel.error || 0;
    const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;

    const topErrors = Object.entries(errorMessages)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentActivity = recentLogs
      .slice(0, 10)
      .map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message
      }));

    return {
      totalLogs,
      logsByLevel,
      errorRate: Math.round(errorRate * 100) / 100,
      topErrors,
      recentActivity
    };
  }

  /**
   * Clear old logs to prevent memory issues
   */
  cleanup(): void {
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.maxEntries);
    }
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(filter?: LogFilter): string {
    const logs = this.getLogs(filter, 10000);
    return logs.map(log => {
      const logLine = {
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message,
        context: log.context,
        error: log.error ? {
          message: log.error.message,
          stack: log.error.stack
        } : undefined,
        userId: log.userId,
        requestId: log.requestId,
        path: log.path,
        method: log.method,
        duration: log.duration
      };
      return JSON.stringify(logLine);
    }).join('\n');
  }

  /**
   * Internal logging method
   */
  private log(level: LogEntry['level'], message: string, context?: Record<string, any>, error?: Error, requestId?: string) {
    // Check if log level should be recorded
    if (!this.isLevelIncluded(level, this.logLevel)) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
      requestId,
      userId: context?.userId,
      path: context?.path,
      method: context?.method,
      duration: context?.duration
    };

    this.logs.push(logEntry);

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? console.error : 
                           level === 'warn' ? console.warn : 
                           level === 'debug' ? console.debug : console.log;
      
      consoleMethod(`[${level.toUpperCase()}] ${message}`, context ? JSON.stringify(context, null, 2) : '');
      
      if (error) {
        console.error('Error details:', error);
      }
    }

    // Cleanup periodically
    if (this.logs.length % 1000 === 0) {
      this.cleanup();
    }
  }

  /**
   * Check if log level should be included based on configured level
   */
  private isLevelIncluded(logLevel: LogEntry['level'], configuredLevel: LogEntry['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const logLevelIndex = levels.indexOf(logLevel);
    const configuredLevelIndex = levels.indexOf(configuredLevel);
    
    return logLevelIndex >= configuredLevelIndex;
  }
}

// Global logging service instance
export const logger = new LoggingService(
  (process.env.LOG_LEVEL as LogEntry['level']) || 'info'
);

/**
 * Create request ID for tracing requests across services
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Middleware to add request ID to context
 */
export function createRequestIdMiddleware() {
  return async (c: any, next: any) => {
    const requestId = generateRequestId();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    await next();
  };
}