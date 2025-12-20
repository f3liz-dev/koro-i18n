# Frontend Guide

Lightweight vanilla JavaScript frontend built with Vite.

## Tech Stack

- **Framework**: Vanilla JavaScript (ES2020+)
- **Routing**: Custom client-side router
- **Styling**: Vanilla CSS with utility classes
- **Build**: Vite

## Project Structure

```
src/app/
├── index.html           # HTML entry point
├── main.js              # JavaScript entry point and SPA router
├── public/              # Static assets (favicon, etc.)
└── styles/
    └── minimal.css      # All CSS styles
```

## Key Features

### Routing
- Client-side SPA routing with History API
- Protected routes redirect to login
- Route parameters for projects and languages

### State Management
- Simple JavaScript state object
- Authentication state tracking
- Page-level state management

### Styling
- Utility-first CSS classes
- Design tokens via CSS variables
- Responsive design with mobile-first approach

### Authentication
- JWT-based auth with cookies
- GitHub OAuth integration
- Auto-redirect to login for protected pages

## Development

```bash
# Start dev server
pnpm run dev

# Build for production
pnpm run build

# Type check (TypeScript in backend)
pnpm run type-check
```

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | Landing page |
| `/login` | Login | GitHub OAuth login |
| `/dashboard` | Dashboard | Project list |
| `/projects/new` | CreateProject | New project form |
| `/projects/:name` | ProjectView | Project overview |
| `/projects/:name/translations` | Translations | Language selection |
| `/projects/:name/translations/:lang/editor` | Editor | Translation editor |

## API Integration

All API calls use the `apiFetch` function which:
- Includes credentials for cookie-based auth
- Sets JSON content type
- Handles 401 errors with redirect to login
- Returns parsed JSON responses

```javascript
// Example API call
const data = await apiFetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({ name: 'my-project', repository: 'owner/repo' })
});
```

## Adding New Pages

1. Add route pattern to `parseRoute()` in main.js
2. Create render function (e.g., `renderMyPage()`)
3. Add case to render() switch statement
4. Handle any form interactions or API calls

For architecture details, see ARCHITECTURE.md.
