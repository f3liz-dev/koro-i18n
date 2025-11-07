/**
 * Middleware to convert technical errors into user-friendly error responses
 * Addresses Requirements 2.5 and 5.5
 */

import type { Context, Next } from 'hono';
import { ErrorMessageFormatter, type UserFriendlyError } from '@/lib/utils/error-handler.js';
import { logger } from '../services/LoggingService.js';

export interface UserFriendlyErrorResponse {
  error: {
    title: string;
    message: string;
    actionableSteps: string[];
    errorCode: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    retryable: boolean;
    technicalDetails?: string;
    requestId?: string;
    timestamp: string;
  };
}

/**
 * Middleware to format errors into user-friendly responses
 */
export function userFriendlyErrorMiddleware() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error: any) {
      const requestId = c.get('requestId');
      
      // Get context information
      const context = {
        operation: `${c.req.method} ${c.req.path}`,
        method: c.req.method,
        url: c.req.url,
        statusCode: error.status || error.statusCode,
        attempt: error.attempt,
        maxAttempts: error.maxAttempts
      };

      // Format error into user-friendly message
      const userFriendlyError: UserFriendlyError = ErrorMessageFormatter.format(error, context);

      // Log the error with appropriate level
      if (userFriendlyError.severity === 'critical' || userFriendlyError.severity === 'high') {
        logger.error(
          `${userFriendlyError.title}: ${userFriendlyError.message}`,
          error,
          { ...context, errorCode: userFriendlyError.errorCode },
          requestId
        );
      } else {
        logger.warn(
          `${userFriendlyError.title}: ${userFriendlyError.message}`,
          { ...context, errorCode: userFriendlyError.errorCode },
          requestId
        );
      }

      // Determine HTTP status code
      const statusCode = error.status || error.statusCode || 
                        (userFriendlyError.errorCode === 'VALIDATION_ERROR' ? 400 :
                         userFriendlyError.errorCode === 'AUTH_FAILED' ? 401 :
                         userFriendlyError.errorCode === 'ACCESS_DENIED' ? 403 :
                         userFriendlyError.errorCode === 'NOT_FOUND' ? 404 :
                         userFriendlyError.errorCode === 'RATE_LIMIT' ? 429 :
                         userFriendlyError.errorCode === 'SERVER_ERROR' ? 503 :
                         500);

      // Build response
      const response: UserFriendlyErrorResponse = {
        error: {
          title: userFriendlyError.title,
          message: userFriendlyError.message,
          actionableSteps: userFriendlyError.actionableSteps,
          errorCode: userFriendlyError.errorCode,
          severity: userFriendlyError.severity,
          retryable: userFriendlyError.retryable,
          technicalDetails: process.env.NODE_ENV === 'development' ? userFriendlyError.technicalDetails : undefined,
          requestId,
          timestamp: new Date().toISOString()
        }
      };

      // Add retry-after header for rate limiting
      if (userFriendlyError.errorCode === 'RATE_LIMIT') {
        c.header('Retry-After', '60');
      }

      return c.json(response, statusCode);
    }
  };
}

/**
 * Helper to create user-friendly validation error responses
 */
export function createValidationErrorResponse(
  errors: Array<{ field: string; message: string }>,
  requestId?: string
): UserFriendlyErrorResponse {
  const errorMessages = errors.map(e => `${e.field}: ${e.message}`);
  const userFriendlyError = ErrorMessageFormatter.formatValidationError(errorMessages);

  return {
    error: {
      title: userFriendlyError.title,
      message: userFriendlyError.message,
      actionableSteps: userFriendlyError.actionableSteps,
      errorCode: userFriendlyError.errorCode,
      severity: userFriendlyError.severity,
      retryable: userFriendlyError.retryable,
      technicalDetails: process.env.NODE_ENV === 'development' ? userFriendlyError.technicalDetails : undefined,
      requestId,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Helper to create commit failure error responses (Requirement 2.5)
 */
export function createCommitFailureResponse(
  error: any,
  attempt: number,
  maxAttempts: number,
  requestId?: string
): UserFriendlyErrorResponse {
  const userFriendlyError = ErrorMessageFormatter.formatCommitError(error, { attempt, maxAttempts });

  return {
    error: {
      title: userFriendlyError.title,
      message: userFriendlyError.message,
      actionableSteps: userFriendlyError.actionableSteps,
      errorCode: userFriendlyError.errorCode,
      severity: userFriendlyError.severity,
      retryable: userFriendlyError.retryable,
      technicalDetails: process.env.NODE_ENV === 'development' ? userFriendlyError.technicalDetails : undefined,
      requestId,
      timestamp: new Date().toISOString()
    }
  };
}
