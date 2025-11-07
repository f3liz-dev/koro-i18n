# I18n Platform

A lightweight internationalization platform with GitHub integration, similar to Crowdin but with minimal infrastructure requirements. Built with Hono for high-performance backend API.

## Features

- **GitHub OAuth Authentication**: Secure authentication with 24-hour sessions
- **JWT Token Management**: Secure token-based authentication with automatic refresh
- **CSRF Protection**: Built-in CSRF protection for state-changing operations
- **Automatic translation commits** with co-author attribution
- **Support for TOML translation files**
- **Responsive web interface** for desktop and mobile
- **Dual deployment options**: Cloudflare Workers or traditional server
- **High-performance API**: Built with Hono framework for optimal performance

## Authentication System

The platform uses GitHub OAuth for authentication with the following security features:

### Security Features
- **OAuth 2.0 Flow**: Standard GitHub OAuth implementation
- **JWT Tokens**: Secure session management with 24-hour expiry
- **CSRF Protection**: Automatic CSRF token validation for state-changing operations
- **Secure Cookies**: HttpOnly cookies with proper SameSite settings
- **Rate Limiting**: Built-in rate limiting for authentication endpoints

### API Endpoints
- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/me` - Get current user information
- `POST /api/auth/logout` - Logout and invalidate session
- `GET /api/auth/csrf-token` - Get CSRF token for protected operations

### Environment Variables
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback
JWT_SECRET=your_secure_jwt_secret
```

## Project Structure

```
src/
├── frontend/          # Frontend application
│   ├── components/    # UI components
│   ├── services/      # Frontend services
│   └── types/         # Frontend type definitions
├── backend/           # Backend API
│   ├── api/           # API endpoints
│   ├── services/      # Backend services
│   └── types/         # Backend type definitions
├── shared/            # Shared utilities and types
│   ├── types/         # Common type definitions
│   ├── utils/         # Utility functions
│   └── validation/    # Validation schemas
└── workers/           # Cloudflare Workers entry point
```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Configure your GitHub OAuth app and update `.env`

4. Start development server:
   ```bash
   npm run dev
   ```

## Deployment

### Cloudflare Workers

1. Configure wrangler:
   ```bash
   wrangler login
   ```

2. Set secrets:
   ```bash
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put JWT_SECRET
   ```

3. Deploy:
   ```bash
   npm run build:workers
   wrangler deploy
   ```

### Traditional Server

1. Build the application:
   ```bash
   npm run build:server
   ```

2. Start the server:
   ```bash
   node dist/server/backend/index.js
   ```

## Requirements

- Node.js 18+
- GitHub OAuth application
- (Optional) Cloudflare Workers account

## License

MIT