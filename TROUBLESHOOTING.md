# Troubleshooting Guide

## Common Issues

### KV Namespace Errors

**Error:**
```
env.SESSIONS (sessions_kv_namespace_preview) KV Namespace local
env.TRANSLATIONS (translations_kv_namespace_preview) KV Namespace local
```

**Cause:** Old Wrangler cache from previous KV-based implementation

**Solution:**
```bash
# Clean cache
npm run clean

# Or manually
rm -rf .wrangler dist

# Then restart
wrangler dev
```

### Database Not Found

**Error:**
```
Error: D1 database not found
```

**Solution:**
```bash
# 1. Create database
wrangler d1 create i18n-platform-db

# 2. Update wrangler.toml with database_id

# 3. Initialize schema
npm run db:init
```

### OAuth Fails

**Error:**
```
Invalid OAuth state
```

**Solutions:**

1. **Check callback URL:**
   - GitHub OAuth app settings
   - Should match: `https://your-worker.workers.dev/api/auth/callback`

2. **Check secrets:**
   ```bash
   wrangler secret list
   # Should show: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET
   ```

3. **Verify CORS:**
   - Check `src/workers.ts` CORS origins
   - Should include your frontend URL

### Cron Not Running

**Error:**
```
Translations not committing
```

**Solutions:**

1. **Check deployment:**
   ```bash
   wrangler deployments list --config wrangler.cron.toml
   ```

2. **Check logs:**
   ```bash
   npm run logs:cron
   ```

3. **Verify bot token:**
   ```bash
   wrangler secret list --config wrangler.cron.toml
   # Should show: GITHUB_BOT_TOKEN
   ```

4. **Check token permissions:**
   - Token needs `repo` scope
   - Token needs write access to repositories

### Client Upload Fails

**Error:**
```
Upload failed: 401 Unauthorized
```

**Solutions:**

1. **Check API key:**
   ```bash
   # In repository secrets
   I18N_PLATFORM_API_KEY=your-jwt-token
   ```

2. **Generate new API key:**
   - Sign in to platform
   - Go to Settings → API Keys
   - Generate new key
   - Update repository secret

3. **Check platform URL:**
   ```yaml
   env:
     I18N_PLATFORM_URL: https://i18n-platform.workers.dev
   ```

### Build Errors

**Error:**
```
TypeScript errors
```

**Solution:**
```bash
# Check types
npm run type-check

# Clean and rebuild
npm run clean
npm run build
```

### Frontend Not Loading

**Error:**
```
Blank page or 404
```

**Solutions:**

1. **Check build:**
   ```bash
   npm run build
   ls dist/frontend/
   ```

2. **Check deployment:**
   ```bash
   wrangler pages deployments list --project-name=i18n-platform
   ```

3. **Check CORS:**
   - Verify frontend URL in `src/workers.ts`
   - Redeploy worker if changed

### Database Query Errors

**Error:**
```
no such table: translations
```

**Solution:**
```bash
# Re-run schema
npm run db:init

# Verify tables
npm run db:query -- --command="SELECT name FROM sqlite_master WHERE type='table'"
```

## Development Issues

### Port Already in Use

**Error:**
```
Port 8787 already in use
```

**Solution:**
```bash
# Find process
lsof -i :8787  # Mac/Linux
netstat -ano | findstr :8787  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

### Hot Reload Not Working

**Solution:**
```bash
# Restart dev server
# Ctrl+C to stop
wrangler dev
```

### Module Not Found

**Error:**
```
Cannot find module 'xyz'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Production Issues

### High Latency

**Symptoms:** Slow API responses

**Solutions:**

1. **Check D1 usage:**
   - Cloudflare dashboard → D1
   - Check read/write metrics

2. **Optimize queries:**
   - Add indexes (already in schema.sql)
   - Reduce query complexity

3. **Check worker metrics:**
   - Cloudflare dashboard → Workers
   - Check CPU time, errors

### Rate Limiting

**Error:**
```
429 Too Many Requests
```

**Solutions:**

1. **Check free tier limits:**
   - Workers: 100K requests/day
   - D1: 5M reads/day, 100K writes/day

2. **Upgrade plan if needed:**
   - Workers Paid: $5/month
   - D1 Paid: $5/month

3. **Optimize requests:**
   - Cache responses
   - Batch operations

### Commits Failing

**Error:**
```
GitHub API error: 403 Forbidden
```

**Solutions:**

1. **Check bot token:**
   ```bash
   # Regenerate token
   # Update secret
   wrangler secret put GITHUB_BOT_TOKEN --config wrangler.cron.toml
   ```

2. **Check repository permissions:**
   - Bot needs write access
   - Check repository settings

3. **Check rate limits:**
   - GitHub API: 5000 requests/hour
   - Wait and retry

## Debugging

### Enable Verbose Logging

```bash
# Worker logs
wrangler tail --format=pretty

# Cron logs
wrangler tail --config wrangler.cron.toml --format=pretty

# Filter by status
wrangler tail --status=error
```

### Check Database State

```bash
# List all translations
npm run db:query -- --command="SELECT * FROM translations LIMIT 10"

# Check by status
npm run db:query -- --command="SELECT status, COUNT(*) FROM translations GROUP BY status"

# Check recent history
npm run db:query -- --command="SELECT * FROM translation_history ORDER BY createdAt DESC LIMIT 10"
```

### Test API Endpoints

```bash
# Health check
curl https://your-worker.workers.dev/health

# Get user (requires auth)
curl https://your-worker.workers.dev/api/auth/me \
  -H "Cookie: auth_token=YOUR_JWT"

# Upload files (requires API key)
curl -X POST https://your-worker.workers.dev/api/projects/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"repository":"owner/repo","files":[]}'
```

## Getting Help

### Check Logs First

```bash
# Platform logs
npm run logs

# Cron logs
npm run logs:cron

# Client logs (in GitHub Actions)
gh run list --workflow=i18n-upload.yml
gh run view <run-id> --log
```

### Verify Configuration

```bash
# Check secrets
wrangler secret list

# Check deployments
wrangler deployments list

# Check database
npm run db:query -- --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Clean Start

```bash
# 1. Clean everything
npm run clean
rm -rf node_modules package-lock.json

# 2. Reinstall
npm install

# 3. Rebuild
npm run build

# 4. Redeploy
npm run deploy
```

## Support Resources

- **Documentation:** See README.md, DEPLOYMENT.md
- **Cloudflare Docs:** https://developers.cloudflare.com/
- **GitHub Issues:** Report bugs in repository
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/

## Quick Fixes

```bash
# Clean cache
npm run clean

# Restart dev
wrangler dev

# Re-init database
npm run db:init

# Check secrets
wrangler secret list

# View logs
npm run logs
```
