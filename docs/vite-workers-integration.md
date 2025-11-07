# Vite + Cloudflare Workers Integration

This document explains how the I18n Platform uses Vite with the official Cloudflare Vite plugin for optimized Workers deployment.

## Overview

The integration provides:
- **Fast Development**: Hot reload and instant updates during development
- **Optimized Builds**: Tree shaking, minification, and bundle optimization
- **TypeScript Support**: Native TypeScript compilation without separate build steps
- **Source Maps**: Full debugging support in both development and production
- **Modern JavaScript**: ES modules and latest JavaScript features

## Configuration

### Vite Configuration (`vite.config.workers.ts`)

```typescript
import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [
    cloudflare({
      persist: {
        path: '.wrangler/state' // Local development persistence
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src',
      '@/shared': '/src/shared',
      '@/backend': '/src/backend',
      '@/workers': '/src/workers'
    }
  },
  define: {
    global: 'globalThis' // Workers environment compatibility
  },
  optimizeDeps: {
    exclude: ['@cloudflare/workers-types']
  },
  esbuild: {
    keepNames: true,
    sourcemap: true
  }
});
```

### Wrangler Configuration (`wrangler.toml`)

```toml
name = "i18n-platform"
main = "dist/i18n_platform/index.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat_v2"]

# Environment variables
[vars]
ENVIRONMENT = "production"
CORS_ORIGINS = "https://i18n-platform.pages.dev"

# KV Namespaces
[[kv_namespaces]]
binding = "SESSIONS"
id = "sessions_kv_namespace"

[[kv_namespaces]]
binding = "TRANSLATIONS"
id = "translations_kv_namespace"
```

## Development Workflow

### 1. Local Development

```bash
# Start Vite development server with hot reload
npm run dev:workers:vite

# Or use Wrangler for full Workers environment simulation
npm run dev:workers
```

**Vite Dev Server Benefits:**
- Instant hot reload on file changes
- Fast TypeScript compilation
- Source map support for debugging
- Module replacement without full restart

**Wrangler Dev Benefits:**
- Full Workers runtime simulation
- KV namespace access
- Environment variable handling
- Production-like behavior

### 2. Building for Production

```bash
# Build with Vite optimization
npm run build:workers
```

**Build Output:**
- `dist/i18n_platform/index.js` - Optimized Workers bundle
- `dist/i18n_platform/wrangler.json` - Wrangler configuration
- `dist/i18n_platform/.vite/manifest.json` - Build manifest

### 3. Deployment

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Or use deployment scripts
npm run deploy:workers
```

## Optimization Features

### Tree Shaking

Vite automatically removes unused code:

```typescript
// Only imported functions are included in the bundle
import { createWorkersApp } from './hono-workers-app';
import { CloudflareSessionStore } from './services/CloudflareSessionStore';

// Unused imports are automatically removed
```

### Code Splitting

Vite handles dynamic imports for optimal loading:

```typescript
// Dynamic imports for conditional loading
const { createProjectRoutes } = await import('../backend/api/projects');
```

### Minification

Production builds are automatically minified:
- **Terser**: JavaScript minification and optimization
- **Dead Code Elimination**: Removes unreachable code
- **Variable Mangling**: Shortens variable names

### Source Maps

Full source map support for debugging:
- Development: Inline source maps for instant debugging
- Production: Separate source map files for error tracking

## TypeScript Integration

### Automatic Compilation

No separate TypeScript build step required:

```typescript
// TypeScript files are compiled automatically
import type { Env } from './index';
import { Hono } from 'hono';

export function createWorkersApp(env: Env) {
  const app = new Hono<{ Variables: WorkersAppVariables }>();
  // TypeScript types are preserved and checked
  return app;
}
```

### Type Checking

Vite provides fast type checking:

```bash
# Type check without building
npm run type-check

# Build with type checking
npm run build:workers
```

### Path Aliases

Configured path aliases for clean imports:

```typescript
// Instead of relative paths
import { AuthService } from '../../../backend/services/AuthService';

// Use clean aliases
import { AuthService } from '@/backend/services/AuthService';
```

## Environment Handling

### Development vs Production

```typescript
// Environment-specific configuration
const corsOrigins = env.ENVIRONMENT === 'development' 
  ? ['http://localhost:5173', 'http://localhost:3000']
  : ['https://i18n-platform.pages.dev'];
