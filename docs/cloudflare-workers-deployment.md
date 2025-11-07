# Cloudflare Workers Deployment Guide

This guide covers deploying the I18n Platform to Cloudflare Workers for serverless operation.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally with `npm install -g wrangler`
3. **GitHub OAuth App**: Create at [GitHub Developer Settings](https://github.com/settings/applications/new)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 1.1. Vite Integration

The I18n Platform uses Vite with the official Cloudflare Vite plugin for optimized Workers deployment:

- **Fast builds**: Vite's optimized bundling for Workers runtime
- **Hot reload**: Development server with instant updates
- **TypeScript support**: Native TypeScript compilation
- **Tree shaking**: Automatic dead code elimination
- **Source maps**: Full debugging support

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Configure KV Namespaces

Create KV namespaces for session and translation storage:

```bash
# Create production namespaces
wrangler kv:namespace create "SESSIONS"
wrangler kv:namespace create "TRANSLATIONS"

# Create preview namespaces for development
wrangler kv:namespace create "SESSIONS" --preview
wrangler kv:namespace create "TRANSLATIONS" --preview
```

Update `wrangler.toml` with the returned namespace IDs.

### 4. Set Environment Secrets

Set required secrets for your deployment:

```bash
# GitHub OAuth credentials
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# JWT signing secret (generate with: openssl rand -base64 32)
wrangler secret put JWT_SECRET
```

### 5. Configure GitHub OAuth App

In your GitHub OAuth App settings:
- **Application name**: I18n Platform
- **Homepage URL**: `https://your-worker-domain.workers.dev`
- **Authorization callback URL**: `https://your-worker-domain.workers.dev/api/auth/callback`

## Deployment

### Quick Deploy

```bash
# Deploy to production
npm run deploy:workers

# Deploy to development
npm run deploy:workers:dev

# Deploy to staging
npm run deploy:workers:staging
```

### Manual Deploy

```bash
# Build the project with Vite
npm run build:workers

# Deploy to specific environment
wrangler deploy                    # production
wrangler deploy --env development  # development
wrangler deploy --env staging      # staging
```

### Development with Vite

```bash
# Start development server with Vite hot reload
npm run dev:workers:vite

# Or use Wrangler dev for full Workers environment
npm run dev:workers
```

## Environment Configuration

The platform supports three environments configured in `wrangler.toml`:

### Development
- **Name**: `i18n-platform-dev`
- **CORS Origins**: `http://localhost:5173,http://localhost:3000`
- **Purpose**: Local development and testing

### Staging
- **Name**: `i18n-platform-staging`
- **CORS Origins**: `https://staging.i18n-platform.pages.dev`
- **Purpose**: Pre-production testing

### Production
- **Name**: `i18n-platform`
- **CORS Origins**: `https://i18n-platform.pages.dev`
- **Purpose**: Live production environment

## Serverless Features

### Session Management
- Uses Cloudflare KV for serverless session storage
- Automatic TTL-based session expiry
- No server-side memory requirements

### User Storage
- KV-based user repository
- GitHub ID to User ID mapping
- Automatic data persistence

### Resource Optimization
- Stateless request handling
- Minimal cold start time
- Automatic scaling based on demand

## Monitoring and Debugging

### View Logs
```bash
wrangler tail                    # production logs
wrangler tail --env development  # development logs
```

### Health Checks
- **Health**: `GET /health` - Basic health status
- **Ready**: `GET /ready` - Readiness check

### Performance Monitoring
- Built-in request logging
- Error tracking and reporting
- Response time monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Ensure TypeScript compilation succeeds: `npm run build:workers`
   - Check for missing dependencies or type errors

2. **Authentication Errors**
   - Verify GitHub OAuth app configuration
   - Check that secrets are properly set: `wrangler secret list`
   - Ensure callback URL matches your worker domain

3. **KV Namespace Issues**
   - Verify namespace IDs in `wrangler.toml`
   - Ensure namespaces exist: `wrangler kv:namespace list`

4. **CORS Errors**
   - Update CORS_ORIGINS in `wrangler.toml`
   - Ensure frontend domain is included

### Debug Commands

```bash
# Check deployment status
wrangler deployments list

# View worker configuration
wrangler whoami

# Test locally
wrangler dev

# View KV data
wrangler kv:key list --binding SESSIONS
```

## Scaling and Performance

### Automatic Scaling
- Cloudflare Workers automatically scale based on demand
- No manual scaling configuration required
- Supports 100+ concurrent sessions as per requirements

### Performance Optimizations
- Minimal bundle size through tree-shaking
- Edge computing for global low latency
- KV storage optimized for read performance

### Resource Limits
- **CPU Time**: 50ms per request (Workers free tier)
- **Memory**: 128MB per request
- **KV Operations**: 1000 reads/writes per day (free tier)

## Security

### Built-in Security Features
- Automatic HTTPS/TLS encryption
- DDoS protection via Cloudflare
- Secure headers middleware
- CSRF protection

### Best Practices
- Rotate JWT secrets regularly
- Monitor access logs for suspicious activity
- Use environment-specific secrets
- Enable Cloudflare security features

## Cost Optimization

### Free Tier Limits
- **Requests**: 100,000 per day
- **CPU Time**: 10ms per request average
- **KV Storage**: 1GB
- **KV Operations**: 1000 per day

### Paid Features
- Increased request limits
- Longer CPU time allowance
- More KV operations
- Advanced analytics

## Next Steps

After successful deployment:

1. **Configure Domain**: Set up custom domain in Cloudflare dashboard
2. **Enable Analytics**: Monitor usage and performance
3. **Set up Alerts**: Configure notifications for errors or limits
4. **Frontend Deployment**: Deploy frontend to Cloudflare Pages
5. **CI/CD Integration**: Automate deployments with GitHub Actions

For more information, see the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/).