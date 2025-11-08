# Production Deployment Guide

## Prerequisites

- Cloudflare account
- GitHub account
- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`

## Step 1: Create D1 Databases

```bash
# Production database
wrangler d1 create i18n-platform-db

# Development database (optional)
wrangler d1 create i18n-platform-db-dev
```

**Output example:**
```
✅ Successfully created DB 'i18n-platform-db'
database_id = "abc123-def456-ghi789"
```

## Step 2: Update Configuration

### Update `wrangler.toml`

Replace `REPLACE_WITH_YOUR_DATABASE_ID` with your actual database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "i18n-platform-db"
database_id = "abc123-def456-ghi789"  # Your actual ID
```

### Update `wrangler.cron.toml`

Use the **same database ID**:

```toml
[[d1_databases]]
binding = "DB"
database_name = "i18n-platform-db"
database_id = "abc123-def456-ghi789"  # Same ID
```

## Step 3: Initialize Database Schema

```bash
# Production
wrangler d1 execute i18n-platform-db --file=schema.sql

# Development (optional)
wrangler d1 execute i18n-platform-db-dev --file=schema.sql --local
```

**Verify:**
```bash
wrangler d1 execute i18n-platform-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

Should show: `users`, `oauth_states`, `translations`, `translation_history`

## Step 4: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: I18n Platform
   - **Homepage URL**: `https://your-worker.workers.dev`
   - **Authorization callback URL**: `https://your-worker.workers.dev/api/auth/callback`
4. Click "Register application"
5. Note the **Client ID** and generate a **Client Secret**

## Step 5: Create GitHub Bot Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (full control)
4. Generate and copy the token

## Step 6: Configure Secrets

```bash
# GitHub OAuth credentials
wrangler secret put GITHUB_CLIENT_ID
# Paste your client ID

wrangler secret put GITHUB_CLIENT_SECRET
# Paste your client secret

# JWT secret (generate with: openssl rand -base64 32)
wrangler secret put JWT_SECRET
# Paste a random 32-byte base64 string

# GitHub bot token for commits
wrangler secret put GITHUB_BOT_TOKEN
# Paste your GitHub token
```

## Step 7: Deploy Workers

```bash
# Deploy main API worker
wrangler deploy

# Deploy cron worker
wrangler deploy --config wrangler.cron.toml
```

**Output:**
```
✨ Deployed i18n-platform
   https://i18n-platform.your-subdomain.workers.dev

✨ Deployed i18n-platform-cron
   Cron schedule: */5 * * * *
```

## Step 8: Build and Deploy Frontend

```bash
# Build static frontend
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist/frontend --project-name=i18n-platform
```

**Output:**
```
✨ Deployment complete!
   https://i18n-platform.pages.dev
```

## Step 9: Update CORS Origins

Edit `src/workers.ts` to add your Pages domain:

```typescript
app.use('*', cors({
  origin: env.ENVIRONMENT === 'development' 
    ? ['http://localhost:5173', 'http://localhost:3000']
    : ['https://i18n-platform.pages.dev', 'https://your-custom-domain.com'],
  credentials: true,
}));
```

Redeploy:
```bash
wrangler deploy
```

## Step 10: Setup GitHub Actions (Optional)

For static log generation, add these secrets to your GitHub repository:

1. Go to repository Settings → Secrets and variables → Actions
2. Add secrets:
   - `CLOUDFLARE_API_TOKEN` - Create at https://dash.cloudflare.com/profile/api-tokens
   - `CLOUDFLARE_ACCOUNT_ID` - Find in Cloudflare dashboard URL

The workflow will run hourly and export translation history to static files.

## Verification

### Test Authentication

1. Visit `https://i18n-platform.pages.dev`
2. Click "Get Started"
3. Sign in with GitHub
4. Should redirect to dashboard

### Test API

```bash
# Health check
curl https://i18n-platform.your-subdomain.workers.dev/health

# Should return: {"status":"ok","runtime":"cloudflare-workers"}
```

### Test Database

```bash
# Check users
wrangler d1 execute i18n-platform-db --command="SELECT * FROM users"

# Check translations
wrangler d1 execute i18n-platform-db --command="SELECT * FROM translations"
```

### Test Cron

```bash
# View cron logs
wrangler tail --config wrangler.cron.toml

# Manually trigger (for testing)
wrangler d1 execute i18n-platform-db --command="INSERT INTO translations (id, projectId, language, key, value, userId, username, status) VALUES ('test-id', 'owner/repo', 'ja', 'test.key', 'テスト', 'user-id', 'testuser', 'approved')"

# Wait 5 minutes and check logs
```

## Monitoring

### View Logs

```bash
# Main worker logs
wrangler tail

# Cron worker logs
wrangler tail --config wrangler.cron.toml

# Filter by status
wrangler tail --status error
```

