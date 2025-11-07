/**
 * Comprehensive error handling utilities with user-friendly messages and recovery mechanisms
 * Addresses Requirements 2.5 and 5.5
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  actionableSteps: string[];
  technicalDetails?: string;
  retryable: boolean;
  errorCode: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export interface NetworkErrorContext {
  operation: string;
  url?: string;
  method?: string;
  statusCode?: number;
  attempt?: number;
  maxAttempts?: number;
}

/**
 * Default retry configuration for network operations
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'SERVER_ERROR',
    'RATE_LIMIT',
    'GITHUB_API_ERROR'
  ]
};

/**
 * Converts technical errors into user-friendly error messages with actionable guidance
 */
export class ErrorMessageFormatter {
  /**
   * Format GitHub API errors with actionable guidance
   */
  static formatGitHubError(error: any, context?: NetworkErrorContext): UserFriendlyError {
    const statusCode = error.status || error.statusCode || context?.statusCode;

    // Rate limiting
    if (statusCode === 429 || error.message?.includes('rate limit')) {
      return {
        title: 'GitHub API Rate Limit Exceeded',
        message: 'You have made too many requests to GitHub. Please wait a moment before trying again.',
        actionableSteps: [
          'Wait for 1-2 minutes before retrying',
          'If this persists, check your GitHub API rate limit status',
          'Consider reducing the frequency of operations'
        ],
        technicalDetails: error.message,
        retryable: true,
        errorCode: 'RATE_LIMIT',
        severity: 'medium'
      };
    }

    // Authentication errors
    if (statusCode === 401 || error.message?.includes('authentication') || error.message?.includes('Unauthorized')) {
      return {
        title: 'Authentication Failed',
        message: 'Your GitHub authentication has expired or is invalid.',
        actionableSteps: [
          'Log out and log back in to refresh your authentication',
          'Check that you have granted the necessary permissions',
          'Verify your GitHub account is active'
        ],
        technicalDetails: error.message,
        retryable: false,
        errorCode: 'AUTH_FAILED',
        severity: 'high'
      };
    }

    // Permission errors
    if (statusCode === 403 || error.message?.includes('permission') || error.message?.includes('Forbidden')) {
      return {
        title: 'Access Denied',
        message: 'You do not have permission to perform this operation on the repository.',
        actionableSteps: [
          'Verify you have write access to the repository',
          'Contact the repository owner to request access',
          'Check if the repository is archived or locked'
        ],
        technicalDetails: error.message,
        retryable: false,
        errorCode: 'ACCESS_DENIED',
        severity: 'high'
      };
    }

    // Not found errors
    if (statusCode === 404 || error.message?.includes('not found') || error.message?.includes('Not found')) {
      return {
        title: 'Resource Not Found',
        message: 'The requested repository, file, or resource could not be found.',
        actionableSteps: [
          'Verify the repository name and owner are correct',
          'Check that the file path exists in the repository',
          'Ensure the branch name is correct',
          'Confirm you have access to view this resource'
        ],
        technicalDetails: error.message,
        retryable: false,
        errorCode: 'NOT_FOUND',
        severity: 'medium'
      };
    }

    // Server errors
    if (statusCode && statusCode >= 500) {
      return {
        title: 'GitHub Service Unavailable',
        message: 'GitHub is experiencing technical difficulties. This is temporary and will be resolved soon.',
        actionableSteps: [
          'Wait a few minutes and try again',
          'Check GitHub status at status.github.com',
          'Your changes have been saved and will be retried automatically'
        ],
        technicalDetails: error.message,
        retryable: true,
        errorCode: 'SERVER_ERROR',
        severity: 'medium'
      };
    }

    // Validation errors
    if (statusCode === 422 || error.message?.includes('validation')) {
      return {
        title: 'Invalid Request',
        message: 'The data you submitted could not be processed due to validation errors.',
        actionableSteps: [
          'Review the error details below',
          'Correct the highlighted issues',
          'Try submitting again'
        ],
        technicalDetails: error.message,
        retryable: false,
        errorCode: 'VALIDATION_FAILED',
        severity: 'low'
      };
    }

    // Generic GitHub error
    return {
      title: 'GitHub Operation Failed',
      message: 'An error occurred while communicating with GitHub.',
      actionableSteps: [
        'Check your internet connection',
        'Try the operation again',
        'If the problem persists, contact support'
      ],
      technicalDetails: error.message || String(error),
      retryable: true,
      errorCode: 'GITHUB_API_ERROR',
      severity: 'medium'
    };
  }

