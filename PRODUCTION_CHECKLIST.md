# Production Deployment Checklist

## Pre-Deployment

### 1. Database Setup
- [ ] Created production D1 database: `wrangler d1 create i18n-platform-db`
- [ ] Updated `wrangler.toml` with database ID
- [ ] Updated `wrangler.cron.toml` with database ID
- [ ] Initialized schema: `wrangler d1 execute i18n-platform-db --file=schema.sql`
- [ ] Verified tables exist

### 2. GitHub Configuration
- [ ] Created GitHub OAuth App
- [ ] Noted Client ID and Client Secret
- [ ] Set callback URL: `https://your-worker.workers.dev/api/auth/callback`
- [ ] Created GitHub bot token with `repo` scope

### 3. Secrets Configuration
- [ ] Set `GITHUB_CLIENT_ID`: `wrangler secret put GITHUB_CLIENT_ID`
- [ ] Set `GITHUB_CLIENT_SECRET`: `wrangler secret put GITHUB_CLIENT_SECRET`
- [ ] Generated JWT secret: `openssl rand -base64 32`
- [ ] Set `JWT_SECRET`: `wrangler secret put JWT_SECRET`
- [ ] Set `GITHUB_BOT_TOKEN`: `wrangler secret put GITHUB_BOT_TOKEN`

### 4. Code Review
- [ ] Updated CORS origins in `src/workers.ts`
- [ ] Reviewed cron frequency in `wrangler.cron.toml`
- [ ] Checked all environment variables
- [ ] Ran type check: `npm run type-check`
- [ ] Built successfully: `npm run build`

## Deployment

### 5. Deploy Workers
- [ ] Deployed main worker: `wrangler deploy`
- [ ] Deployed cron worker: `wrangler deploy --config wrangler.cron.toml`
- [ ] Verified deployment URLs
- [ ] Tested health endpoint: `curl https://your-worker.workers.dev/health`

### 6. Deploy Frontend
- [ ] Built frontend: `npm run build`
- [ ] Deployed to Pages: `wrangler pages deploy dist/frontend --project-name=i18n-platform`
- [ ] Verified Pages URL
- [ ] Tested frontend loads

### 7. Update Configuration
- [ ] Updated GitHub OAuth callback URL with actual worker URL
- [ ] Updated CORS origins with actual Pages URL
- [ ] Redeployed worker if CORS changed

## Post-Deployment

### 8. Verification
- [ ] Visited frontend URL
- [ ] Clicked "Get Started"
- [ ] Completed GitHub OAuth flow
- [ ] Reached dashboard
- [ ] Tested translation submission
- [ ] Tested translation approval
- [ ] Waited 5 minutes for cron
- [ ] Verified commit in GitHub

### 9. Monitoring Setup
- [ ] Checked Cloudflare dashboard
- [ ] Reviewed worker metrics
- [ ] Checked D1 usage
- [ ] Set up email alerts for usage limits
- [ ] Configured log retention

### 10. Documentation
- [ ] Updated README with actual URLs
- [ ] Documented custom domain (if used)
- [ ] Shared credentials with team (securely)
- [ ] Created runbook for common issues

## Optional

### 11. GitHub Actions (Optional)
- [ ] Added `CLOUDFLARE_API_TOKEN` to repo secrets
- [ ] Added `CLOUDFLARE_ACCOUNT_ID` to repo secrets
- [ ] Verified workflow runs
- [ ] Checked static logs generation

### 12. Custom Domain (Optional)
- [ ] Added custom domain to worker
- [ ] Added custom domain to Pages
- [ ] Updated DNS records
- [ ] Updated GitHub OAuth callback
- [ ] Updated CORS origins
- [ ] Verified SSL certificate

### 13. Backup Strategy
- [ ] Created backup script
- [ ] Scheduled automated backups
- [ ] Tested restore process
- [ ] Documented backup location

## Security Review

### 14. Security Checklist
- [ ] All secrets stored securely (not in code)
- [ ] CORS restricted to known domains
- [ ] JWT secret is strong (32+ bytes)
- [ ] GitHub token has minimal permissions
- [ ] HTTPS enforced everywhere
- [ ] No sensitive data in logs
- [ ] Rate limiting configured (if needed)

## Performance

### 15. Performance Check
- [ ] Frontend loads in <2 seconds
- [ ] API responds in <200ms
- [ ] Database queries optimized
- [ ] Cron runs successfully
- [ ] No errors in logs

## Rollback Plan

### 16. Rollback Preparation
- [ ] Documented rollback procedure
- [ ] Tested rollback process
- [ ] Created database backup
- [ ] Noted previous deployment version

## Sign-Off

- [ ] Tested by: _________________ Date: _______
- [ ] Reviewed by: _________________ Date: _______
- [ ] Approved by: _________________ Date: _______

## Notes

_Add any deployment notes, issues encountered, or special configurations here:_

---

## Quick Commands Reference

```bash
# Deploy everything
./deploy.sh

# View logs
wrangler tail
wrangler tail --config wrangler.cron.toml

# Check database
wrangler d1 execute i18n-platform-db --command="SELECT * FROM translations"

# Rollback
wrangler rollback

# Backup
wrangler d1 export i18n-platform-db --output=backup.sql
```

## Support Contacts

- **Technical Lead**: _________________
- **DevOps**: _________________
- **Cloudflare Support**: https://dash.cloudflare.com/support
