# I18n Platform Documentation

Production-ready internationalization platform with GitHub OAuth, project management, and automated batch commits.

## Quick Start

```bash
# 1. Create database
wrangler d1 create i18n-platform-db
# Update wrangler.toml with database_id

# 2. Initialize schema
npm run db:init
npm run db:migrate

# 3. Set secrets
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put GITHUB_BOT_TOKEN

# 4. Deploy
npm run deploy
npm run deploy:pages
```

## Features

- **GitHub OAuth** - Secure authentication
- **Project Management** - Multi-user projects with whitelist/blacklist
- **User Approval** - Approve users to join projects
- **Translation Approval** - Review and approve translations
- **Batch Commits** - Auto-commit every 5 minutes
- **Complete History** - Full audit trail
- **Edge Deployment** - Cloudflare Workers + D1 + Pages

## Architecture

### Stateless Design
- No session storage
- JWT contains user info + encrypted GitHub token
- Horizontal scaling ready

### Project Management
- Users can create projects
- Users can request to join projects
- Project owners approve/reject join requests
- Whitelist mode: only approved users
- Blacklist mode: all except rejected users

### Translation Workflow
1. **Submit** → User submits translation (pending)
2. **Approve** → Reviewer approves (approved)
3. **Commit** → Cron commits to GitHub every 5 min (committed)
4. **History** → All actions logged

## Configuration

### GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Create OAuth App
3. Callback: `https://your-worker.workers.dev/api/auth/callback`

### CORS Origins
Edit `src/workers.ts`:
```typescript
origin: ['https://your-pages.pages.dev']
```

## API Endpoints

```
Authentication:
  GET  /api/auth/github
  GET  /api/auth/callback
  GET  /api/auth/me
  POST /api/auth/logout

Projects:
  GET    /api/projects              - List user's projects
  GET    /api/projects/all          - List all projects (for joining)
  POST   /api/projects              - Create project
  PATCH  /api/projects/:id          - Update access control
  DELETE /api/projects/:id          - Delete project
  POST   /api/projects/:id/join     - Request to join
  GET    /api/projects/:id/members  - List members
  POST   /api/projects/:id/members/:memberId/approve - Approve/reject
  DELETE /api/projects/:id/members/:memberId - Remove member

Translations:
  POST   /api/translations
  GET    /api/translations
  GET    /api/translations/history
  POST   /api/translations/:id/approve
  DELETE /api/translations/:id
```

## Database Schema

```sql
users              -- GitHub user profiles
oauth_states       -- OAuth CSRF tokens
projects           -- Projects with access control
project_members    -- User access to projects
translations       -- Current/pending translations
translation_history -- Immutable audit log
project_files      -- Uploaded translation files
```

## Monitoring

```bash
# View logs
wrangler tail

# Check database
wrangler d1 execute koro-i18n-db --command="SELECT * FROM translations"

# Check stats
wrangler d1 execute koro-i18n-db \
  --command="SELECT status, COUNT(*) FROM translations GROUP BY status"
```

## Cost

**FREE** on Cloudflare free tier:
- Workers: 100K requests/day
- D1: 5M reads/day, 100K writes/day
- Pages: Unlimited requests
- Cron: 288 executions/day

Expected usage for 1000 daily users: **Completely FREE!**

## Troubleshooting

### OAuth Fails
```bash
wrangler secret list  # Check secrets
```

### Database Errors
```bash
wrangler d1 execute koro-i18n-db --file=schema.sql
```

## Security

- HTTPS enforced
- Secrets stored securely
- CORS restricted
- JWT signed and verified
- OAuth state validation
- HttpOnly cookies
- Minimal GitHub permissions (users: `user:email`, bot: `repo`)

## Documentation Files

- `README.md` - This file
- `DEPLOYMENT.md` - Detailed deployment guide
- `CLIENT_SETUP.md` - Client repository setup
- `migrate-project-members.sql` - Database migration

---

**Ready to deploy!** 🚀