  /**
   * Format translation validation errors with specific guidance
   */
  static formatValidationError(errors: string[], context?: { format?: string; field?: string }): UserFriendlyError {
    const errorList = errors.join('; ');
    
    return {
      title: 'Translation Validation Failed',
      message: 'Your translation contains errors that need to be corrected before submission.',
      actionableSteps: [
        'Review the validation errors listed below',
        context?.format ? `Ensure your translation follows the ${context.format} format` : 'Check the format of your translation',
        'Correct any syntax errors or missing required fields',
        'Verify all placeholders match the source text',
        'Try submitting again after making corrections'
      ],
      technicalDetails: errorList,
      retryable: false,
      errorCode: 'VALIDATION_ERROR',
      severity: 'low'
    };
  }

  /**
   * Format commit failure errors with retry guidance (Requirement 2.5)
   */
  static formatCommitError(error: any, context?: { attempt?: number; maxAttempts?: number }): UserFriendlyError {
    const attempt = context?.attempt || 1;
    const maxAttempts = context?.maxAttempts || 3;
    const canRetry = attempt < maxAttempts;

    return {
      title: 'Failed to Commit Translation',
      message: canRetry 
        ? `Your translation could not be committed (attempt ${attempt} of ${maxAttempts}). The system will automatically retry.`
        : `Your translation could not be committed after ${maxAttempts} attempts.`,
      actionableSteps: canRetry ? [
        'The system is automatically retrying the commit',
        'Please wait a moment...',
        'You can continue working on other translations'
      ] : [
        'Click the "Retry" button to try again',
        'Check your internet connection',
        'Verify you still have write access to the repository',
        'If the problem persists, save your work and contact support'
      ],
      technicalDetails: error.message || String(error),
      retryable: true,
      errorCode: 'COMMIT_FAILED',
      severity: canRetry ? 'medium' : 'high'
    };
  }

  /**
   * Format network errors with recovery guidance
   */
  static formatNetworkError(error: any, context?: NetworkErrorContext): UserFriendlyError {
    const isTimeout = error.message?.includes('timeout') || error.code === 'ETIMEDOUT';
    const isConnectionError = error.message?.includes('ECONNREFUSED') || 
                             error.message?.includes('ENOTFOUND') ||
                             error.code === 'ECONNREFUSED' ||
                             error.code === 'ENOTFOUND';

    if (isTimeout) {
      return {
        title: 'Request Timed Out',
        message: 'The operation took too long to complete.',
        actionableSteps: [
          'Check your internet connection',
          'Try again in a moment',
          'If on a slow connection, consider working on smaller batches'
        ],
        technicalDetails: error.message,
        retryable: true,
        errorCode: 'TIMEOUT',
        severity: 'medium'
      };
    }

    if (isConnectionError) {
      return {
        title: 'Connection Failed',
        message: 'Could not connect to the server. Please check your internet connection.',
        actionableSteps: [
          'Verify you are connected to the internet',
          'Check if you can access other websites',
          'Try disabling VPN or proxy if you are using one',
          'Wait a moment and try again'
        ],
        technicalDetails: error.message,
        retryable: true,
        errorCode: 'NETWORK_ERROR',
        severity: 'high'
      };
    }

    return {
      title: 'Network Error',
      message: 'A network error occurred while performing the operation.',
      actionableSteps: [
        'Check your internet connection',
        'Try the operation again',
        'If the problem persists, check your network settings'
      ],
      technicalDetails: error.message || String(error),
      retryable: true,
      errorCode: 'NETWORK_ERROR',
      severity: 'medium'
    };
  }

  /**
   * Format configuration errors with setup guidance
   */
  static formatConfigError(error: any): UserFriendlyError {
    return {
      title: 'Configuration Error',
      message: 'The repository configuration file is missing or invalid.',
      actionableSteps: [
        'Ensure .i18n-platform.toml exists in the repository root',
        'Verify the TOML syntax is correct',
        'Check that all required fields are present',
        'Refer to the documentation for configuration examples'
      ],
      technicalDetails: error.message || String(error),
      retryable: false,
      errorCode: 'INVALID_CONFIG',
      severity: 'high'
    };
  }

  /**
   * Format generic errors with basic guidance
   */
  static formatGenericError(error: any): UserFriendlyError {
    return {
      title: 'An Error Occurred',
      message: 'An unexpected error occurred while processing your request.',
      actionableSteps: [
        'Try the operation again',
        'If the problem persists, refresh the page',
        'Contact support if you continue to experience issues'
      ],
      technicalDetails: error.message || String(error),
      retryable: true,
      errorCode: 'INTERNAL_ERROR',
      severity: 'medium'
    };
  }

