# koro-i18n

A lightweight internationalization (i18n) platform for managing translations. Built with a modern stack designed for simplicity and performance.

## Architecture

```
koro-i18n/
├── frontend/    # ReScript + Preact — deployed to Cloudflare Workers
└── server/      # Node.js + Hono — runs on VM server
```

### Backend (VM Server)

- **Runtime**: Node.js
- **Framework**: [Hono](https://hono.dev) — lightweight, fast web framework
- **Database**: SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — simple, zero-config, local data
- **Auth**: GitHub OAuth

The server runs on a VM and keeps a local SQLite copy of translation data for fast reads and simplified operations.

### Frontend (Cloudflare Workers)

- **Language**: [ReScript](https://rescript-lang.org) — type-safe, compiles to clean JavaScript
- **UI Library**: [Preact](https://preactjs.com) — fast 3kB React alternative
- **Build**: [Vite](https://vitejs.dev) — fast development and production builds
- **Hosting**: Cloudflare Workers/Pages for edge delivery

## Development

### Prerequisites

- Node.js >= 20
- npm

### Setup

```bash
# Install all dependencies
npm run setup

# Start development (both frontend and server)
npm run dev
```

### Individual Commands

```bash
# Frontend
cd frontend
npm run res:build   # Build ReScript
npm run dev         # Start Vite dev server

# Server
cd server
npm run dev         # Start server with auto-reload
npm run build       # Build for production
```

## Core Concepts

- **Projects**: Each i18n project maps to a repository or app
- **Source Keys**: The original strings to be translated (source of truth in code)
- **Translations**: Translated strings in various locales, managed through the platform
- **Workflow**: Push keys → Translate in UI → Pull approved translations

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get project details |
| GET | `/api/projects/:id/keys` | List source keys |
| POST | `/api/projects/:id/keys` | Push source keys |
| GET | `/api/projects/:id/translations/:locale` | Get translations for locale |
| PUT | `/api/projects/:id/translations/:locale` | Update translations |

## License

MIT
