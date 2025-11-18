# Setup (concise)

Prerequisites: Node >=18, pnpm, Cloudflare account, `wrangler` CLI.

1. Install and generate Prisma:

```pwsh
pnpm install
pnpm run prisma:generate
```

2. Create Cloudflare resources (R2, D1) and apply migrations:

```pwsh
wrangler r2 bucket create koro-i18n-translations
wrangler d1 create koro-i18n-db
pnpm run prisma:migrate:local
```

3. Configure secrets (GitHub OAuth, JWT) with `wrangler secret put`.

4. Development (local):

```pwsh
pnpm run dev:all    # runs frontend + worker + rust if enabled
```

5. Deploy:

```pwsh
pnpm run build
pnpm run deploy
```

Client integration: add `.koro-i18n.repo.config.toml` in your repo (basic example in `example-project/`).

See `docs/CLIENT_SETUP.md` for full CI action examples.
