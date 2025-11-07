/**
 * OpenTelemetry setup using Hono's middleware
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import { trace, metrics } from '@opentelemetry/api';

// Initialize OpenTelemetry SDK
export function initializeTelemetry() {
  const serviceName = 'i18n-platform';
  const serviceVersion = process.env.npm_package_version || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  // Create resource with service information
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
  });

  // Configure trace exporter
  const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT 
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      })
    : new OTLPTraceExporter(); // Uses default endpoint

  // Initialize SDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
  });

  // Start the SDK
  sdk.start();

  console.log(`OpenTelemetry initialized for ${serviceName} v${serviceVersion} (${environment})`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Traces will be exported to:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'default OTLP endpoint');
  }

  return sdk;
}

// Custom telemetry helpers for business metrics
export class TelemetryService {
  private tracer = trace.getTracer('i18n-platform');
  private meter = metrics.getMeter('i18n-platform');

  // Custom counters and histograms for business metrics
  private authCounter = this.meter.createCounter('auth_events_total', {
    description: 'Total number of authentication events',
  });

  private translationCounter = this.meter.createCounter('translation_operations_total', {
    description: 'Total number of translation operations',
  });

  private githubApiCounter = this.meter.createCounter('github_api_calls_total', {
    description: 'Total number of GitHub API calls',
  });

  private projectCounter = this.meter.createCounter('project_operations_total', {
    description: 'Total number of project operations',
  });

  private errorCounter = this.meter.createCounter('business_errors_total', {
    description: 'Total number of business logic errors',
  });

  /**
   * Create a new span for tracing operations
   */
  createSpan(name: string, attributes?: Record<string, string | number | boolean>) {
    return this.tracer.startSpan(name, {
      attributes,
    });
  }

  /**
   * Record authentication events
   */
  recordAuth(event: 'login' | 'logout' | 'token_refresh' | 'auth_failure', userId?: string, success: boolean = true) {
    this.authCounter.add(1, {
      event,
      user_id: userId || 'unknown',
      success: success.toString(),
    });
  }

  /**
   * Record translation operations
   */
  recordTranslation(operation: 'submit' | 'commit' | 'validate' | 'extract', projectId: string, language: string, success: boolean) {
    this.translationCounter.add(1, {
      operation,
      project_id: projectId,
      language,
      success: success.toString(),
    });
  }

  /**
   * Record GitHub API calls
   */
  recordGitHubAPI(operation: string, success: boolean, statusCode?: number) {
    this.githubApiCounter.add(1, {
      operation,
      success: success.toString(),
      status_code: statusCode?.toString() || 'unknown',
    });
  }

  /**
   * Record project operations
   */
  recordProject(operation: 'discover' | 'get' | 'update' | 'refresh' | 'validate_access', projectId?: string, success: boolean = true) {
    this.projectCounter.add(1, {
      operation,
      project_id: projectId || 'unknown',
      success: success.toString(),
    });
  }

  /**
   * Record business logic errors
   */
  recordError(errorType: 'validation' | 'authentication' | 'authorization' | 'github_api' | 'not_found' | 'internal', context?: Record<string, string>) {
    this.errorCounter.add(1, {
      error_type: errorType,
      ...context,
    });
  }

  /**
   * Create a traced function wrapper
   */
  traced<T extends (...args: any[]) => any>(name: string, fn: T, attributes?: Record<string, string | number | boolean>): T {
    return ((...args: any[]) => {
      const span = this.createSpan(name, attributes);
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result
            .then((value: any) => {
              span.setStatus({ code: 1 }); // OK
              span.end();
              return value;
            })
            .catch((error: any) => {
              span.recordException(error);
              span.setStatus({ code: 2, message: error.message }); // ERROR
              span.end();
              throw error;
            });
        }
        
        // Handle synchronous functions
        span.setStatus({ code: 1 }); // OK
        span.end();
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
        span.end();
        throw error;
      }
    }) as T;
  }
}

// Global telemetry service instance
export const telemetry = new TelemetryService();

/**
 * Graceful shutdown handler for OpenTelemetry
 */
export function setupTelemetryShutdown(sdk: NodeSDK) {
  const shutdown = async () => {
    console.log('Shutting down OpenTelemetry...');
    try {
      await sdk.shutdown();
      console.log('OpenTelemetry shut down successfully');
    } catch (error) {
      console.error('Error shutting down OpenTelemetry:', error);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('exit', shutdown);
}

/**
 * Hono instrumentation configuration
 */
export const instrumentationConfig = {
  serviceName: 'i18n-platform',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  captureRequestHeaders: ['user-agent', 'authorization', 'x-forwarded-for'],
  captureResponseHeaders: ['content-type', 'x-request-id'],
  ignoreIncomingRequestHook: (req: Request) => {
    // Ignore health check and metrics endpoints from tracing
    const url = new URL(req.url);
    return url.pathname === '/health' || 
           url.pathname === '/ready' || 
           url.pathname === '/metrics';
  },
};
