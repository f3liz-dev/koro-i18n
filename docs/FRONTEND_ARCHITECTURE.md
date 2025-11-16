# koro-i18n Frontend Architecture

Deep dive into the architectural decisions, patterns, and design philosophy behind the koro-i18n frontend application.

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Technology Choices](#technology-choices)
- [Performance Architecture](#performance-architecture)
- [Caching Strategy](#caching-strategy)
- [State Management](#state-management)
- [Component Architecture](#component-architecture)
- [Routing & Navigation](#routing--navigation)
- [Error Handling](#error-handling)
- [Type Safety](#type-safety)
- [Bundle Optimization](#bundle-optimization)
- [Development Workflow](#development-workflow)

---

## Design Philosophy

### Core Principles

1. **Performance First**
   - Every feature evaluated for performance impact
   - Lazy loading by default
   - Aggressive caching with intelligent invalidation
   - Predictive prefetching

2. **Progressive Enhancement**
   - Core functionality works without JavaScript
   - Enhanced with SPA features when available
   - Graceful degradation for older browsers

3. **User Experience**
   - Instant feedback (no waiting states when cached)
   - Skeleton loaders for perceived performance
   - Optimistic updates
   - Smooth transitions

4. **Developer Experience**
   - Clear separation of concerns
   - Reusable components and utilities
   - TypeScript for type safety
   - Consistent patterns across codebase

5. **Maintainability**
   - Small, focused components
   - Shared utilities for common patterns
   - Comprehensive documentation
   - Clear naming conventions

### Architecture Goals

- **Fast Initial Load**: <100ms to interactive on fast connections
- **Instant Navigation**: <50ms for cached routes
- **Small Bundle Size**: <50KB initial bundle (gzipped)
- **Low Memory Usage**: Aggressive cache invalidation
- **Offline Support**: Works with cached data when offline

---

## Technology Choices

### Why SolidJS?

**Fine-Grained Reactivity**
- No virtual DOM overhead
- Updates only changed DOM nodes
- Predictable performance characteristics
- No reconciliation cost

**Small Bundle Size**
- ~7KB core library (gzipped)
- Smaller than React (~45KB) or Vue (~33KB)
- Critical for fast initial loads

**TypeScript-First**
- Excellent TypeScript support
- Strong typing for props and signals
- Better IDE integration

**Performance**
- Faster than React in most benchmarks
- No wasted renders
- Automatic dependency tracking

**Example: Fine-Grained Reactivity**

```typescript
// React: entire component re-renders when count changes
function Counter() {
  const [count, setCount] = useState(0);
  return <div>Count: {count}</div>; // Entire div re-renders
}

// SolidJS: only the text node updates
function Counter() {
  const [count, setCount] = createSignal(0);
  return <div>Count: {count()}</div>; // Only text node updates
}
```

### Why @solidjs/router?

- Built for SolidJS patterns
- Lazy route loading out of the box
- Nested routes support
- Small bundle size
- File-based routing patterns

### Why UnoCSS?

**On-Demand CSS Generation**
- Only generates CSS for classes actually used
- No unused CSS in production
- Smaller CSS bundle

**Zero Runtime Cost**
- All CSS generated at build time
- No runtime style injection
- Faster than CSS-in-JS solutions

**Tailwind-Compatible Syntax**
- Familiar utility classes
- Easy migration from Tailwind
- Extensive preset library

**Performance Benefits**
- Typical CSS bundle: <5KB (gzipped)
- Compared to ~30KB+ for full Tailwind

### Why ForesightJS?

**Predictive Prefetching**
- User research shows 300-500ms hover before click
- Prefetch during this time = instant navigation
- Better than link prefetching (prefetches everything)
- Better than hover prefetching (300ms delay anyway)

**Intelligent Prediction**
- Mouse movement tracking
- Touch gesture prediction
- Scroll behavior analysis
- Tab navigation prediction

**Configurable**
- Adjustable hit-slop areas
- Per-element configuration
- Strategy selection (touch, scroll, mouse)
- Debug mode for development

**Results**
- 80-90% reduction in perceived latency
- Instant navigation for predicted routes
- Minimal bandwidth overhead (~5-10% increase)

---

## Performance Architecture

### Multi-Layer Caching Strategy

```
User Request
    │
    ├─► Layer 1: In-Memory Cache (dataStore)
    │   ├─ TTL: 30s - 10min (per resource type)
    │   ├─ Instant access (0ms)
    │   └─ Background refresh when stale
    │
    ├─► Layer 2: Browser HTTP Cache
    │   ├─ Standard HTTP caching
    │   ├─ ETag validation
    │   └─ Fast access (~5-10ms)
    │
    └─► Layer 3: Network Request
        ├─ Full API call to backend
        ├─ Slowest path (~50-200ms)
        └─ Updates all cache layers
```

### Cache TTLs by Resource Type

```typescript
// Fast-changing data (real-time collaboration)
Suggestions: 30 seconds

// Frequently changing data (user edits)
Translations: 1 minute

// Moderately changing data (project activity)
Projects: 5 minutes
Members: 5 minutes

// Slowly changing data (file structure)
Files: 10 minutes
File Summaries: 10 minutes
```

### Prefetch Strategy

**Levels of Prefetching**

1. **Critical Path**: Preloaded in `index.tsx`
   - Authentication state
   - User profile
   - Frequent pages (dashboard, editor)

2. **Likely Path**: ForesightJS prediction
   - Project cards hover → file summary
   - Dashboard button hover → projects API
   - Navigation links hover → target page data

3. **Idle Time**: Background preloading
   - Frequent pages preloaded during browser idle
   - Uses `requestIdleCallback` for zero impact
   - Cancelled if user navigates

**Prefetch Decision Tree**

```
User Action
    │
    ├─► Mouse enters hit-slop area
    │   └─► ForesightJS triggers prefetch callback
    │       └─► fetch() with priority: 'low'
    │
    ├─► Page becomes idle
    │   └─► requestIdleCallback() executes
    │       └─► Preload frequent pages
    │
    └─► Component mounts
        └─► Check dataStore cache
            ├─► Cache hit: Use cached data (instant)
            └─► Cache miss: Fetch in background
```

### Bundle Splitting Strategy

```
Initial Bundle (~45KB gzipped)
├─ Core SolidJS (~7KB)
├─ Router (~3KB)
├─ UnoCSS (~2KB)
├─ App Shell (~15KB)
├─ HomePage (~3KB)
├─ LoginPage (~2KB)
├─ Utilities (~10KB)
└─ Dependencies (~3KB)

Lazy-Loaded Chunks
├─ DashboardPage (~8KB)
├─ TranslationEditorPage (~15KB)
├─ FileSelectionPage (~6KB)
├─ LanguageSelectionPage (~6KB)
├─ CreateProjectPage (~5KB)
├─ ProjectSettingsPage (~8KB)
└─ Other Pages (~3KB each)
```

### Render Performance

**Initial Render Optimization**

1. **Critical Content First**
   ```typescript
   // Render header immediately
   <PageHeader />
   
   // Defer heavy content
   const shouldRenderList = useDeferredRender();
   <Show when={shouldRenderList()}>
     <TranslationList />
   </Show>
   ```

2. **Progressive Rendering**
   ```typescript
   // Show cached data immediately (0ms)
   const cachedProjects = projectsCache.get().projects;
   
   // Fetch fresh data in background
   onMount(() => projectsCache.fetch());
   
   // UI updates automatically when fresh data arrives
   ```

3. **Skeleton States**
   ```typescript
   // Show skeleton only if no cached data
   <Show when={!cachedData} fallback={<Skeleton />}>
     <Content data={cachedData} />
   </Show>
   ```

**List Rendering**

For large lists (>100 items), use virtual scrolling:
```typescript
// Note: Not yet implemented, but recommended pattern
import { VirtualList } from 'solid-virtual-list';

<VirtualList
  items={translations()}
  itemHeight={60}
  overscan={10}
>
  {(item) => <TranslationItem item={item} />}
</VirtualList>
```

---

## Caching Strategy

### DataStore Architecture

**Design Principles**

1. **Cache First**: Always check cache before network
2. **Background Refresh**: Update cache without blocking UI
3. **TTL-Based Invalidation**: Automatic expiration
4. **Granular Control**: Clear specific resources
5. **Type Safety**: Strongly typed stores

**Implementation Pattern**

```typescript
// 1. Define store structure
interface ProjectsState {
  projects: Project[];
  lastFetch: number | null;
}

// 2. Create SolidJS store
const [projectsStore, setProjectsStore] = createStore<ProjectsState>({
  projects: [],
  lastFetch: null,
});

// 3. Export cache interface
export const projectsCache = {
  // Get cached data (instant)
  get: () => projectsStore,
  
  // Fetch in background
  async fetch(force = false) {
    // Check TTL
    const age = Date.now() - (projectsStore.lastFetch || 0);
    if (!force && age < 5 * 60 * 1000) {
      return; // Still fresh
    }
    
    // Fetch in background (don't await)
    authFetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjectsStore({
          projects: data.projects,
          lastFetch: Date.now(),
        });
      });
  },
  
  // Clear cache
  clear() {
    setProjectsStore({ projects: [], lastFetch: null });
  },
};
```

**Usage Pattern**

```typescript
function DashboardPage() {
  // Get cached data (instant access)
  const store = projectsCache.get();
  const projects = () => store.projects;
  const isLoading = () => !store.lastFetch; // True only if no cache
  
  onMount(() => {
    // Fetch in background, updates store automatically
    projectsCache.fetch();
  });
  
  return (
    <Show when={isLoading()} fallback={<ProjectList projects={projects()} />}>
      <SkeletonList />
    </Show>
  );
}
```

### Browser HTTP Cache

**Leveraging Standard HTTP Caching**

The backend sets appropriate `Cache-Control` headers:
```
Cache-Control: public, max-age=3600
ETag: "abc123"
```

Frontend utilities respect these headers:

```typescript
// cachedFetch with tryCache=true uses browser cache
const response = await cachedFetch('/api/projects', {
  credentials: 'include',
  tryCache: true, // Prefer cache over network
});
```

**ETag Support**

Backend generates ETags for cacheable responses:
```typescript
// Backend
const etag = generateETag(data);
return c.json(data, {
  headers: { 'ETag': etag },
});

// Frontend automatic handling
// If server returns 304 Not Modified, browser uses cached response
```

**Cache Invalidation**

Caches are cleared on:
1. **Logout**: All caches cleared
2. **401 Response**: All caches cleared
3. **Manual Refresh**: User-initiated cache clear
4. **Resource Updates**: Specific resource caches cleared

```typescript
// Clear all caches on logout
clearAllCaches(); // Clear dataStore
await clearBrowserCache(); // Clear browser HTTP cache
```

### Prefetch Cache

**Deduplication Cache**

Tracks prefetched URLs to avoid redundant requests:

```typescript
const prefetchCache = new Set<string>();

export async function prefetchData(url: string) {
  // Skip if already prefetched
  if (prefetchCache.has(url)) return;
  
  // Mark as prefetching
  prefetchCache.add(url);
  
  // Perform fetch (populates browser cache)
  fetch(url, { credentials: 'include', priority: 'low' })
    .catch(() => {
      // Remove from cache on error (allow retry)
      prefetchCache.delete(url);
    });
}
```

**Benefits**
- Prevents duplicate prefetch requests
- Allows retry on failure
- Minimal memory overhead

---

## State Management

### Global State vs Local State

**Global State (Rare)**
- Authentication state (`auth.ts`)
- Rarely changes
- Needed across entire app

**Cached Data State (Common)**
- DataStore caches (`dataStore.ts`)
- TTL-based invalidation
- Background refresh

**Local State (Most Common)**
- Component-specific state
- SolidJS signals and stores
- Scoped to component tree

**Example: Local State**

```typescript
function TranslationEditorPage() {
  // Local signals
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'valid' | 'invalid'>('all');
  
  // Local store for complex state
  const [editorState, setEditorState] = createStore({
    isDirty: false,
    isSaving: false,
    lastSaved: null,
  });
  
  // No need for global state - scoped to this component
}
```

### Authentication State

**Design**

- Single source of truth: `auth.ts`
- Backed by JWT cookie
- Refreshed on page load
- Reactive updates via SolidJS signals

**Implementation**

```typescript
// Signal for current user
const [userSignal, setUser] = createSignal<User | null>(null);

// Resource for initial load
const [initialUser, { refetch }] = createResource(async () => {
  const isPageReload = isFirstLoad(); // Detect page reload
  return fetchUser(isPageReload); // Bypass cache on reload
});

// Exported accessor
export const user = () => userSignal() || initialUser();

// Auth object
export const auth = {
  get user() { return userSignal() || initialUser(); },
  get isAuthenticated() { return !!this.user; },
  login, logout, refresh
};
```

**Usage**

```typescript
// In any component
import { user, auth } from '../auth';

function MyComponent() {
  const currentUser = user(); // Get current user
  
  onMount(() => {
    if (!user()) {
      navigate('/login'); // Redirect if not authenticated
    }
  });
}
```

### Cached Data State

**DataStore Pattern**

All cached data follows the same pattern:

1. **SolidJS Store**: Reactive data container
2. **TTL Tracking**: Automatic expiration
3. **Background Fetch**: Non-blocking updates
4. **Cache Interface**: Consistent API

**Store Structure**

```typescript
interface CacheEntry<T> {
  data: T;
  lastFetch: number;
}

const [store, setStore] = createStore<Record<string, CacheEntry<T>>>({});
```

**Benefits**

- Instant data access (no async)
- Automatic reactivity (UI updates when data changes)
- TTL-based invalidation (stale data refreshed)
- Background updates (no loading states)

---

## Component Architecture

### Component Hierarchy

```
App
├── Router
│   └── RootLayout
│       ├── NavigationLoadingBar
│       └── Suspense
│           └── {Page Component}
│               ├── PageHeader
│               │   ├── Logo (optional)
│               │   ├── Title & Subtitle
│               │   ├── Back Button (optional)
│               │   └── Menu Items
│               │       └── MobileMenuOverlay
│               ├── {Page Content}
│               │   ├── Loading States (Skeleton)
│               │   └── Content Components
│               └── ErrorBoundary
```

### Component Design Patterns

**1. Presentation vs Container Components**

```typescript
// Container Component (logic)
function DashboardPageContainer() {
  const store = projectsCache.get();
  const projects = () => store.projects;
  
  onMount(() => projectsCache.fetch());
  
  return <DashboardPagePresentation projects={projects()} />;
}

// Presentation Component (UI)
function DashboardPagePresentation(props: { projects: Project[] }) {
  return (
    <For each={props.projects}>
      {project => <ProjectCard project={project} />}
    </For>
  );
}
```

**2. Compound Components**

```typescript
// Parent component with shared context
function TranslationEditor() {
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  
  return (
    <TranslationEditorProvider value={{ selectedKey, setSelectedKey }}>
      <TranslationList />
      <TranslationEditorPanel />
    </TranslationEditorProvider>
  );
}

// Child components access context
function TranslationList() {
  const { selectedKey, setSelectedKey } = useTranslationEditor();
  // ...
}
```

**3. Render Props**

```typescript
function List<T>(props: {
  items: T[];
  renderItem: (item: T) => JSX.Element;
}) {
  return (
    <For each={props.items}>
      {item => props.renderItem(item)}
    </For>
  );
}

// Usage
<List
  items={projects()}
  renderItem={(project) => <ProjectCard project={project} />}
/>
```

**4. Higher-Order Components (Rare in SolidJS)**

Prefer composition and hooks over HOCs:

```typescript
// Instead of HOC:
// withAuth(MyComponent)

// Use composition:
function ProtectedPage() {
  onMount(() => {
    if (!user()) navigate('/login');
  });
  
  return <MyComponent />;
}
```

### Component Lifecycle

**SolidJS Lifecycle Hooks**

```typescript
function MyComponent() {
  // Runs once on mount
  onMount(() => {
    console.log('Component mounted');
    
    // Cleanup function
    return () => {
      console.log('Component unmounted');
    };
  });
  
  // Cleanup only
  onCleanup(() => {
    console.log('Cleanup');
  });
  
  // Reactive effect (runs when dependencies change)
  createEffect(() => {
    console.log('User changed:', user());
  });
}
```

### Ref Pattern

```typescript
function MyComponent() {
  let buttonRef: HTMLButtonElement | undefined;
  
  // Via ref attribute
  <button ref={buttonRef}>Click</button>
  
  // Via callback ref (for ForesightJS)
  const foresightRef = useForesight({
    prefetchUrls: ['/api/data'],
  });
  
  <button ref={foresightRef}>Click</button>
}
```

---

## Routing & Navigation

### Route Structure

**Flat Routes** (No Nesting)

```typescript
// All routes at same level for simplicity
<Route path="/" component={HomePage} />
<Route path="/dashboard" component={DashboardPage} />
<Route path="/projects/:id" component={LanguageSelectionPage} />
```

**Benefits**:
- Simple mental model
- Easy to understand
- No layout complexity
- Each page controls its layout

### Lazy Loading

**All Pages Lazy-Loaded**

```typescript
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
```

**Benefits**:
- Smaller initial bundle
- Pages loaded on demand
- Faster initial page load
- Better code splitting

### Navigation

**Programmatic Navigation**

```typescript
import { useNavigate } from '@solidjs/router';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/dashboard');
  };
}
```

**Link Component** (Rare - prefer buttons with navigate)

```typescript
import { A } from '@solidjs/router';

<A href="/dashboard">Dashboard</A>
```

**Why Prefer navigate?**
- Better control over navigation
- Can add logic before navigation
- Works with ForesightJS prefetching
- Consistent with SPA patterns

### Navigation Loading

**Top Loading Bar**

Shows progress for slow transitions:

```typescript
<NavigationLoadingBar threshold={300} />
// Only shows if navigation takes >300ms
```

**Implementation**:
- Monitors route changes
- Starts timer on navigation
- Shows bar if threshold exceeded
- Hides on route load complete

---

## Error Handling

### Error Boundary

**Global Error Boundary**

```typescript
// App.tsx
<ErrorBoundary>
  <Router>
    {/* All routes */}
  </Router>
</ErrorBoundary>
```

**Catches**:
- Component render errors
- Signal computation errors
- Unhandled promise rejections (with setup)

**UI**:
- Friendly error message
- Retry button
- Go back button
- Error details (dev mode)

### API Error Handling

**authFetch Auto-Handling**

```typescript
// Automatic 401 handling
const response = await authFetch('/api/endpoint');
// If 401: clears caches, logs out, redirects to login
```

**Manual Error Handling**

```typescript
try {
  const response = await authFetch('/api/endpoint');
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
  // Show error message to user
}
```

### User-Friendly Errors

**Pattern**:

```typescript
const [error, setError] = createSignal<string | null>(null);

async function handleSubmit() {
  try {
    setError(null); // Clear previous error
    await submitData();
  } catch (error) {
    setError('Failed to submit. Please try again.');
  }
}

<Show when={error()}>
  <div class="error-message">{error()}</div>
</Show>
```

---

## Type Safety

### TypeScript Configuration

**Strict Mode Enabled**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Shared Types

**Runtime Validation with io-ts**

```typescript
// shared/types.ts
import * as t from 'io-ts';

export const WebTranslation = t.type({
  id: t.string,
  key: t.string,
  value: t.string,
  // ...
});

export type WebTranslation = t.TypeOf<typeof WebTranslation>;

// Validate API responses
const response = await fetch('/api/translations');
const data = await response.json();
const validated = validate(WebTranslation, data, 'WebTranslation');
```

**Benefits**:
- Type safety at runtime
- Catches API contract violations
- Self-documenting types
- Shared across frontend/backend

### Component Props

**Always Type Props**

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

function Button(props: ButtonProps) {
  // TypeScript knows props shape
}
```

### Signal Types

```typescript
// Explicit type
const [count, setCount] = createSignal<number>(0);

// Inferred type
const [name, setName] = createSignal(''); // string

// Union type
const [status, setStatus] = createSignal<'idle' | 'loading' | 'error'>('idle');
```

---

## Bundle Optimization

### Code Splitting Strategies

**1. Route-Based Splitting**
- All pages lazy-loaded
- Each page = separate chunk
- Loaded on demand

**2. Component-Based Splitting** (Future)
- Large components lazy-loaded
- Example: Heavy chart libraries
- Example: Rich text editors

**3. Library Splitting**
- Vendor chunks separated
- Shared dependencies extracted
- Optimal caching

### Tree Shaking

**Vite Auto Tree Shaking**

Unused code automatically removed:
```typescript
// Only imported functions included in bundle
import { fetchR2File } from './translationApi';
// Other functions in translationApi not included
```

**Ensure Tree Shaking**:
- Use ES modules (import/export)
- Avoid default exports for utilities
- Import specific functions, not entire modules

### Dynamic Imports

**For Rarely-Used Features**

```typescript
// Instead of:
import { heavyLibrary } from 'heavy-library';

// Do:
const loadHeavyLibrary = async () => {
  const { heavyLibrary } = await import('heavy-library');
  return heavyLibrary;
};
```

### CSS Optimization

**UnoCSS On-Demand**

Only used CSS classes included:
```typescript
// If these classes are used:
<div class="text-gray-900 bg-white px-4 py-2">
// Only these utilities included in final CSS
```

**Purging**:
- Automatic at build time
- Scans all source files
- Removes unused utilities

---

## Development Workflow

### Hot Module Replacement

**Vite HMR**

- Instant updates on file save
- Preserves component state
- No full page reload
- Source maps for debugging

**HMR-Friendly Code**:
```typescript
// Avoid module-level side effects
// Bad:
console.log('Module loaded');

// Good:
onMount(() => {
  console.log('Component mounted');
});
```

### Dev Server

**Two Servers**

1. **Frontend (Vite)**: Port 5173
   - Hot reload
   - Fast rebuilds
   - Source maps

2. **Backend (Wrangler)**: Port 8787
   - Cloudflare Workers emulation
   - API endpoints
   - D1 and R2 local emulation

**Run Both**:
```bash
pnpm run dev:all
```

### Debugging

**Browser DevTools**

- React DevTools (works with SolidJS)
- Network tab (inspect API calls)
- Performance profiler
- Console logs with prefixes

**Debug Logging**:
```typescript
console.log('[DataStore] Fetching projects');
console.log('[Auth] User logged in:', user());
console.log('[ForesightJS] Prefetched:', url);
```

### Testing

**Vitest**

- Unit tests for utilities
- Component tests
- Integration tests

**Example Test**:
```typescript
import { describe, it, expect } from 'vitest';
import { isFirstLoad, resetInitializationState } from './appState';

describe('appState', () => {
  it('should return true on first call', () => {
    resetInitializationState();
    expect(isFirstLoad()).toBe(true);
    expect(isFirstLoad()).toBe(false);
  });
});
```

---

## Performance Monitoring

### Metrics to Track

1. **First Contentful Paint (FCP)**: <1s
2. **Time to Interactive (TTI)**: <2s
3. **Largest Contentful Paint (LCP)**: <2.5s
4. **Cumulative Layout Shift (CLS)**: <0.1
5. **First Input Delay (FID)**: <100ms

### Tools

- **Lighthouse**: Chrome DevTools
- **WebPageTest**: Detailed performance analysis
- **Chrome Performance Profiler**: Runtime performance
- **Bundle Analyzer**: Vite plugin

### Optimization Checklist

- [ ] All pages lazy-loaded
- [ ] ForesightJS configured on navigation elements
- [ ] DataStore caches implemented for API calls
- [ ] Skeleton loaders for loading states
- [ ] Images optimized (format, size)
- [ ] CSS purged (UnoCSS on-demand)
- [ ] Heavy components deferred
- [ ] Virtual scrolling for large lists (if needed)
- [ ] Service worker for offline support (future)

---

## Future Improvements

### Planned Features

1. **Service Worker**
   - Offline support
   - Background sync
   - Push notifications

2. **Virtual Scrolling**
   - For translation lists >100 items
   - Improved performance

3. **Web Workers**
   - Heavy computations off main thread
   - File parsing
   - Data transformations

4. **Progressive Web App (PWA)**
   - Install prompt
   - App-like experience
   - Offline-first

5. **Accessibility (a11y)**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

### Performance Optimizations

1. **Image Optimization**
   - WebP format
   - Lazy loading
   - Responsive images

2. **Font Optimization**
   - Subset fonts
   - Font display: swap
   - Preload critical fonts

3. **Advanced Caching**
   - Service worker caching
   - IndexedDB for large datasets
   - Background sync

---

## Related Documentation

- **[Frontend Guide](FRONTEND.md)** - User-facing frontend documentation
- **[Backend API](BACKEND_API.md)** - API reference
- **[Technical Flows](FLOWS.md)** - System flows
- **[Architecture](ARCHITECTURE.md)** - Overall architecture

---

## License

MIT
