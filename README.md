# I18n Platform

Production-ready internationalization platform with GitHub OAuth, stateless JWT, and automated batch commits. Deploy to Cloudflare Workers in 5 minutes.

## ✨ Features

- 🔐 **GitHub OAuth** - Secure authentication
- ⚡ **Stateless JWT** - No session storage, scales horizontally
- 📦 **Batch Commits** - Auto-commit every 5 minutes with co-author attribution
- 📝 **Complete History** - Crowdin-like audit trail
- 🎨 **Full Editor** - Search, filter, auto-save, progress tracking
- 🚀 **Edge Deployment** - Cloudflare Workers + D1 + Pages
- 💰 **Free Tier** - Completely free for 1000+ daily users

## 🚀 Quick Deploy (5 minutes)

```bash
# 1. Create database
wrangler d1 create i18n-platform-db
# Copy database_id and update wrangler.toml + wrangler.cron.toml

# 2. Initialize schema
wrangler d1 execute i18n-platform-db --file=schema.sql

# 3. Set secrets
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put GITHUB_BOT_TOKEN

# 4. Deploy
./deploy.sh
```

**See [QUICK_START.md](QUICK_START.md) for detailed steps.**

## 💻 Local Development

```bash
# Option 1: Cloudflare Workers (recommended)
wrangler dev                    # Terminal 1
npm run dev:frontend            # Terminal 2

# Option 2: Node.js Server
npm run dev                     # Starts both server and frontend
```

## 📚 Documentation

### Platform Setup
- **[QUICK_START.md](QUICK_START.md)** - 5-minute deployment guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Step-by-step checklist
- **[PRODUCTION_READY.md](PRODUCTION_READY.md)** - Production readiness summary
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - File structure
- **[SUMMARY.md](SUMMARY.md)** - Project summary

### Client Setup
- **[CLIENT_SETUP.md](CLIENT_SETUP.md)** - Configure your translation repository
- **[client-workflow-template.yml](client-workflow-template.yml)** - GitHub Actions template

## 🏗️ Architecture

### Stateless Design
- No session storage (server or database)
- JWT contains user info + encrypted GitHub token
- 24-hour token expiration
- Horizontal scaling ready

### Translation Workflow
1. **Submit** → User submits translation (status: pending)
2. **Approve** → Reviewer approves (status: approved)
3. **Commit** → Cron commits to GitHub every 5 min (status: committed)
4. **History** → All actions logged with user attribution

### Tech Stack
- **Backend**: Cloudflare Workers + D1 Database
- **Frontend**: SolidJS + Vite
- **Auth**: GitHub OAuth + JWT
- **Cron**: Cloudflare Workers Cron
- **Deployment**: Cloudflare Pages

## 📊 Database Schema

```sql
users              -- GitHub user profiles
oauth_states       -- OAuth CSRF tokens (10min TTL)
translations       -- Current/pending translations
translation_history -- Immutable audit log
```

## 🔌 API Endpoints

```
Authentication:
  GET  /api/auth/github              - Initiate OAuth
  GET  /api/auth/callback            - OAuth callback
  GET  /api/auth/me                  - Get current user
  POST /api/auth/logout              - Logout

Translations:
  POST   /api/translations           - Submit translation
  GET    /api/translations           - List translations
  GET    /api/translations/history   - Get history
  POST   /api/translations/:id/approve - Approve
  DELETE /api/translations/:id       - Delete

Health:
  GET  /health                       - Health check
```

## ⚙️ Configuration

### GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Create new OAuth App
3. Set callback: `https://your-worker.workers.dev/api/auth/callback`

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

## 📈 Monitoring

```bash
# View logs
wrangler tail
wrangler tail --config wrangler.cron.toml

# Check database
wrangler d1 execute i18n-platform-db --command="SELECT * FROM translations"

# Check stats
wrangler d1 execute i18n-platform-db \
  --command="SELECT status, COUNT(*) FROM translations GROUP BY status"
```

## 💰 Cost

**FREE** on Cloudflare free tier:
- Workers: 100K requests/day
- D1: 5M reads/day, 100K writes/day
- Pages: Unlimited requests
- Cron: 288 executions/day (every 5 min)

Expected usage for 1000 daily users: **Completely FREE!**

## 🐛 Troubleshooting

### KV Namespace Errors (Old Cache)
```bash
npm run clean  # Remove .wrangler cache
wrangler dev   # Restart
```

### OAuth Fails
```bash
wrangler secret list  # Check secrets are set
```

### Cron Not Running
```bash
wrangler tail --config wrangler.cron.toml  # Check logs
```

### Database Errors
```bash
wrangler d1 execute i18n-platform-db --file=schema.sql  # Re-run schema
```

**See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for complete guide.**

## 📦 Scripts

```bash
# Development
npm run dev                 # Node.js server + frontend
npm run dev:workers         # Cloudflare Workers local

# Build
npm run build               # Build frontend + server

# Deployment
npm run deploy              # Deploy workers + cron
npm run deploy:pages        # Deploy frontend

# Database
npm run db:init             # Initialize production DB
npm run db:query            # Query database

# Monitoring
npm run logs                # Main worker logs
npm run logs:cron           # Cron worker logs
```

## 🎯 Features

### Translation Editor
- Side-by-side source/translation view
- Real-time search and filtering
- Auto-save every 30 seconds
- Character count and warnings
- Complete history timeline
- Progress tracking
- Mobile responsive

### Pages
1. **Home** - Landing page with features
2. **Login** - GitHub OAuth
3. **Dashboard** - Project list with stats
4. **Editor** - Full-featured translation editor
5. **History** - Complete audit trail viewer

## 🔒 Security

- ✅ HTTPS enforced (Cloudflare)
- ✅ Secrets stored securely (Wrangler)
- ✅ CORS restricted to known domains
- ✅ JWT signed and verified
- ✅ OAuth state validation (CSRF)
- ✅ HttpOnly cookies
- ✅ No sensitive data in logs
- ✅ **Minimal GitHub permissions** - Users only grant `user:email` scope
- ✅ **Bot token for commits** - User tokens never write to repositories

## 📄 License

MIT

---

## 🚀 Ready to Deploy!

Follow [QUICK_START.md](QUICK_START.md) for 5-minute deployment or [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive guide.

**Happy translating! 🌍**