```

### Environment Variables

Vite handles environment variables through Wrangler:

```typescript
export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  SESSIONS: KVNamespace;
  TRANSLATIONS: KVNamespace;
}
```

## Performance Optimizations

### Bundle Analysis

Analyze bundle size and dependencies:

```bash
# Build with bundle analysis
npm run build:workers -- --analyze
```

### Lazy Loading

Implement lazy loading for better performance:

```typescript
// Lazy load heavy dependencies
const heavyModule = await import('./heavy-module');
```

### Caching Strategy

Vite optimizes caching:
- **Build Cache**: Faster subsequent builds
- **Dependency Cache**: Cached node_modules processing
- **Transform Cache**: Cached TypeScript compilation

## Debugging

### Development Debugging

1. **Browser DevTools**: Full source map support
2. **Console Logging**: Structured logging with context
3. **Network Tab**: Request/response inspection
4. **Breakpoints**: Set breakpoints in TypeScript source

### Production Debugging

1. **Wrangler Logs**: Real-time log streaming
2. **Error Tracking**: Source-mapped error traces
3. **Performance Monitoring**: Built-in metrics
4. **Health Checks**: Automated health monitoring

```bash
# Stream production logs
wrangler tail

# View deployment logs
wrangler deployments list
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear Vite cache
   rm -rf node_modules/.vite
   npm run build:workers
   ```

2. **Type Errors**
   ```bash
   # Check TypeScript configuration
   npx tsc --noEmit
   ```

3. **Import Resolution**
   ```bash
   # Verify path aliases in vite.config.workers.ts
   # Check file extensions (.ts vs .js)
   ```

4. **Workers Runtime Issues**
   ```bash
   # Test with Wrangler dev
   npm run dev:workers
   
   # Check compatibility flags
   # Verify Node.js compatibility settings
   ```

### Debug Commands

```bash
# Verbose build output
npm run build:workers -- --debug

# Check Wrangler configuration
wrangler whoami

# Validate wrangler.toml
wrangler validate

# Test local deployment
wrangler dev --local
```

## Best Practices

### 1. Code Organization

```
src/workers/
├── index.ts              # Entry point
├── hono-workers-app.ts   # Main application
├── services/             # Workers-specific services
│   ├── CloudflareSessionStore.ts
│   └── CloudflareUserRepository.ts
└── middleware/           # Workers middleware
    └── workers-error-handling.ts
```

### 2. Import Strategy

```typescript
// Use path aliases for cleaner imports
import { AuthService } from '@/backend/services/AuthService';

// Avoid deep relative imports
// import { AuthService } from '../../../backend/services/AuthService';
```

### 3. Environment Configuration

```typescript
// Centralize environment handling
const config = {
  isDevelopment: env.ENVIRONMENT === 'development',
  corsOrigins: env.CORS_ORIGINS?.split(',') || ['*'],
  githubConfig: {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET
  }
};
```

### 4. Error Handling

```typescript
// Implement comprehensive error handling
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      const app = createWorkersApp(env);
      return await app.fetch(request, env, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
} satisfies ExportedHandler<Env>;
```

## Migration from TypeScript Compilation

If migrating from direct TypeScript compilation:

1. **Remove TypeScript build configuration**:
   ```bash
   # Remove tsconfig.workers.json (optional)
   # Update package.json scripts
   ```

2. **Update import paths**:
   ```typescript
   // Remove .js extensions from imports
   import { AuthService } from './services/AuthService';
   ```

3. **Update deployment scripts**:
   ```bash
   # Change from tsc to vite build
   npm run build:workers
   ```

4. **Test thoroughly**:
   ```bash
   # Test development server
   npm run dev:workers:vite
   
   # Test production build
   npm run build:workers
   wrangler deploy --dry-run
   ```

## Next Steps

1. **Frontend Integration**: Deploy frontend to Cloudflare Pages
2. **CI/CD Pipeline**: Automate deployments with GitHub Actions
3. **Monitoring**: Set up error tracking and performance monitoring
4. **Optimization**: Implement advanced caching strategies
5. **Testing**: Add integration tests for Workers environment

For more information, see:
- [Cloudflare Vite Plugin Documentation](https://developers.cloudflare.com/workers/vite-plugin/)
- [Vite Documentation](https://vitejs.dev/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)