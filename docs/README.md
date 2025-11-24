# Documentation

Comprehensive documentation for koro-i18n platform.

## Quick Links

- [Setup Guide](SETUP.md) - Installation and Cloudflare setup
- [API Reference](API.md) - Complete API documentation
- [Architecture](ARCHITECTURE.md) - System design and data flow
- [Frontend Guide](FRONTEND_GUIDE.md) - Frontend development
- [Client Library](CLIENT_LIBRARY.md) - Manifest generation tool
- [Rust Worker](RUST_WORKER.md) - Compute worker for CPU-intensive tasks
- [Prisma Guide](PRISMA.md) - Database schema and ORM
- [Testing Guide](TESTING.md) - How to run and write tests
- [Deployment](DEPLOYMENT.md) - Deployment instructions
- [Manifest-Based Fetching](MANIFEST_BASED_FETCHING.md) - How manifest fetching works

## Getting Started

1. **Setup**: Follow [SETUP.md](SETUP.md) to install dependencies and configure Cloudflare
2. **Development**: Run `pnpm run dev:all` to start all services
3. **Architecture**: Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
4. **API**: Reference [API.md](API.md) for endpoint documentation

## Tech Stack

- **Frontend**: SolidJS + Vite + UnoCSS
- **Backend**: Cloudflare Workers + Hono
- **Storage**: D1 (SQLite) + R2 (Object Storage)
- **ORM**: Prisma
- **Auth**: GitHub OAuth + JWT
- **Compression**: MessagePack

## Archive

Historical documentation is in [archive/](archive/) for reference only.

