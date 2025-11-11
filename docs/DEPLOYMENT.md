# Deployment Guide

## Prerequisites

- Cloudflare account
- GitHub account
- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`

## Step-by-Step Deployment

### 1. Create D1 Database

```bash
wrangler d1 create koro-i18n-db
```

Copy the `database_id` from output.

### 2. Update Configuration

Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "koro-i18n-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 3. Initialize Database

```bash
# Run main schema
npm run db:init

# Run project management migration
npm run db:migrate

# Verify tables
npm run db:query -- --command="SELECT name FROM sqlite_master WHERE type='table'"
```

Should show: `users`, `oauth_states`, `projects`, `project_members`, `translations`, `translation_history`, `project_files`

### 4. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: I18n Platform
   - **Homepage URL**: `https://your-worker.workers.dev`
   - **Authorization callback URL**: `https://your-worker.workers.dev/api/auth/callback`
4. Note the **Client ID** and generate a **Client Secret**

### 5. Create GitHub Bot Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control)
4. Generate and copy the token

### 6. Configure Secrets

```bash
wrangler secret put GITHUB_CLIENT_ID
# Paste your client ID

wrangler secret put GITHUB_CLIENT_SECRET
# Paste your client secret

wrangler secret put JWT_SECRET
# Generate: openssl rand -base64 32

wrangler secret put GITHUB_BOT_TOKEN
# Paste your GitHub token
```

### 7. Build and Deploy

```bash
# Deploy workers (main + cron)
npm run deploy

# Deploy frontend to Pages
npm run deploy:pages
```

### 8. Update CORS Origins

Edit `src/workers.ts`:

```typescript
app.use('*', cors({
  origin: env.ENVIRONMENT === 'development' 
    ? ['http://localhost:5173', 'http://localhost:8787']
    : ['https://i18n-platform.pages.dev'],
  credentials: true,
}));
```

Redeploy:
```bash
wrangler deploy
```

## Verification

### Test Authentication

1. Visit `https://i18n-platform.pages.dev`
2. Click "Sign in"
3. Authorize with GitHub
4. Should redirect to dashboard

### Test API

```bash
curl https://your-worker.workers.dev/health
# Should return: {"status":"ok","runtime":"cloudflare-workers"}
```

### Test Database

```bash
wrangler d1 execute koro-i18n-db --command="SELECT * FROM users"
```

## Monitoring

### View Worker Logs

```bash
# View real-time logs
wrangler tail

# Filter errors only
wrangler tail --status error
```

### Check Database Usage

```bash
# Translation stats
wrangler d1 execute koro-i18n-db \
  --command="SELECT status, COUNT(*) FROM translations GROUP BY status"

# Project stats
wrangler d1 execute koro-i18n-db \
  --command="SELECT COUNT(*) as total FROM projects"
```

### Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages
3. View metrics: requests, errors, CPU time

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

**Solution:**
- Check callback URL matches GitHub OAuth app
- Verify secrets: `wrangler secret list`
- Check CORS origins

### Database Errors

**Solution:**
```bash
# Re-run schema
npm run db:init

# Verify tables
npm run db:query -- --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Frontend Not Loading

**Solution:**
- Check browser console for errors
- Verify API endpoint in frontend code
- Check CORS configuration
- Rebuild: `npm run build && wrangler pages deploy dist/frontend`

## Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to previous
wrangler rollback --message "Rollback to previous version"
```

## Backup

```bash
# Export database
wrangler d1 export koro-i18n-db --output=backup.sql

# Export specific tables
wrangler d1 execute koro-i18n-db \
  --command="SELECT * FROM translations" --json > translations.json
```

## Scaling

### Upgrade to Paid Plan

If exceeding free tier:
- Workers Paid: $5/month + $0.50/million requests
- D1 Paid: $5/month + usage-based pricing

## Security Checklist

- [ ] GitHub OAuth app configured correctly
- [ ] All secrets set via `wrangler secret put`
- [ ] CORS origins restricted to your domains
- [ ] JWT secret is random and secure (32+ bytes)
- [ ] GitHub bot token has minimal permissions
- [ ] HTTPS enforced (automatic with Cloudflare)

## Production Checklist

- [ ] D1 database created and initialized
- [ ] GitHub OAuth app configured
- [ ] All secrets set
- [ ] Workers deployed
- [ ] Frontend deployed to Pages
- [ ] CORS origins updated
- [ ] Custom domain configured (optional)
- [ ] Monitoring configured
- [ ] Backup strategy in place

## Next Steps

1. Test complete workflow (submit → approve → commit)
2. Invite team members
3. Configure project repositories
4. Set up monitoring dashboards
5. Plan for scaling if needed

---

**Deployment complete!** 🎉
