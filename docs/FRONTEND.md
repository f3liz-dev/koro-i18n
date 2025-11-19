# koro-i18n Frontend Documentation

Complete guide to the koro-i18n frontend application built with SolidJS.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [State Management](#state-management)
- [Performance Optimizations](#performance-optimizations)
- [Pages](#pages)
- [Components](#components)
- [Utilities](#utilities)
- [Authentication](#authentication)
- [Routing](#routing)
- [Development Guide](#development-guide)

---

## Overview

The koro-i18n frontend is a modern, high-performance single-page application (SPA) for managing translations. It provides an intuitive interface for browsing projects, selecting languages and files, and editing translations with real-time collaboration features.

### Key Characteristics

- **Framework**: SolidJS for fine-grained reactivity
- **Bundle Size**: Optimized with code splitting and lazy loading
- **Performance**: Smart prefetching, multi-level caching, deferred rendering
- **UX**: Instant navigation, skeleton loaders, optimistic updates
- **Responsive**: Mobile-first design with adaptive layouts
- **Offline-Ready**: Aggressive caching for fast repeated visits

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 SolidJS Application                   │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌────────────────┐  ┌──────────┐ │  │
│  │  │   Router     │  │  State Stores  │  │  Pages   │ │  │
│  │  │  (@solidjs/  │  │  (dataStore,   │  │  (lazy   │ │  │
│  │  │   router)    │  │   appState)    │  │  loaded) │ │  │
│  │  └──────────────┘  └────────────────┘  └──────────┘ │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌────────────────┐  ┌──────────┐ │  │
│  │  │  Components  │  │   Utilities    │  │  Auth    │ │  │
│  │  │  (reusable)  │  │  (cachedFetch, │  │  Layer   │ │  │
│  │  │              │  │   prefetch)    │  │          │ │  │
│  │  └──────────────┘  └────────────────┘  └──────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Caching & Prefetching Layer                │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌────────────────┐  ┌──────────┐ │  │
│  │  │ ForesightJS  │  │  Browser HTTP  │  │ DataStore│ │  │
│  │  │ (predictive) │  │     Cache      │  │ (in-mem) │ │  │
│  │  └──────────────┘  └────────────────┘  └──────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ authFetch (auto 401 handling)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Hono)                        │
│  /api/auth/*  /api/projects/*  /api/translations/*          │
│  /api/r2/*                                                   │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with SPA features
2. **Performance First**: Lazy loading, code splitting, smart prefetching, multi-level caching
3. **User-Centric**: Instant feedback, optimistic updates, skeleton states
4. **Maintainable**: Clear separation of concerns, reusable components, typed interfaces
5. **Responsive**: Mobile-first design, adaptive layouts, touch-optimized

---

## Tech Stack

### Core Technologies

- **[SolidJS](https://www.solidjs.com/)** (v1.9) - Reactive UI framework
  - Fine-grained reactivity (no virtual DOM)
  - Excellent performance characteristics
  - Small bundle size (~7KB)
  - TypeScript-first

- **[@solidjs/router](https://github.com/solidjs/solid-router)** (v0.15) - Client-side routing
  - File-based routing patterns
  - Lazy route loading
  - Nested routes support
  - Navigation guards

- **[Vite](https://vitejs.dev/)** - Build tool and dev server
  - Lightning-fast HMR
  - Optimized production builds
  - Plugin ecosystem

- **[UnoCSS](https://unocss.dev/)** (v66) - Atomic CSS engine
  - On-demand CSS generation
  - Tiny bundle size
  - Tailwind-compatible syntax
  - Zero runtime cost

### Performance Libraries

- **[ForesightJS](https://github.com/foresight-js/foresight.js)** (v3.3) - Predictive prefetching
  - Mouse movement prediction
  - Touch/scroll prediction
  - Tab navigation prediction
  - Customizable hit-slop areas

### Type Safety

- **TypeScript** (v5.2) - Static typing
- **io-ts** (v2.2) - Runtime type validation
  - Shared types across frontend/backend
  - API response validation
  - Type-safe serialization

---

## Project Structure

```
src/app/
├── App.tsx                      # Root component with routing
├── index.tsx                    # Entry point, initializes app
├── auth.ts                      # Authentication state and logic
│
├── pages/                       # Page components (lazy loaded)
│   ├── HomePage.tsx             # Landing page
│   ├── LoginPage.tsx            # GitHub OAuth login
│   ├── DashboardPage.tsx        # Project list
│   ├── LanguageSelectionPage.tsx # Select language to translate
│   ├── FileSelectionPage.tsx    # Select file to translate
│   ├── TranslationEditorPage.tsx # Main translation interface
│   ├── CreateProjectPage.tsx    # Project creation form
│   ├── ProjectSettingsPage.tsx  # Project management
│   ├── JoinProjectPage.tsx      # Join existing project
│   ├── TranslationHistoryPage.tsx # Translation history
│   ├── TranslationSuggestionsPage.tsx # Suggestion review
│   └── NotFoundPage.tsx         # 404 page
│
├── components/                  # Reusable UI components
│   ├── PageHeader.tsx           # Common page header with navigation
│   ├── LoadingSpinner.tsx       # Loading indicator
│   ├── Skeleton.tsx             # Skeleton loaders for content
│   ├── ErrorBoundary.tsx        # Error handling boundary
│   ├── NavigationLoadingBar.tsx # Top loading bar for navigation
│   ├── TopLoadingBar.tsx        # Utility loading bar
│   ├── translation/             # Translation-related components
│   │   ├── TranslationList.tsx      # Translation key list
│   │   ├── TranslationEditorPanel.tsx # Translation editing panel
│   │   ├── TranslationEditorHeader.tsx # Editor page header
│   │   ├── TranslationHistoryPanel.tsx # History display
│   │   └── TranslationSuggestionsPanel.tsx # Suggestions display
│   ├── MobileMenuOverlay.tsx    # Mobile navigation menu
│   └── ForesightButton.tsx      # Button with prefetching
│
├── utils/                       # Utility functions and hooks
│   ├── appState.ts              # Application state tracking
│   ├── authFetch.ts             # Auth-aware fetch wrapper
│   ├── cachedFetch.ts           # Cache-first fetch utilities
│   ├── dataStore.ts             # Centralized data caching (SolidJS stores)
│   ├── translationApi.ts        # Translation API client
│   ├── prefetch.ts              # Smart prefetching with ForesightJS
│   ├── useForesight.ts          # ForesightJS SolidJS hook
│   ├── preloadPages.ts          # Background page preloading
│   └── deferredRendering.ts     # Deferred rendering utilities
│
├── styles/                      # Global styles
│   └── minimal.css              # Minimal, modern CSS used by default (main.css retired)
│
└── public/                      # Static assets
    └── logo.png                 # Application logo
```

---

## Key Features

### 1. Smart Prefetching with ForesightJS

The application uses **ForesightJS** to predict user interactions and prefetch resources before they're needed.

**How it works:**
- Tracks mouse movements, touch gestures, and scroll behavior
- Predicts which links/buttons users are about to click
- Prefetches data when user shows intent (hovers, approaches element)
- Configurable hit-slop areas for larger interaction zones

**Example Usage:**

```typescript
// In DashboardPage.tsx
const projectCardRef = useForesight({
  prefetchUrls: [`/api/projects/${project.name}/files/summary`],
  debugName: `project-card-${project.name}`,
  hitSlop: 10,
});

return (
  <button ref={projectCardRef} onClick={() => navigate(`/projects/${project.name}`)}>
    {project.name}
  </button>
);
```

**Benefits:**
- Instant navigation on click (data already cached)
- Reduced perceived latency
- Improved user experience
- Low network overhead (only prefetches likely targets)

### 2. Multi-Level Caching Strategy

Three layers of caching work together for optimal performance:

#### Layer 1: Browser HTTP Cache
- Standard HTTP caching with Cache-Control headers
- Leveraged by `cachedFetch` utility
- Supports ETag validation (304 Not Modified)
- Cleared on logout or authentication changes

#### Layer 2: DataStore (In-Memory)
- SolidJS stores for application data
- TTL-based cache invalidation
- Per-resource type TTLs:
  - Projects: 5 minutes
  - Files: 10 minutes
  - Translations: 1 minute (frequent changes)
  - Suggestions: 30 seconds (real-time)
- Instant data access when cached (no loading states)

#### Layer 3: Prefetch Cache
- Tracks prefetched URLs to avoid duplicates
- Feeds into browser HTTP cache
- Cleared on navigation or logout

**Example: DataStore Usage**

```typescript
// Fetch projects in background, use cached data immediately
const store = projectsCache.get();
const projects = () => store.projects; // Instant access to cached data
const isLoading = () => !store.lastFetch; // Only show loader if no cache

onMount(() => {
  // Fetch in background, updates store when ready
  projectsCache.fetch(includeLanguages: true);
});
```

### 3. Code Splitting & Lazy Loading

All pages are lazy-loaded to minimize initial bundle size:

```typescript
// App.tsx
const HomePage = lazy(() => import('./pages/HomePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TranslationEditorPage = lazy(() => import('./pages/TranslationEditorPage'));
// ... etc
```

**Benefits:**
- Initial bundle: ~50KB (gzipped)
- Pages loaded on-demand
- Faster initial page load
- Reduced bandwidth usage

### 4. Skeleton Loading States

Skeleton loaders provide visual feedback during data fetching:

```typescript
<Show when={isLoading()}>
  <SkeletonCard />
</Show>

<Show when={!isLoading() && data().length > 0}>
  <For each={data()}>{item => <Card item={item} />}</For>
</Show>
```

### 5. Deferred Rendering

Heavy UI components are deferred to improve perceived performance:

```typescript
import { useDeferredRender } from '../utils/deferredRendering';

const shouldRenderSidebar = useDeferredRender(100); // Delay 100ms

<Show when={shouldRenderSidebar()}>
  <HeavySidebar />
</Show>
```

### 6. Progressive Page Preloading

After initial page load, frequently-used pages are preloaded in the background:

```typescript
// index.tsx - after initial render
preloadFrequentPages(); // Preloads DashboardPage, TranslationEditorPage, etc.
```

Uses `requestIdleCallback` to preload during browser idle time.

### 7. Automatic Authentication Handling

The `authFetch` wrapper automatically handles authentication errors:

```typescript
// Any 401 response triggers:
// 1. Clear all caches (browser + dataStore)
// 2. Call logout endpoint
// 3. Redirect to login page
const response = await authFetch('/api/projects', { credentials: 'include' });
```

### 8. Responsive Design

Mobile-first design with adaptive layouts:
- Desktop: Full navigation bar, side-by-side panels
- Tablet: Collapsed navigation, stacked panels
- Mobile: Hamburger menu, single column layout

Touch-optimized interactions:
- Larger hit areas for buttons
- Swipe gestures for mobile menus
- Optimized scroll behavior

---

## State Management

### Global State

**Authentication State** (`auth.ts`)
```typescript
export const auth = {
  user: User | null,
  isAuthenticated: boolean,
  login: () => Promise<void>,
  logout: () => Promise<void>,
  refresh: () => Promise<void>,
};
```

### Cached Data Stores

**Projects Cache** (`dataStore.ts`)
```typescript
projectsCache.get() // Get cached projects (instant)
projectsCache.fetch(includeLanguages?: boolean, force?: boolean) // Fetch in background
projectsCache.clear() // Clear cache
```

**Files Cache**
```typescript
filesCache.get(projectId, language?) // Get cached files
filesCache.fetch(projectId, language?, filename?, force?) // Fetch in background
filesCache.clear(projectId?) // Clear cache for project
```

**Translations Cache**
```typescript
translationsCache.get(projectId, language, status?) // Get cached translations
translationsCache.fetch(projectId, language, status?, force?) // Fetch in background
translationsCache.clear(projectId?) // Clear cache
```

**File Summary Cache**
```typescript
filesSummaryCache.get(projectId, language?) // Get cached summaries
filesSummaryCache.fetch(projectId, language?, force?) // Fetch in background
filesSummaryCache.clear(projectId?) // Clear cache
```

**Suggestions Cache**
```typescript
suggestionsCache.get(projectId, language, key?) // Get cached suggestions
suggestionsCache.fetch(projectId, language, key?, force?) // Fetch in background
suggestionsCache.clear(projectId?) // Clear cache
```

**Members Cache**
```typescript
membersCache.get(projectId) // Get cached members
membersCache.fetch(projectId, force?) // Fetch in background
membersCache.clear(projectId?) // Clear cache
```

### App State

**First Load Detection** (`appState.ts`)
```typescript
isFirstLoad() // Returns true on page reload, false on SPA navigation
// Used to bypass cache on initial load, use cache for SPA navigation
```

---

## Performance Optimizations

### 1. Bundle Optimization

- **Code Splitting**: All pages lazy-loaded
- **Tree Shaking**: Unused code removed by Vite
- **Minification**: Production builds minified
- **Compression**: Brotli/gzip for static assets

### 2. Network Optimization

- **Prefetching**: ForesightJS predicts and prefetches resources
- **Caching**: Multi-level caching reduces requests
- **ETag Support**: 304 Not Modified for unchanged resources
- **Request Deduplication**: Multiple requests for same resource coalesced

### 3. Runtime Optimization

- **Fine-Grained Reactivity**: SolidJS updates only changed DOM nodes
- **Deferred Rendering**: Heavy components rendered during idle time
- **Virtualization**: Large lists use virtual scrolling (where applicable)
- **Debouncing**: Search inputs debounced to reduce API calls

### 4. Perceived Performance

- **Skeleton Loaders**: Visual feedback during loading
- **Optimistic Updates**: UI updates before API response
- **Instant Navigation**: Cached data shown immediately
- **Loading Indicators**: Progress bars for slow operations

### 5. Memory Management

- **Cache TTLs**: Automatic expiration of stale data
- **Cleanup on Unmount**: Event listeners and subscriptions cleaned up
- **Lazy Imports**: Modules loaded only when needed
- **Prefetch Deduplication**: Avoid redundant prefetch requests

---

## Pages

### HomePage (`HomePage.tsx`)

**Purpose**: Landing page with login/dashboard navigation

**Features**:
- Logo and branding
- Conditional navigation based on auth state
- ForesightJS prefetching for next page

**Routes**: `/`

---

### LoginPage (`LoginPage.tsx`)

**Purpose**: GitHub OAuth authentication flow

**Features**:
- GitHub OAuth button
- Redirects to dashboard after login
- Stores return URL for post-login redirect

**Routes**: `/login`

**Flow**:
1. User clicks "Sign in with GitHub"
2. Redirects to `/api/auth/github`
3. GitHub OAuth flow
4. Callback to `/api/auth/callback`
5. Sets JWT cookie
6. Redirects to dashboard or stored URL

---

### DashboardPage (`DashboardPage.tsx`)

**Purpose**: Project list and management

**Features**:
- List all user projects
- Show project languages and progress
- Create new project button
- Delete project (owners only)
- Manage project settings (owners only)
- ForesightJS on project cards

**Routes**: `/dashboard`

**Data Sources**:
- `projectsCache` - cached project list
- Auto-fetches on mount with force refresh

---

### LanguageSelectionPage (`LanguageSelectionPage.tsx`)

**Purpose**: Select target language to translate

**Features**:
- List available languages for project
- Show translation progress per language
- Navigate to file selection

**Routes**: `/projects/:projectName`

**Data Sources**:
- `filesSummaryCache` - file summaries per language

---

### FileSelectionPage (`FileSelectionPage.tsx`)

**Purpose**: Select file to translate for chosen language

**Features**:
- List files for project + language
- Show translation progress per file
- Navigate to translation editor

**Routes**: `/projects/:projectName/language/:language`

**Data Sources**:
- `filesSummaryCache` - file summaries with progress

---

### TranslationEditorPage (`TranslationEditorPage.tsx`)

**Purpose**: Main translation interface

**Features**:
- Split-panel layout: keys list + editor panel
- Search and filter translations
- Show source value + git blame info
- Edit translation value
- View/approve/reject suggestions
- Real-time updates
- Keyboard shortcuts
- Auto-save draft translations

**Routes**: 
- `/projects/:projectName/translate/:language/:filename`
- `/projects/:projectName/translate/:language?`

**Data Sources**:
- R2 API: Source file (git imports)
- R2 API: Target file (git imports)
- D1 API: Web translations (user edits)
- Suggestions API: Pending suggestions

**Workflow**:
1. Load project info
2. Fetch source R2 file (for source values + git blame)
3. Fetch target R2 file (for existing translations)
4. Fetch web translations from D1 (overrides)
5. Merge data: source + target + web
6. Display in UI with validation status
7. User edits and saves translations

---

### CreateProjectPage (`CreateProjectPage.tsx`)

**Purpose**: Create new translation project

**Features**:
- Project name input
- GitHub repository URL
- Source language selection
- Access control settings (whitelist/blacklist)

**Routes**: `/projects/create`

**API**: `POST /api/projects`

---

### ProjectSettingsPage (`ProjectSettingsPage.tsx`)

**Purpose**: Manage project settings and members

**Features**:
- Edit project settings
- Manage member access (approve/reject)
- Whitelist/blacklist configuration
- Delete project

**Routes**: `/projects/:projectName/settings`

**Authorization**: Project owner only

---

### JoinProjectPage (`JoinProjectPage.tsx`)

**Purpose**: Request to join existing project

**Features**:
- Search for projects
- Request membership
- View request status

**Routes**: `/projects/join`

**API**: `POST /api/projects/:id/members`

---

### TranslationHistoryPage (`TranslationHistoryPage.tsx`)

**Purpose**: View user's translation history

**Features**:
- List recent translations
- Filter by project/language
- View translation details
- Navigate to editor

**Routes**: `/history`

**Data Sources**:
- `GET /api/translations/history`

---

### TranslationSuggestionsPage (`TranslationSuggestionsPage.tsx`)

**Purpose**: Review pending translation suggestions

**Features**:
- List pending suggestions
- Approve/reject suggestions
- View suggestion details
- Navigate to editor

**Routes**: `/projects/:projectName/suggestions`

**Data Sources**:
- `suggestionsCache`

---

### NotFoundPage (`NotFoundPage.tsx`)

**Purpose**: 404 error page

**Features**:
- Friendly error message
- Link back to dashboard

**Routes**: `*` (catch-all)

---

## Components

### PageHeader (`PageHeader.tsx`)

Reusable header component with navigation and menu.

**Props**:
```typescript
interface PageHeaderProps {
  title: string;              // Page title
  subtitle?: string;          // Optional subtitle (HTML)
  logo?: boolean;             // Show logo
  backButton?: {              // Optional back button
    onClick: () => void;
    ref?: (el: HTMLButtonElement) => void;
  };
  menuItems?: MenuItem[];     // Menu items (responsive)
  children?: JSX.Element;     // Custom header content
}
```

**Features**:
- Responsive design (desktop menu + mobile hamburger)
- Support for ForesightJS refs on menu items
- Custom variants (default, primary, danger)
- Mobile slide-in menu

---

### TranslationList (`components/translation/TranslationList.tsx`)

List of translation keys with search and filters.

**Props**:
```typescript
interface TranslationListProps {
  translations: MergedTranslation[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: 'all' | 'valid' | 'invalid';
  onFilterChange: (status: 'all' | 'valid' | 'invalid') => void;
}
```

**Features**:
- Virtual scrolling for large lists
- Real-time search filtering
- Status badges (web/git, valid/invalid)
- Highlight selected key

---

### TranslationEditorPanel (`components/translation/TranslationEditorPanel.tsx`)

Translation editing panel with source and target sections.

**Props**:
```typescript
interface TranslationEditorPanelProps {
  selectedTranslation: MergedTranslation | null;
  translationValue: string;
  onValueChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  suggestions: WebTranslation[];
  showSuggestions: boolean;
  onToggleSuggestions: () => void;
  onApproveSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
}
```

**Features**:
- Source value display
- Git blame information (commit, author, date)
- Translation input with auto-resize
- Suggestions list with approve/reject
- Validation status indicators
- Save button with loading state

---

### LoadingSpinner (`LoadingSpinner.tsx`)

Simple loading spinner for full-page loads.

---

### Skeleton (`Skeleton.tsx`)

Skeleton loaders for various content types.

**Exports**:
- `SkeletonCard` - Card skeleton for project/file lists
- `SkeletonList` - List skeleton for translations
- `SkeletonText` - Text skeleton for inline content

---

### ErrorBoundary (`ErrorBoundary.tsx`)

Error boundary to catch and display errors gracefully.

**Features**:
- Catches React/SolidJS errors
- Displays user-friendly error message
- Option to retry or go back

---

### NavigationLoadingBar (`NavigationLoadingBar.tsx`)

Top loading bar that appears during slow route transitions.

**Props**:
```typescript
interface NavigationLoadingBarProps {
  threshold?: number; // Only show if navigation takes longer than threshold (ms)
}
```

---

### MobileMenuOverlay (`MobileMenuOverlay.tsx`)

Slide-in mobile menu overlay.

---

### ForesightButton (`ForesightButton.tsx`)

Button component with built-in ForesightJS prefetching.

---

## Utilities

### authFetch (`authFetch.ts`)

Enhanced fetch that automatically handles authentication errors.

```typescript
const response = await authFetch('/api/projects', { credentials: 'include' });
// On 401: clears caches, logs out, redirects to login
```

**Features**:
- Automatic 401 handling
- Cache clearing on auth errors
- Preserves fetch API signature

---

### cachedFetch (`cachedFetch.ts`)

Cache-first fetch utilities for optimal performance.

```typescript
// Try cache first, fall back to network
const response = await cachedFetch('/api/projects', { 
  credentials: 'include',
  tryCache: true 
});

// Get cached data only (no network)
const cached = await tryGetCached('/api/projects');

// Create SolidJS resource fetcher with caching
const fetcher = createCachedFetcher({ credentials: 'include' });
const [data] = createResource(() => '/api/projects', fetcher);

// Clear browser cache
await clearBrowserCache(['/api/auth/me', '/api/projects']);
```

---

### dataStore (`dataStore.ts`)

Centralized data caching with SolidJS stores.

**Stores**:
- `projectsCache` - Projects with TTL: 5min
- `filesCache` - Files with TTL: 10min
- `translationsCache` - Translations with TTL: 1min
- `filesSummaryCache` - File summaries with TTL: 10min
- `suggestionsCache` - Suggestions with TTL: 30s
- `membersCache` - Project members with TTL: 5min

**API**:
```typescript
const store = projectsCache.get(); // Get cached data (instant)
projectsCache.fetch(options, force); // Fetch in background
projectsCache.clear(id?); // Clear cache
```

**Benefits**:
- Instant data access (no loading states when cached)
- Background updates
- TTL-based invalidation
- Per-resource cache control

---

### translationApi (`translationApi.ts`)

API client for translation operations.

```typescript
// Fetch R2 file (GitHub import)
const r2Data = await fetchR2File(projectId, lang, filename);

// Fetch web translations (user edits)
const webTranslations = await fetchWebTranslations(projectId, language, filename);

// Merge R2 + web translations
const merged = mergeTranslationsWithSource(sourceR2, targetR2, webTranslations);

// Submit translation
await submitTranslation(projectId, language, filename, key, value);

// Suggestions
const suggestions = await fetchSuggestions(projectId, language, filename, key);
await approveSuggestion(id);
await rejectSuggestion(id);
```

---

### prefetch (`prefetch.ts`)

Smart prefetching with ForesightJS integration.

```typescript
// Initialize ForesightJS (call once on app start)
initializeForesight();

// Prefetch single URL
await prefetchData('/api/projects');

// Prefetch multiple URLs
prefetchMultiple(['/api/projects', '/api/translations']);

// Prefetch based on route context
prefetchForRoute('dashboard'); // Prefetches /api/projects

// Register navigation element for auto-prefetching
registerNavigationElement(
  buttonElement,
  ['/api/projects'],
  hitSlop: 20 // Optional hit slop in pixels
);
```

---

### useForesight (`useForesight.ts`)

SolidJS hook for ForesightJS integration.

```typescript
const buttonRef = useForesight({
  prefetchUrls: ['/api/projects'],
  hitSlop: 20,
  debugName: 'projects-button',
  onPrefetch: () => {
    // Custom prefetch logic
  },
});

<button ref={buttonRef}>Projects</button>
```

---

### preloadPages (`preloadPages.ts`)

Background page preloading after initial render.

```typescript
// Called automatically in index.tsx
preloadFrequentPages();
// Preloads: LoginPage, DashboardPage, LanguageSelectionPage, FileSelectionPage, TranslationEditorPage
```

Uses `requestIdleCallback` for idle-time preloading.

---

### deferredRendering (`deferredRendering.ts`)

Utilities for deferred rendering to improve perceived performance.

```typescript
// Defer value updates
const deferredData = useDeferredValue(() => heavyData());

// Defer rendering
const shouldRender = useDeferredRender(100); // Delay 100ms
<Show when={shouldRender()}><HeavyComponent /></Show>

// Transition hook
const [isPending, startTransition] = useTransition();
startTransition(() => {
  setFilteredResults(filter(data()));
});
```

---

### appState (`appState.ts`)

Application state tracking for initialization and reload events.

```typescript
// Check if this is first load (page reload)
if (isFirstLoad()) {
  // Bypass cache, fetch fresh data
  fetch('/api/auth/me', { cache: 'reload' });
} else {
  // Use cached data for SPA navigation
  fetch('/api/auth/me');
}
```

---

## Authentication

### Flow

1. **Login Initiation**
   - User clicks "Sign in with GitHub"
   - Redirects to `/api/auth/github`

2. **GitHub OAuth**
   - User authorizes on GitHub
   - Callback to `/api/auth/callback?code=...&state=...`

3. **Token Exchange**
   - Backend exchanges code for GitHub access token
   - Fetches user info from GitHub
   - Creates/updates user in D1
   - Generates JWT token

4. **Session Setup**
   - Sets JWT cookie (HttpOnly, Secure)
   - Redirects to dashboard or stored URL

5. **Authenticated Requests**
   - Frontend sends JWT in cookie
   - Backend verifies JWT signature
   - Extracts user info from token

6. **Token Expiration**
   - JWT expires after configured duration
   - 401 response triggers automatic logout
   - User redirected to login page

### Authentication State

```typescript
// Global auth object
auth.user // Current user or null
auth.isAuthenticated // Boolean
auth.login() // Navigate to login page
auth.logout() // Clear caches, logout, redirect to home
auth.refresh() // Refresh user data
```

### Protected Routes

All routes except `/` and `/login` require authentication:

```typescript
// In page components
onMount(() => {
  if (!user()) {
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/login');
  }
});
```

### Automatic Logout on 401

The `authFetch` utility handles authentication errors automatically:

```typescript
// Any 401 response triggers:
if (response.status === 401) {
  // 1. Clear all caches
  clearAllCaches();
  await clearBrowserCache();
  
  // 2. Call logout endpoint
  await fetch('/api/auth/logout', { method: 'POST' });
  
  // 3. Redirect to login
  window.location.href = '/login';
}
```

---

## Routing

### Route Configuration

```typescript
<Router root={RootLayout}>
  <Route path="/" component={HomePage} />
  <Route path="/login" component={LoginPage} />
  <Route path="/dashboard" component={DashboardPage} />
  
  <Route path="/projects/create" component={CreateProjectPage} />
  <Route path="/projects/join" component={JoinProjectPage} />
  <Route path="/projects/:id" component={LanguageSelectionPage} />
  <Route path="/projects/:id/language/:language" component={FileSelectionPage} />
  <Route path="/projects/:id/settings" component={ProjectSettingsPage} />
  
  <Route path="/projects/:projectName/translate/:language/:filename" component={TranslationEditorPage} />
  <Route path="/projects/:projectName/suggestions" component={TranslationSuggestionsPage} />
  
  <Route path="/history" component={TranslationHistoryPage} />
  <Route path="*" component={NotFoundPage} />
</Router>
```

### Lazy Loading

All pages are lazy-loaded for optimal initial bundle size:

```typescript
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TranslationEditorPage = lazy(() => import('./pages/TranslationEditorPage'));
// ... etc
```

### Navigation Loading Bar

Shows progress bar for slow route transitions (>300ms):

```typescript
<NavigationLoadingBar threshold={300} />
```

### Route Prefetching

ForesightJS automatically prefetches routes based on user intent:

```typescript
// Button with prefetching
const dashboardButtonRef = useForesight({
  prefetchUrls: ['/api/projects'],
  debugName: 'dashboard-button',
});

<button ref={dashboardButtonRef} onClick={() => navigate('/dashboard')}>
  Dashboard
</button>
```

---

## Development Guide

### Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm run prisma:generate

# Start dev server (frontend only)
pnpm run dev

# Start workers dev server (backend only)
pnpm run dev:workers

# Start both (recommended)
pnpm run dev:all
```

### Project Commands

```bash
# Development
pnpm run dev              # Vite dev server (port 5173)
pnpm run dev:workers      # Wrangler dev server (port 8787)
pnpm run dev:all          # Both servers

# Building
pnpm run build            # Build for production

# Testing
pnpm run test             # Run tests with Vitest
pnpm run test:watch       # Watch mode

# Type Checking
pnpm run type-check       # TypeScript type checking

# Deployment
pnpm run deploy           # Build and deploy to Cloudflare
```

### Development Tips

1. **Hot Module Replacement (HMR)**
   - Vite provides instant HMR for frontend changes
   - SolidJS preserves component state during HMR
   - Styles update without page reload

2. **Browser DevTools**
   - Use React DevTools with SolidJS compatibility
   - Network tab to inspect API calls and caching
   - Application tab to inspect cookies and storage

3. **Debugging**
   - Console logs with prefixes: `[Auth]`, `[DataStore]`, `[ForesightJS]`
   - Network waterfall to verify prefetching
   - Performance profiler for optimization

4. **Testing Changes**
   - Use `force` parameter to bypass cache: `projectsCache.fetch(true, true)`
   - Clear browser cache: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Incognito mode for clean state

5. **Performance Testing**
   - Chrome Lighthouse for metrics
   - Network throttling to simulate slow connections
   - Disable cache to test cold start performance

### Common Patterns

#### Creating a New Page

1. Create page component in `src/app/pages/`
2. Add lazy import in `App.tsx`
3. Add route in router configuration
4. Add prefetching with ForesightJS
5. Add to `preloadPages.ts` if frequently used

#### Adding Caching to API Call

1. Add store to `dataStore.ts` with appropriate TTL
2. Call `fetch()` in `onMount()`
3. Access cached data with `get()`
4. Handle loading state: `const isLoading = () => !store.lastFetch`

#### Adding Prefetching to Button

```typescript
const buttonRef = useForesight({
  prefetchUrls: ['/api/endpoint'],
  debugName: 'my-button',
});

<button ref={buttonRef} onClick={handleClick}>
  Click Me
</button>
```

### Performance Best Practices

1. **Always use lazy loading for pages**
2. **Use ForesightJS for navigation elements**
3. **Cache API responses with appropriate TTLs**
4. **Defer rendering of heavy components**
5. **Use skeleton loaders for better UX**
6. **Avoid unnecessary re-renders** (SolidJS fine-grained reactivity)
7. **Optimize images** (use appropriate formats and sizes)
8. **Minimize bundle size** (tree-shaking, code splitting)

---

## Related Documentation

- **[Frontend Architecture](FRONTEND_ARCHITECTURE.md)** - Deep dive into architectural decisions
- **[Backend API](BACKEND_API.md)** - API endpoint reference
- **[Technical Flows](FLOWS.md)** - Complete system flows
- **[Architecture](ARCHITECTURE.md)** - Overall system architecture
- **[Testing Guide](TESTING.md)** - How to test the application

---

## License

MIT
