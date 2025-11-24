# Frontend Guide

Frontend built with SolidJS, Vite, and UnoCSS.

## Tech Stack

- **Framework**: SolidJS (reactive, performant)
- **Routing**: @solidjs/router
- **Styling**: UnoCSS (atomic CSS)
- **Build**: Vite
- **State**: SolidJS signals and stores

## Project Structure

```
src/app/
├── components/          # Reusable UI components
├── pages/              # Route pages
├── lib/                # Utilities and helpers
└── entry-client.tsx    # Client entry point
```

## Key Features

### Routing
- File-based routing with @solidjs/router
- Protected routes via auth middleware
- Layout components for shared UI

### State Management
- SolidJS signals for reactive state
- createResource for async data
- Context providers for global state

### Styling
- UnoCSS for utility classes
- Custom design tokens in `uno.config.ts`
- Responsive design with mobile-first approach

### Authentication
- JWT-based auth with cookies
- GitHub OAuth integration
- Auto-redirect to login for protected pages

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Component Examples

### Basic Component
```tsx
import { Component } from 'solid-js';

const MyComponent: Component<{ title: string }> = (props) => {
  return <h1>{props.title}</h1>;
};
```

### Data Fetching
```tsx
import { createResource } from 'solid-js';

const [projects] = createResource(fetchProjects);

return (
  <Show when={projects()}>
    {(data) => <ProjectList projects={data()} />}
  </Show>
);
```

For architecture details, see ARCHITECTURE.md.
