# OpenTelemetry Integration

This directory contains the OpenTelemetry setup for comprehensive monitoring and observability of the I18n Platform API.

## Features

- **Automatic HTTP instrumentation** using Hono's OpenTelemetry middleware
- **Custom business metrics** for authentication, projects, translations, and GitHub API calls
- **Distributed tracing** with span creation and error recording
- **OTLP export** for integration with observability platforms

## Configuration

Set the following environment variables to configure telemetry:

```bash
# OpenTelemetry exporter endpoint (optional, defaults to OTLP standard)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Service information
npm_package_version=1.0.0
NODE_ENV=production
```

## Usage

The telemetry service is automatically initialized when the Hono server starts. It provides:

### Automatic Instrumentation
- HTTP requests and responses
- Request duration and status codes
- Error tracking and span recording

### Business Metrics
- Authentication events (login, logout, token refresh, failures)
- Project operations (discover, get, update, refresh, validate access)
- Translation operations (submit, commit, validate, extract)
- GitHub API calls with success/failure tracking
- Error categorization (validation, authentication, authorization, etc.)

### Custom Tracing
```typescript
import { telemetry } from '../telemetry/setup.js';

// Create custom spans
const span = telemetry.createSpan('custom.operation', { key: 'value' });
// ... do work
span.end();

// Wrap functions with tracing
const tracedFunction = telemetry.traced('function.name', async () => {
  // ... function implementation
});
```

## Monitoring Endpoints

The following endpoints are available for monitoring:

- `GET /health` - Basic health check with system status
- `GET /health/detailed` - Detailed health check with metrics and memory usage
- `GET /metrics` - Request metrics and performance data
- `GET /ready` - Readiness probe for container orchestration

## Integration with Observability Platforms

This setup is compatible with:
- **Jaeger** for distributed tracing
- **Prometheus** for metrics collection
- **Grafana** for visualization
- **OpenTelemetry Collector** for data processing
- **Cloud providers** (AWS X-Ray, Google Cloud Trace, Azure Monitor)

## Development

In development mode, traces are logged to the console. For production, configure an appropriate OTLP endpoint to send telemetry data to your observability platform.