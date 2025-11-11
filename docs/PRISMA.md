# Prisma D1 Integration

This project now uses Prisma ORM for Cloudflare D1 database access, following the official [Cloudflare D1 and Prisma ORM tutorial](https://developers.cloudflare.com/d1/tutorials/d1-and-prisma-orm/).

## Overview

Prisma ORM is integrated alongside the existing D1 database queries. This provides:
- Type-safe database queries
- Auto-completion support in IDEs
- Schema-first development approach
- Better maintainability and developer experience

## Setup

### 1. Dependencies

The following dependencies are installed:
```bash
pnpm add @prisma/client @prisma/adapter-d1
pnpm add -D prisma
```

### 2. Prisma Schema

The Prisma schema is located at `prisma/schema.prisma` and mirrors the existing database schema defined in `schema.sql`. It includes all models:
- User
- OauthState
- ProjectFile
- Translation
- TranslationHistory
- Project
- ProjectMember

### 3. Generate Prisma Client

To generate the Prisma Client after schema changes:
```bash
pnpm prisma generate
```

The Prisma Client is generated to `src/generated/prisma/` (which is gitignored).

## Usage in Workers

### Initializing Prisma Client

In `src/workers.ts`, Prisma is initialized with the D1 adapter:

```typescript
import { PrismaClient } from './generated/prisma/';
import { PrismaD1 } from '@prisma/adapter-d1';

// Inside createWorkerApp function
const getPrisma = () => {
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
};
```

### Example Usage

A demonstration endpoint at `/api/prisma/users` shows how to use Prisma:

```typescript
app.get('/api/prisma/users', async (c) => {
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
    take: 10,
  });
  return c.json({ users, source: 'prisma-orm' });
});
```

## Database Migrations

### Creating Migrations

When you update the Prisma schema, generate a new migration SQL:

```bash
DATABASE_URL="file:./dev.db" pnpm prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script \
  --output migrations/0002_my_migration.sql
```

### Applying Migrations

Apply migrations to local database:
```bash
npx wrangler d1 migrations apply i18n-platform-db --local
```

Apply migrations to remote database:
```bash
npx wrangler d1 migrations apply i18n-platform-db --remote
```

## Schema Updates

1. Edit `prisma/schema.prisma`
2. Generate migration SQL as shown above
3. Apply migrations to local and remote databases
4. Regenerate Prisma Client: `pnpm prisma generate`
5. Update your code to use the new schema

## Benefits

- **Type Safety**: Get compile-time type checking for all database queries
- **IntelliSense**: Auto-completion for models, fields, and query methods
- **Relationships**: Define and navigate database relationships easily
- **Query Building**: Fluent API for building complex queries
- **Schema Versioning**: Track schema changes through migration files

## Compatibility

- D1 uses SQLite under the hood, which Prisma fully supports
- The `@prisma/adapter-d1` package provides the necessary integration
- All standard Prisma features work with D1 databases

## Notes

- Prisma Migrate does not yet directly support D1, so migrations are managed through Wrangler
- The generated Prisma Client files are excluded from version control (see `.gitignore`)
- Run `pnpm prisma generate` after pulling changes that modify the schema
