# Quick Start Guide

## 🚀 Deploy to Production (5 minutes)

```bash
# 1. Create database
wrangler d1 create i18n-platform-db
# Copy the database_id and update wrangler.toml and wrangler.cron.toml

# 2. Initialize database
wrangler d1 execute i18n-platform-db --file=schema.sql

# 3. Set secrets
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put GITHUB_BOT_TOKEN

# 4. Deploy
./deploy.sh
```

## 💻 Local Development

```bash
# Option 1: Cloudflare Workers (recommended)
wrangler dev                    # Terminal 1
npm run dev:frontend            # Terminal 2

# Option 2: Node.js Server
cp .env.example .env            # Edit with your credentials
npm run dev                     # Starts both server and frontend
```

## 📝 Common Tasks

### Submit Translation
```bash
curl -X POST https://your-worker.workers.dev/api/translations \
  -H "Content-Type: application/json" \
  -d '{"projectId":"owner/repo","language":"ja","key":"test","value":"テスト"}'
```

### Check Database
```bash
wrangler d1 execute i18n-platform-db --command="SELECT * FROM translations"
```

### View Logs
```bash
wrangler tail                           # Main worker
wrangler tail --config wrangler.cron.toml  # Cron worker
```

### Redeploy
```bash
wrangler deploy                         # Main worker
wrangler deploy --config wrangler.cron.toml  # Cron worker
```

## 🔧 Configuration

### GitHub OAuth App
1. Go to https://github.com/settings/developers
2. New OAuth App
3. Callback: `https://your-worker.workers.dev/api/auth/callback`

### Cron Frequency
Edit `wrangler.cron.toml`:
```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

### CORS Origins
Edit `src/workers.ts`:
```typescript
origin: ['https://your-pages.pages.dev']
```

## 📊 Monitoring

### Cloudflare Dashboard
- Workers: https://dash.cloudflare.com → Workers & Pages
- D1: https://dash.cloudflare.com → D1

### Check Usage
```bash
# Translation stats
wrangler d1 execute i18n-platform-db \
  --command="SELECT status, COUNT(*) FROM translations GROUP BY status"

# History stats  
wrangler d1 execute i18n-platform-db \
  --command="SELECT action, COUNT(*) FROM translation_history GROUP BY action"
```

## 🐛 Troubleshooting

### OAuth Fails
- Check callback URL in GitHub OAuth app
- Verify secrets: `wrangler secret list`
- Check CORS origins

### Cron Not Running
- Check deployment: `wrangler deployments list --config wrangler.cron.toml`
- View logs: `wrangler tail --config wrangler.cron.toml`
- Verify `GITHUB_BOT_TOKEN` has repo access

### Database Errors
- Re-run schema: `wrangler d1 execute i18n-platform-db --file=schema.sql`
- Check tables: `wrangler d1 execute i18n-platform-db --command="SELECT name FROM sqlite_master WHERE type='table'"`

## 📚 Documentation

- `README.md` - Overview
- `DEPLOYMENT.md` - Detailed deployment guide
- `PRODUCTION_CHECKLIST.md` - Deployment checklist
- `QUICK_START.md` - This file

## 🆘 Need Help?

1. Check logs: `wrangler tail`
2. Check database: `wrangler d1 execute`
3. Review Cloudflare dashboard
4. See `DEPLOYMENT.md` for detailed troubleshooting
