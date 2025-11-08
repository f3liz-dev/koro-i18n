# Project Structure

```
i18n-platform/
│
├── src/                                # Source code
│   ├── workers.ts                      # Cloudflare Workers (PRODUCTION)
│   ├── cron.ts                         # Batch commit cron job
│   ├── server.ts                       # Node.js server (dev/alternative)
│   ├── main.ts                         # Node.js entry point
│   └── app/                            # SolidJS frontend
│       ├── App.tsx                     # Router
│       ├── auth.ts                     # Auth state & API
│       ├── index.tsx                   # Mount point
│       ├── index.html                  # HTML template
│       ├── styles/
│       │   └── main.css                # Complete CSS utilities
│       └── pages/
│           ├── HomePage.tsx            # Landing page
│           ├── LoginPage.tsx           # GitHub OAuth login
│           ├── DashboardPage.tsx       # Project dashboard
│           ├── TranslationEditorPage.tsx  # Main editor
│           └── TranslationHistoryPage.tsx # History viewer
│
├── .github/
│   └── workflows/
│       └── generate-logs.yml           # Static log generation (optional)
│
├── .kiro/
│   └── specs/                          # Original requirements
│       └── i18n-platform/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
│
├── schema.sql                          # D1 database schema
├── wrangler.toml                       # Main worker configuration
├── wrangler.cron.toml                  # Cron worker configuration
├── vite.config.ts                      # Frontend build configuration
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Dependencies & scripts
│
├── README.md                           # Project overview
├── QUICK_START.md                      # 5-minute deployment guide
├── DEPLOYMENT.md                       # Comprehensive deployment guide
├── PRODUCTION_CHECKLIST.md             # Step-by-step checklist
├── PRODUCTION_READY.md                 # Production readiness summary
├── PROJECT_STRUCTURE.md                # This file
│
├── .env.example                        # Environment template
├── .gitignore                          # Git ignore rules
├── .eslintrc.json                      # ESLint configuration
├── deploy.sh                           # Deployment script
└── dev.sh                              # Development script
```

## Key Files

### Production Files
- `src/workers.ts` - Main Cloudflare Workers application
- `src/cron.ts` - Scheduled batch commit worker
- `schema.sql` - Database schema for D1
- `wrangler.toml` - Worker configuration
- `wrangler.cron.toml` - Cron worker configuration

### Frontend Files
- `src/app/App.tsx` - SolidJS router
- `src/app/pages/*.tsx` - Page components
- `src/app/styles/main.css` - Complete CSS
- `vite.config.ts` - Build configuration

### Documentation
- `README.md` - Start here
- `QUICK_START.md` - Fast deployment
- `DEPLOYMENT.md` - Detailed guide
- `PRODUCTION_CHECKLIST.md` - Deployment checklist
- `PRODUCTION_READY.md` - Readiness summary

### Configuration
- `.env.example` - Environment template
- `package.json` - Dependencies & scripts
- `tsconfig.json` - TypeScript config
- `.gitignore` - Git ignore rules

## Build Output

```
dist/
├── frontend/                           # Static frontend (Cloudflare Pages)
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   └── index-[hash].css
│   └── ...
│
└── *.js                                # Compiled Node.js server (optional)
```

## Database Schema

```sql
users              -- User profiles from GitHub
oauth_states       -- OAuth CSRF tokens (10min TTL)
translations       -- Current/pending translations
translation_history -- Immutable audit log
```

## Scripts

```bash
# Development
npm run dev                 # Node.js server + frontend
npm run dev:server          # Node.js server only
npm run dev:frontend        # Frontend only
npm run dev:workers         # Cloudflare Workers local

# Build
npm run build               # Build frontend + server
npm run type-check          # TypeScript check

# Deployment
npm run deploy              # Deploy workers + cron
npm run deploy:pages        # Deploy frontend to Pages

# Database
npm run db:init             # Initialize production DB
npm run db:init:dev         # Initialize dev DB
npm run db:query            # Query production DB

# Monitoring
npm run logs                # Main worker logs
npm run logs:cron           # Cron worker logs
```

## Environment Variables

### Development (.env)
```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback
JWT_SECRET=...
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

### Production (Wrangler Secrets)
```
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
JWT_SECRET
GITHUB_BOT_TOKEN
```

## Dependencies

### Runtime
- `hono` - Web framework
- `solid-js` - Frontend framework
- `@octokit/rest` - GitHub API
- `jsonwebtoken` - JWT handling

### Development
- `typescript` - Type checking
- `vite` - Frontend bundler
- `wrangler` - Cloudflare CLI
- `tsx` - TypeScript execution

## Deployment Targets

### Cloudflare Workers (Production)
- Main API: `https://i18n-platform.workers.dev`
- Cron: Scheduled worker
- Frontend: `https://i18n-platform.pages.dev`
- Database: D1 (serverless SQL)

### Node.js (Alternative)
- Server: Any Node.js 18+ host
- Frontend: Any static host
- Database: In-memory (dev only)

## File Sizes

- `src/workers.ts`: ~10KB
- `src/cron.ts`: ~5KB
- `src/app/`: ~50KB (uncompiled)
- Frontend bundle: ~200KB (compiled)
- Total: ~265KB

## Lines of Code

- Backend: ~600 lines
- Frontend: ~1000 lines
- Total: ~1600 lines

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari, Chrome Android

## Performance Targets

- Frontend load: <2 seconds
- API response: <200ms
- Auto-save: 30 seconds
- Cron frequency: 5 minutes
- Database queries: <50ms
