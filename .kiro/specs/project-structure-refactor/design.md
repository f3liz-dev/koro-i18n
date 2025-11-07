# Project Structure Refactor Design

## Overview

This design proposes a simplified project structure that reduces complexity while maintaining all current functionality. The refactoring consolidates the current four-directory structure (backend, frontend, workers, shared) into a more intuitive organization that groups code by purpose rather than deployment target.

## Current Structure Analysis

The existing structure has these issues:
- Deep nesting with separate directories for backend, frontend, workers, and shared code
- Complex import paths and TypeScript path mapping
- Duplicate functionality across different targets
- Cognitive overhead when navigating between related files

## Proposed Structure

```
src/
├── app/                    # Main application code
│   ├── components/         # Reusable UI components (from frontend/components)
│   ├── pages/             # Page components (from frontend/pages)
│   ├── stores/            # State management (from frontend/stores)
│   ├── hooks/             # Custom hooks (from frontend/hooks)
│   └── styles/            # Styling (from frontend/styles)
├── api/                   # API routes and handlers
│   ├── routes/            # Route definitions (from backend/api)
│   ├── middleware/        # Middleware (from backend/middleware + workers/middleware)
│   └── services/          # Business logic services (from backend/services + workers/services)
├── lib/                   # Shared utilities and types
│   ├── types/             # Type definitions (from shared/types + backend/types)
│   ├── utils/             # Utility functions (from shared/utils + frontend/utils)
│   ├── validation/        # Validation schemas (from shared/validation)
│   └── auth/              # Authentication logic (consolidated)
├── config/                # Configuration files
│   ├── server.ts          # Server configuration
│   ├── workers.ts         # Workers configuration
│   └── database.ts        # Database configuration
└── __tests__/             # All tests consolidated
    ├── api/               # API tests
    ├── app/               # Frontend tests
    └── lib/               # Utility tests
```

## Architecture

### Build System Integration

The simplified structure maintains compatibility with existing build processes:

1. **Frontend Build**: Vite will target `src/app/` as the main frontend directory
2. **Server Build**: TypeScript compiler will include `src/api/`, `src/lib/`, and `src/config/`
3. **Workers Build**: Will include `src/api/`, `src/lib/`, and workers-specific configurations

### Import Path Simplification

New TypeScript path mappings:
```json
{
  "@/app/*": ["./src/app/*"],
  "@/api/*": ["./src/api/*"],
  "@/lib/*": ["./src/lib/*"],
  "@/config/*": ["./src/config/*"]
}
```

### File Migration Strategy

1. **Frontend files** (`src/frontend/`) → `src/app/`
2. **Backend API files** (`src/backend/api/`) → `src/api/routes/`
3. **Backend services** (`src/backend/services/`) → `src/api/services/`
4. **Backend middleware** (`src/backend/middleware/`) → `src/api/middleware/`
5. **Workers handlers** (`src/workers/`) → `src/api/` (consolidated with backend API)
6. **Shared code** (`src/shared/`) → `src/lib/`
7. **All tests** → `src/__tests__/` (organized by domain)

## Components and Interfaces

### Entry Points

- **Frontend**: `src/app/App.tsx` (main application entry)
- **Server**: `src/config/server.ts` (Node.js server configuration)
- **Workers**: `src/config/workers.ts` (Cloudflare Workers configuration)

### Shared Interfaces

All shared types and interfaces will be consolidated in `src/lib/types/`, eliminating the need for complex cross-directory imports.

### Service Layer

Business logic services will be unified in `src/api/services/`, making them accessible to both server and workers environments.

## Data Models

No changes to existing data models - they will be moved to `src/lib/types/` for better accessibility.

## Error Handling

Error handling middleware will be consolidated in `src/api/middleware/error-handling.ts`, combining the current backend and workers error handling approaches.

## Testing Strategy

### Test Organization

- All tests moved to `src/__tests__/` with subdirectories matching the main structure
- Maintains existing test configurations and scripts
- Simplifies test discovery and execution

### Test Categories

1. **Unit Tests**: `src/__tests__/lib/` - Testing utility functions and types
2. **API Tests**: `src/__tests__/api/` - Testing routes, services, and middleware
3. **Component Tests**: `src/__tests__/app/` - Testing UI components and pages
4. **Integration Tests**: `src/__tests__/integration/` - End-to-end testing

## Migration Benefits

1. **Reduced Complexity**: Fewer top-level directories to navigate
2. **Clearer Purpose**: Directories named by function rather than deployment target
3. **Simplified Imports**: Shorter, more intuitive import paths
4. **Better Discoverability**: Related files grouped together
5. **Maintained Functionality**: All existing features preserved
6. **Build Compatibility**: Existing build processes continue to work

## Configuration Updates Required

1. **TypeScript Configurations**: Update path mappings in all tsconfig files
2. **Vite Configurations**: Update root directories and aliases
3. **Package.json Scripts**: Update any hardcoded paths
4. **Import Statements**: Update all import paths throughout the codebase

## Deployment Compatibility

The refactored structure maintains full compatibility with:
- Cloudflare Workers deployment
- Node.js server deployment
- Frontend static hosting
- Docker containerization
- All existing monitoring and telemetry