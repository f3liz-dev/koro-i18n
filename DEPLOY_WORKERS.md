# Deploy to Cloudflare Workers

This project is configured to deploy to `koro.f3liz.workers.dev` with static assets served alongside the API.

## Configuration

The project is set up with:
- **Worker name**: `koro`
- **Organization**: `f3liz`
- **URL**: `https://koro.f3liz.workers.dev`
- **Static assets**: Served from `dist/frontend` directory
- **API routes**: Handled by Hono worker at `/api/*`

## Prerequisites

1. Install Wrangler CLI (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

## Environment Variables

Set these secrets in Cloudflare Workers:

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

## Database Setup

The D1 database is already configured in `wrangler.toml`. If you need to create a new one:

```bash
# Create database
wrangler d1 create koro-i18n-db

# Apply Prisma migrations
wrangler d1 migrations apply koro-i18n-db --remote
```

## Deploy

Build and deploy in one command:

```bash
npm run deploy
```

Or manually:

```bash
# Build frontend
npm run build

# Deploy worker with assets
wrangler deploy
```

## How It Works

Similar to your `apt` worker configuration:

1. **Worker** (`src/workers.ts`): Handles API routes and serves static files
2. **Assets** (`dist/frontend`): Built frontend files served with `ASSETS` binding
3. **Routing**: 
   - `/api/*` → Hono API routes
   - All other routes → Static frontend (SPA routing)

The worker checks if the request is for an API route first, otherwise serves static assets from the `ASSETS` binding.

## Verify Deployment

After deployment, visit:
- https://koro.f3liz.workers.dev (frontend)
- https://koro.f3liz.workers.dev/health (API health check)

## Update GitHub OAuth

Update your GitHub OAuth App settings at https://github.com/settings/developers:
- **Application name**: Koro I18n Platform
- **Homepage URL**: `https://koro.f3liz.workers.dev`
- **Authorization callback URL**: `https://koro.f3liz.workers.dev/api/auth/callback`

The callback will redirect users to `/dashboard` after successful authentication.