  /**
   * Main error formatting method that routes to specific formatters
   */
  static format(error: any, context?: NetworkErrorContext): UserFriendlyError {
    // Check error type or code
    if (error.code === 'VALIDATION_ERROR' || error.name === 'ValidationError') {
      return this.formatValidationError(
        Array.isArray(error.details) ? error.details : [error.message]
      );
    }

    if (error.code === 'COMMIT_FAILED' || error.message?.includes('commit')) {
      return this.formatCommitError(error, context);
    }

    if (error.code === 'INVALID_CONFIG' || error.code === 'CONFIG_NOT_FOUND') {
      return this.formatConfigError(error);
    }

    if (error.code === 'NETWORK_ERROR' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      return this.formatNetworkError(error, context);
    }

    // GitHub-related errors
    if (error.status || error.statusCode || error.message?.includes('GitHub')) {
      return this.formatGitHubError(error, context);
    }

    // Default to generic error
    return this.formatGenericError(error);
  }
}

/**
 * Retry mechanism with exponential backoff for network operations
 */
export class RetryHandler {
  /**
   * Execute an operation with automatic retry on failure
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    context?: NetworkErrorContext
  ): Promise<T> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: any;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        const errorCode = error.code || error.name || 'UNKNOWN';
        const isRetryable = config.retryableErrors?.includes(errorCode) || 
                           error.retryable === true ||
                           this.isNetworkError(error);

        // Don't retry if not retryable or last attempt
        if (!isRetryable || attempt >= config.maxAttempts) {
          throw error;
        }

        // Log retry attempt
        console.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms...`, {
          error: error.message,
          context,
          attempt
        });

        // Wait before retrying
        await this.delay(delay);

        // Increase delay for next attempt (exponential backoff)
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Check if an error is a network-related error
   */
  private static isNetworkError(error: any): boolean {
    const networkErrorCodes = [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ECONNRESET',
      'EPIPE',
      'NETWORK_ERROR'
    ];

    const networkErrorMessages = [
      'network',
      'timeout',
      'connection',
      'ECONNREFUSED',
      'ENOTFOUND',
      'fetch failed'
    ];

    // Check error code
    if (error.code && networkErrorCodes.includes(error.code)) {
      return true;
    }

    // Check error message
    if (error.message) {
      const message = error.message.toLowerCase();
      return networkErrorMessages.some(keyword => message.includes(keyword));
    }

    // Check HTTP status codes that indicate temporary failures
    const status = error.status || error.statusCode;
    if (status && (status === 429 || status >= 500)) {
      return true;
    }

    return false;
  }

  /**
   * Utility method for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error recovery strategies for different error types
 */
export class ErrorRecoveryStrategy {
  /**
   * Attempt to recover from a commit failure
   */
  static async recoverFromCommitFailure<T>(
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    try {
      return await RetryHandler.withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 2000,
        retryableErrors: ['COMMIT_FAILED', 'NETWORK_ERROR', 'SERVER_ERROR']
      });
    } catch (error) {
      // If retry fails and fallback is provided, try fallback
      if (fallbackOperation) {
        console.warn('Primary operation failed, attempting fallback...', error);
        return await fallbackOperation();
      }
      throw error;
    }
  }

  /**
   * Attempt to recover from network failures
   */
  static async recoverFromNetworkFailure<T>(
    operation: () => Promise<T>,
    options?: {
      maxAttempts?: number;
      onRetry?: (attempt: number, error: any) => void;
    }
  ): Promise<T> {
    return await RetryHandler.withRetry(
      operation,
      {
        maxAttempts: options?.maxAttempts || 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR', 'RATE_LIMIT']
      }
    );
  }

  /**
   * Attempt to recover from rate limiting
   */
  static async recoverFromRateLimit<T>(
    operation: () => Promise<T>,
    resetTime?: Date
  ): Promise<T> {
    // If reset time is provided, wait until then
    if (resetTime) {
      const waitTime = resetTime.getTime() - Date.now();
      if (waitTime > 0 && waitTime < 60000) { // Wait up to 1 minute
        console.log(`Rate limited. Waiting ${Math.round(waitTime / 1000)}s until reset...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    return await RetryHandler.withRetry(operation, {
      maxAttempts: 2,
      initialDelay: 5000,
      retryableErrors: ['RATE_LIMIT']
    });
  }
}