### Check Database Usage

```bash
# Translation stats
wrangler d1 execute i18n-platform-db --command="SELECT status, COUNT(*) as count FROM translations GROUP BY status"

# History stats
wrangler d1 execute i18n-platform-db --command="SELECT action, COUNT(*) as count FROM translation_history GROUP BY action"
```

### Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages
3. Click on your worker
4. View metrics: requests, errors, CPU time

## Custom Domain (Optional)

### For Workers

1. Go to Workers & Pages → i18n-platform
2. Click "Triggers" tab
3. Add custom domain
4. Update GitHub OAuth callback URL

### For Pages

1. Go to Workers & Pages → i18n-platform (Pages)
2. Click "Custom domains"
3. Add your domain
4. Update CORS origins in workers.ts

## Troubleshooting

### OAuth Fails

**Error:** "Invalid OAuth state"

**Solution:**
- Check callback URL matches GitHub OAuth app
- Verify secrets are set correctly
- Check CORS origins

### Cron Not Running

**Error:** Translations not committing

**Solution:**
```bash
# Check cron is deployed
wrangler deployments list --config wrangler.cron.toml

# Check logs
wrangler tail --config wrangler.cron.toml

# Verify GITHUB_BOT_TOKEN has repo access
```

### Database Errors

**Error:** "no such table: translations"

**Solution:**
```bash
# Re-run schema
wrangler d1 execute i18n-platform-db --file=schema.sql

# Verify tables
wrangler d1 execute i18n-platform-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Frontend Not Loading

**Error:** Blank page

**Solution:**
- Check browser console for errors
- Verify API endpoint in frontend code
- Check CORS configuration
- Rebuild and redeploy: `npm run build && wrangler pages deploy dist/frontend`

## Rollback

### Rollback Worker

```bash
# List deployments
wrangler deployments list

# Rollback to previous
wrangler rollback --message "Rollback to previous version"
```

### Rollback Database

D1 doesn't support automatic rollback. Backup before major changes:

```bash
# Export data
wrangler d1 execute i18n-platform-db --command="SELECT * FROM translations" --json > backup.json
```

## Cost Monitoring

### Free Tier Limits

- **Workers**: 100,000 requests/day
- **D1**: 5,000,000 reads/day, 100,000 writes/day
- **Pages**: Unlimited requests

### Check Usage

1. Go to Cloudflare Dashboard
2. Navigate to Analytics & Logs
3. View usage by service

### Alerts

Set up email alerts:
1. Go to Notifications
2. Create alert for:
   - Workers requests > 80,000/day
   - D1 writes > 80,000/day

## Scaling

### Increase Cron Frequency

Edit `wrangler.cron.toml`:

```toml
[triggers]
crons = ["*/1 * * * *"]  # Every minute
```

Redeploy:
```bash
wrangler deploy --config wrangler.cron.toml
```

### Add More Workers

For high traffic, deploy to multiple regions (automatic with Workers).

### Upgrade to Paid Plan

If exceeding free tier:
- Workers Paid: $5/month + $0.50/million requests
- D1 Paid: $5/month + usage-based pricing

## Backup Strategy

### Automated Backups

Create a scheduled backup script:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
wrangler d1 execute i18n-platform-db --command="SELECT * FROM translations" --json > backups/translations-$DATE.json
wrangler d1 execute i18n-platform-db --command="SELECT * FROM translation_history" --json > backups/history-$DATE.json
```

Run daily via cron or GitHub Actions.

### Manual Backup

```bash
# Export all tables
wrangler d1 export i18n-platform-db --output=backup.sql
```

## Security Checklist

- [ ] GitHub OAuth app configured with correct callback URL
- [ ] Secrets set via `wrangler secret put` (not in code)
- [ ] CORS origins restricted to your domains
- [ ] JWT secret is random and secure (32+ bytes)
- [ ] GitHub bot token has minimal required permissions
- [ ] HTTPS enforced (automatic with Cloudflare)
- [ ] Rate limiting configured (if needed)

## Production Checklist

- [ ] D1 databases created and initialized
- [ ] GitHub OAuth app configured
- [ ] All secrets set
- [ ] Workers deployed
- [ ] Frontend deployed to Pages
- [ ] CORS origins updated
- [ ] Custom domain configured (optional)
- [ ] GitHub Actions secrets set (optional)
- [ ] Monitoring and alerts configured
- [ ] Backup strategy in place
- [ ] Documentation updated with actual URLs

## Support

For issues:
1. Check logs: `wrangler tail`
2. Check database: `wrangler d1 execute`
3. Review Cloudflare dashboard
4. Check GitHub Issues

## Next Steps

After deployment:
1. Test complete workflow (submit → approve → commit)
2. Invite team members
3. Configure project repositories
4. Set up monitoring dashboards
5. Plan for scaling if needed
