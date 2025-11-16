# Backend Deployment Guide

Complete guide for deploying the koro-i18n backend to Cloudflare Workers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Database Setup](#database-setup)
- [Storage Setup](#storage-setup)
- [Authentication Setup](#authentication-setup)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Updating](#updating)
- [Rollback](#rollback)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

1. **Cloudflare Account** with:
   - Workers enabled (Free or Paid plan)
   - D1 enabled (Database access)
   - R2 enabled (Object storage)

2. **GitHub Account** for OAuth authentication

3. **GitHub Organization/Repository** for the platform repository

### Local Tools

Install the following on your development machine:

```bash
# Node.js 18 or higher
node --version  # Should be >= 18.0.0

# npm (comes with Node.js)
npm --version

# Wrangler CLI (Cloudflare's deployment tool)
npm install -g wrangler

# Verify wrangler installation
wrangler --version
```

### Cloudflare Authentication

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/f3liz-dev/koro-i18n.git
cd koro-i18n
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma client with D1 adapter support.

---

## Database Setup

### 1. Create D1 Database

```bash
# Production database
wrangler d1 create koro-i18n-db

# Preview database (optional, for staging)
wrangler d1 create koro-i18n-db-preview
```

**Output:**
```
✅ Successfully created DB 'koro-i18n-db'

[[d1_databases]]
binding = "DB"
database_name = "koro-i18n-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. Update wrangler.toml

Copy the database configuration to `wrangler.toml`:

```toml
# Production environment
[[env.production.d1_databases]]
binding = "DB"
database_name = "koro-i18n-db"
database_id = "your-production-database-id"

# Preview environment (optional)
[[env.preview.d1_databases]]
binding = "DB"
database_name = "koro-i18n-db-preview"
database_id = "your-preview-database-id"
```

### 3. Apply Migrations

Prisma migrations are located in `migrations/` directory.

```bash
# List migrations
ls migrations/

# Apply migrations to production
npm run prisma:migrate:remote

# Or manually with wrangler
wrangler d1 migrations apply koro-i18n-db --remote
```

**Expected output:**
```
Migrations to be applied:
  └─ 0001_initial_schema.sql
  └─ 0002_add_source_language.sql
  └─ 0003_add_web_translations.sql
  ...

✔ Do you want to apply these migrations? … yes
✅ Applying migration 0001_initial_schema.sql
✅ Applying migration 0002_add_source_language.sql
...
```

### 4. Verify Database

```bash
# List tables
wrangler d1 execute koro-i18n-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"

# Should show:
# - User
# - Project
# - ProjectMember
# - OauthState
# - R2File
# - WebTranslation
# - WebTranslationHistory
```

---

## Storage Setup

### 1. Create R2 Buckets

```bash
# Production bucket
wrangler r2 bucket create koro-i18n-translations

# Preview bucket (optional)
wrangler r2 bucket create koro-i18n-translations-preview
```

### 2. Update wrangler.toml

Add R2 bucket configuration:

```toml
# Production environment
[[env.production.r2_buckets]]
binding = "TRANSLATION_BUCKET"
bucket_name = "koro-i18n-translations"

# Preview environment
[[env.preview.r2_buckets]]
binding = "TRANSLATION_BUCKET"
bucket_name = "koro-i18n-translations-preview"
```

### 3. Verify Bucket

```bash
# List buckets
wrangler r2 bucket list

# Should include:
# - koro-i18n-translations
```

---

## Authentication Setup

### 1. Create GitHub OAuth App

1. Navigate to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in application details:
   - **Application name**: koro-i18n
   - **Homepage URL**: `https://your-worker-domain.workers.dev`
   - **Authorization callback URL**: `https://your-worker-domain.workers.dev/api/auth/callback`
4. Click "Register application"
5. Generate a client secret
6. Save the Client ID and Client Secret

### 2. Set Secrets in Cloudflare

```bash
# GitHub OAuth credentials
wrangler secret put GITHUB_CLIENT_ID
# Paste your GitHub OAuth Client ID when prompted

wrangler secret put GITHUB_CLIENT_SECRET
# Paste your GitHub OAuth Client Secret when prompted

# JWT signing secret (generate a random string)
wrangler secret put JWT_SECRET
# Paste a long random string (e.g., output of `openssl rand -base64 32`)

# Optional: Restrict project creation
wrangler secret put ALLOWED_PROJECT_CREATORS
# Paste comma-separated GitHub usernames: "user1,user2,user3"
```

**Generate JWT_SECRET:**
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Verify Secrets

```bash
# List secrets (values are hidden)
wrangler secret list
```

Expected output:
```
Secret Name              
GITHUB_CLIENT_ID         
GITHUB_CLIENT_SECRET     
JWT_SECRET              
ALLOWED_PROJECT_CREATORS
```

---

## Environment Configuration

### Update wrangler.toml

Complete configuration file structure:

```toml
name = "koro-i18n"
main = "dist/index.js"
compatibility_date = "2024-01-01"

# Default environment (development)
[env.development]
vars = { 
  ENVIRONMENT = "development",
  PLATFORM_URL = "http://localhost:8787"
}

[[env.development.d1_databases]]
binding = "DB"
database_name = "koro-i18n-db"
database_id = "your-dev-database-id"

[[env.development.r2_buckets]]
binding = "TRANSLATION_BUCKET"
bucket_name = "koro-i18n-translations-dev"

# Production environment
[env.production]
vars = { 
  ENVIRONMENT = "production",
  PLATFORM_URL = "https://koro.f3liz.workers.dev"
}

[[env.production.d1_databases]]
binding = "DB"
database_name = "koro-i18n-db"
database_id = "your-production-database-id"

[[env.production.r2_buckets]]
binding = "TRANSLATION_BUCKET"
bucket_name = "koro-i18n-translations"

# Assets binding for SPA
[[env.production.assets]]
binding = "ASSETS"
directory = "./dist"

# Route configuration
routes = [
  { pattern = "your-domain.com", custom_domain = true }
]

# Preview environment (optional)
[env.preview]
vars = { 
  ENVIRONMENT = "preview",
  PLATFORM_URL = "https://preview.koro.f3liz.workers.dev"
}

[[env.preview.d1_databases]]
binding = "DB"
database_name = "koro-i18n-db-preview"
database_id = "your-preview-database-id"

[[env.preview.r2_buckets]]
binding = "TRANSLATION_BUCKET"
bucket_name = "koro-i18n-translations-preview"
```

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `ENVIRONMENT` | Deployment environment | Yes | `"production"` |
| `PLATFORM_URL` | Platform base URL (for OIDC) | Yes | `"https://koro.workers.dev"` |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Yes | (secret) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | Yes | (secret) |
| `JWT_SECRET` | JWT signing secret | Yes | (secret) |
| `ALLOWED_PROJECT_CREATORS` | Comma-separated usernames | No | `"user1,user2"` |

---

## Deployment

### 1. Build the Application

```bash
# This builds both frontend and backend
npm run build
```

**What happens:**
1. Prisma client is generated
2. Frontend is built with Vite (outputs to `dist/`)
3. Backend is bundled with Rolldown

**Build outputs:**
```
dist/
├── index.html          # SPA entry point
├── assets/             # Frontend assets (JS, CSS, images)
└── index.js            # Worker bundle
```

### 2. Deploy to Production

```bash
# Deploy to production environment
npm run deploy

# Or with wrangler directly
wrangler deploy --env production
```

**Deployment process:**
1. Uploads worker code to Cloudflare
2. Binds D1 database and R2 bucket
3. Sets up routes
4. Deploys static assets

**Expected output:**
```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded koro-i18n (X.XX sec)
Published koro-i18n (X.XX sec)
  https://koro-i18n.your-subdomain.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3. Verify Deployment

```bash
# Test health endpoint
curl https://your-worker-domain.workers.dev/health

# Expected response:
# {"status":"ok","runtime":"cloudflare-workers"}
```

### 4. Deploy to Preview (Optional)

```bash
wrangler deploy --env preview
```

---

## Post-Deployment

### 1. Update GitHub OAuth App

Update the callback URL if your worker domain changed:
1. Go to GitHub OAuth App settings
2. Update "Authorization callback URL" to: `https://your-actual-domain.workers.dev/api/auth/callback`
3. Update "Homepage URL" to match

### 2. Test Authentication Flow

1. Navigate to `https://your-worker-domain.workers.dev`
2. Click "Sign in with GitHub"
3. Authorize the application
4. Verify redirect to dashboard

### 3. Create Test Project

1. Sign in to the platform
2. Create a test project
3. Add a GitHub repository
4. Verify project creation

### 4. Test Upload (Optional)

Configure a test repository with `.koro-i18n.repo.config.toml` and run:

```bash
# From the test repository
npm install @koro-i18n/client
npx koro-i18n upload
```

---

## Monitoring

### View Logs

```bash
# Tail live logs
npm run logs

# Or with wrangler
wrangler tail --env production

# Filter by status
wrangler tail --status error

# Filter by method
wrangler tail --method POST
```

### Log Format

```
[2024-01-01T00:00:00.000Z] GET /api/projects 200 - 42.31ms
[2024-01-01T00:00:01.000Z] POST /api/translations 201 - 15.42ms
```

### Metrics Dashboard

Access Cloudflare dashboard for detailed metrics:

1. Navigate to Cloudflare Dashboard
2. Select Workers & Pages
3. Click on "koro-i18n"
4. View metrics:
   - Requests per second
   - CPU time
   - Duration
   - Errors

### Set Up Alerts (Optional)

Configure Cloudflare alerts for:
- High error rate
- High CPU usage
- Request spike

---

## Updating

### Update Process

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npm run prisma:generate

# 4. Apply new migrations (if any)
npm run prisma:migrate:remote

# 5. Build and deploy
npm run build
npm run deploy
```

### Database Migrations

If new migrations are added:

```bash
# List pending migrations
wrangler d1 migrations list koro-i18n-db --remote

# Apply migrations
wrangler d1 migrations apply koro-i18n-db --remote
```

### Zero-Downtime Deployment

Cloudflare Workers automatically performs zero-downtime deployments:
1. New version is uploaded
2. New requests go to new version
3. In-flight requests complete on old version

---

## Rollback

### Rollback to Previous Version

```bash
# List deployments
wrangler deployments list --env production

# Rollback to specific deployment
wrangler rollback --deployment-id <deployment-id> --env production
```

### Rollback Database Migration

If a migration causes issues:

```bash
# Create rollback migration
# Edit a new migration file in migrations/ to undo changes

# Example: migrations/XXXX_rollback_feature.sql
DROP TABLE IF EXISTS NewTable;
ALTER TABLE ExistingTable DROP COLUMN new_column;

# Apply rollback
wrangler d1 migrations apply koro-i18n-db --remote
```

**Note:** Always test migrations on preview environment first!

---

## Troubleshooting

### Common Deployment Issues

#### Issue: "Database ID not found"

**Cause:** Database not created or wrong ID in wrangler.toml

**Solution:**
```bash
# Create database
wrangler d1 create koro-i18n-db

# Copy database_id to wrangler.toml
```

#### Issue: "R2 bucket not found"

**Cause:** Bucket not created or wrong name in wrangler.toml

**Solution:**
```bash
# Create bucket
wrangler r2 bucket create koro-i18n-translations

# Verify bucket name in wrangler.toml matches
```

#### Issue: "Secret not found"

**Cause:** Secret not set in Cloudflare

**Solution:**
```bash
# Set the missing secret
wrangler secret put SECRET_NAME
```

#### Issue: "OAuth callback failed"

**Cause:** Callback URL mismatch in GitHub OAuth app

**Solution:**
1. Get current worker URL: `wrangler deployments list`
2. Update GitHub OAuth app callback URL to: `https://worker-url/api/auth/callback`

#### Issue: "CPU limit exceeded"

**Cause:** Request taking too long (>10ms on free tier, >50ms on paid)

**Solution:**
1. Check logs for slow operations
2. Optimize database queries
3. Reduce file upload chunk size
4. Consider upgrading to paid plan

#### Issue: "CORS error"

**Cause:** CORS configuration doesn't allow frontend origin

**Solution:**
Check `src/workers.ts` CORS configuration:
```typescript
cors({
  origin: env.ENVIRONMENT === 'production' 
    ? ['https://your-production-domain.workers.dev']
    : ['http://localhost:5173'],
  credentials: true,
})
```

### Debug Mode

Enable verbose logging in development:

```bash
# Set environment to development
wrangler dev

# Or deploy with development config
wrangler deploy --env development
```

In development mode:
- Detailed error messages are returned
- Console logs are more verbose
- JWT authentication fallback is enabled for uploads

### Health Checks

```bash
# Check worker health
curl https://your-worker-domain.workers.dev/health

# Check database connectivity
curl https://your-worker-domain.workers.dev/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Performance Issues

**Symptom:** Slow response times

**Diagnosis:**
```bash
# View logs with timing
wrangler tail --env production

# Check metrics in Cloudflare dashboard
```

**Common causes:**
1. **No caching** - Ensure ETag headers are working
2. **Database queries** - Add indexes, optimize queries
3. **R2 reads** - Check cache hit rate
4. **Large payloads** - Reduce response size

**Solutions:**
1. Verify cache headers: `Cache-Control`, `ETag`
2. Monitor D1 query performance
3. Check R2 cache TTL
4. Implement pagination for large datasets

### Data Issues

**Issue: Orphaned files in R2**

```bash
# Run cleanup manually via API
curl -X POST https://your-worker-domain.workers.dev/api/projects/PROJECT_NAME/cleanup \
  -H "Authorization: Bearer OIDC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "main",
    "allSourceFiles": ["en/file1.json", "ja/file1.json"]
  }'
```

**Issue: Database inconsistency**

```bash
# Access database directly
wrangler d1 execute koro-i18n-db --remote --command "SELECT * FROM Project;"

# Fix data manually if needed
wrangler d1 execute koro-i18n-db --remote \
  --command "UPDATE Project SET sourceLanguage = 'en' WHERE sourceLanguage IS NULL;"
```

---

## Security Best Practices

### 1. Rotate Secrets Regularly

```bash
# Generate new JWT secret
openssl rand -base64 32

# Update secret
wrangler secret put JWT_SECRET

# Redeploy
npm run deploy
```

### 2. Monitor Access Logs

```bash
# Check for suspicious activity
wrangler tail --env production | grep "401\|403"
```

### 3. Restrict Project Creation

Set `ALLOWED_PROJECT_CREATORS` to limit who can create projects:

```bash
wrangler secret put ALLOWED_PROJECT_CREATORS
# Enter: "trusted-user1,trusted-user2"
```

### 4. Use Preview Environment

Test changes on preview before production:

```bash
# Deploy to preview
wrangler deploy --env preview

# Test thoroughly
curl https://preview.your-worker-domain.workers.dev/health

# Deploy to production
wrangler deploy --env production
```

### 5. Enable Cloudflare WAF

Configure Web Application Firewall rules in Cloudflare dashboard:
- Rate limiting
- Bot protection
- Geographic restrictions (if applicable)

---

## Scaling Considerations

### Free Tier Limits

Cloudflare Workers free tier:
- 100,000 requests/day
- 10ms CPU time per request
- 1GB D1 storage
- 10GB R2 storage

### Paid Tier Benefits

Workers Paid ($5/month):
- 10M requests/month included
- 50ms CPU time per request
- $0.50 per million requests after
- Better performance guarantees

### Optimization Tips

1. **Increase cache TTL** for stable data
2. **Use differential uploads** to reduce R2 writes
3. **Batch D1 operations** for better performance
4. **Implement pagination** for large result sets
5. **Monitor usage** via Cloudflare dashboard

---

## Backup and Disaster Recovery

### Database Backups

```bash
# Export database to SQL
wrangler d1 export koro-i18n-db --remote --output backup.sql

# Store backup securely
```

### R2 Backups

```bash
# List all objects
wrangler r2 object list koro-i18n-translations

# Download specific file
wrangler r2 object get koro-i18n-translations/project-en-file.json --file backup/file.json
```

### Restore Process

```bash
# Restore database
wrangler d1 execute koro-i18n-db --remote --file backup.sql

# Restore R2 files
wrangler r2 object put koro-i18n-translations/project-en-file.json --file backup/file.json
```

---

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/f3liz-dev/koro-i18n/issues
- Documentation: See other docs in `/docs` folder
