# Mobile Performance Optimization

This document describes the performance optimizations implemented to improve page transition speed on mobile devices.

## Problem

On smartphones, the frontend was experiencing slow page transitions due to extensive DOM mutations when navigating between pages, particularly complex pages like:
- TranslationEditorPage (457 lines, complex state management)
- TranslationSuggestionsPage (464 lines, heavy data processing)
- Dashboard and other data-heavy pages

## Solutions Considered

### 1. Prerendering as Hidden Elements
**Pros:**
- Instant page transitions
- No loading states

**Cons:**
- High memory usage (multiple pages in DOM simultaneously)
- Slower initial load
- Doesn't solve the underlying rendering performance issue
- Complex state management

**Decision:** ❌ Rejected

### 2. Top Loading Bar
**Pros:**
- Standard UX pattern (YouTube, GitHub, npm, etc.)
- Provides visual feedback
- No performance overhead
- Only shows for slow transitions (configurable threshold)
- Works well with existing Suspense boundaries

**Cons:**
- Doesn't improve actual rendering speed
- Still requires optimization for very slow pages

**Decision:** ✅ Implemented as primary solution

### 3. Hybrid Approach (Selected)
**Combination of:**
- Top loading bar for user feedback (300ms threshold)
- Deferred rendering utilities for non-critical updates
- Transition helpers to prioritize critical rendering
- Maintains existing caching and prefetching

**Decision:** ✅ **Best approach** - Provides both UX feedback and performance improvements

## Implementation

### 1. NavigationLoadingBar Component

A smart loading bar that:
- Monitors route changes automatically
- Only appears if navigation takes >300ms (configurable)
- Uses smooth animations and gradient design
- Completes automatically when page loads

**Usage:**
```tsx
// In App.tsx
<Router>
  <NavigationLoadingBar threshold={300} />
  <Suspense fallback={<LoadingSpinner />}>
    {/* Routes */}
  </Suspense>
</Router>
```

**How it works:**
1. Detects route change via `useLocation()`
2. Starts internal timer
3. If 300ms passes without completion, shows loading bar
4. Animates progress from 0-99% using realistic simulation
5. Completes to 100% when page renders
6. Logs performance metrics in development mode

### 2. Deferred Rendering Utilities

**Location:** `src/app/utils/deferredRendering.ts`

Provides several hooks for optimizing render performance:

#### `useDeferredValue<T>(value, delay)`
Defers non-critical value updates using `requestIdleCallback`:

```tsx
const [heavyData, setHeavyData] = createSignal([]);
const deferredData = useDeferredValue(() => heavyData());

// Critical content renders first
<Header />
<MainContent />

// Heavy list renders when browser is idle
<For each={deferredData()}>{item => <ListItem {...item} />}</For>
```

#### `startTransition(callback)`
SolidJS-compatible transition helper:

```tsx
const handleFilter = (query: string) => {
  // Update input immediately (high priority)
  setSearchQuery(query);
  
  // Defer filtering (low priority)
  startTransition(() => {
    setFilteredResults(filterData(data(), query));
  });
};
```

#### `useTransition()`
Provides pending state for transitions:

```tsx
const [isPending, startTransition] = useTransition();

const handleSearch = (query: string) => {
  startTransition(() => {
    setFilteredResults(filterData(data(), query));
  });
};

<Show when={isPending()}>
  <div>Filtering...</div>
</Show>
```

#### `useDeferredRender(delay)`
Defers rendering of entire components:

```tsx
const shouldRenderSidebar = useDeferredRender(100);

// Main content renders immediately
<MainContent />

// Sidebar renders after 100ms
<Show when={shouldRenderSidebar()}>
  <Sidebar />
</Show>
```

### 3. Performance Best Practices

#### For Page Components:
1. **Prioritize critical content:** Render essential UI first
2. **Defer heavy lists:** Use `useDeferredValue` for large data sets
3. **Split rendering:** Use `useDeferredRender` for below-the-fold content
4. **Transition updates:** Wrap filter/sort operations in `startTransition`

#### Example: Optimizing a Heavy Page
```tsx
export default function HeavyPage() {
  const [data, setData] = createSignal([]);
  const deferredData = useDeferredValue(() => data());
  const shouldRenderFooter = useDeferredRender(200);
  
  return (
    <div>
      {/* Critical: renders immediately */}
      <Header />
      
      {/* Deferred: renders when idle */}
      <For each={deferredData()}>
        {item => <Item {...item} />}
      </For>
      
      {/* Below-fold: renders after 200ms */}
      <Show when={shouldRenderFooter()}>
        <Footer />
      </Show>
    </div>
  );
}
```

## Performance Monitoring

### Development Mode
The NavigationLoadingBar logs performance metrics:

```
[Navigation Performance] Route change took 450ms (threshold: 300ms)
```

This helps identify slow transitions that need optimization.

### Production Recommendations
1. Monitor Core Web Vitals (FCP, LCP, CLS, FID)
2. Use Chrome DevTools Performance tab to identify bottlenecks
3. Test on actual mobile devices (not just browser dev tools)
4. Consider lazy-loading images and heavy components

## Mobile-Specific Optimizations

### Already Implemented:
- ✅ Lazy loading for all page components
- ✅ HTTP caching via `cachedFetch`
- ✅ Smart prefetching with ForesightJS
- ✅ Data store caching to avoid loading states
- ✅ Skeleton loaders for progressive rendering

### New Additions:
- ✅ Navigation loading bar (300ms threshold)
- ✅ Deferred rendering utilities
- ✅ Transition helpers for prioritized updates

### Future Improvements:
- Virtual scrolling for very long lists (>100 items)
- Service worker for offline caching
- Image optimization and lazy loading
- Bundle splitting for smaller initial chunks

## Configuration

### Adjusting the Loading Bar Threshold
Edit `src/app/App.tsx`:

```tsx
{/* Show bar only for transitions >500ms */}
<NavigationLoadingBar threshold={500} />

{/* Show bar immediately for all transitions */}
<NavigationLoadingBar threshold={0} />
```

### Recommended Thresholds:
- **Desktop:** 500ms (users expect fast transitions)
- **Mobile:** 300ms (recommended, balances perception)
- **Slow networks:** 150ms (show feedback earlier)

## Testing

### Manual Testing:
1. Open DevTools Network tab
2. Throttle to "Slow 3G" or "Fast 3G"
3. Navigate between pages
4. Loading bar should appear for slow transitions
5. Check console for performance logs

### Automated Testing:
```bash
pnpm run test
```

Performance-related tests should verify:
- Loading bar appears/disappears correctly
- Deferred rendering works as expected
- No memory leaks in transition helpers

## Browser Compatibility

All utilities gracefully degrade:
- `requestIdleCallback`: Falls back to `requestAnimationFrame`
- Modern CSS (gradients, transitions): Works on all modern browsers
- Progressive enhancement: Works without JS (SSR)

## Conclusion

This implementation provides a balanced approach to mobile performance:
1. **User Feedback:** Loading bar prevents perceived lag
2. **Performance:** Deferred rendering reduces blocking time
3. **Flexibility:** Tools can be applied incrementally
4. **Monitoring:** Built-in logging helps track improvements

The 300ms threshold ensures the loading bar only appears when needed, preventing UI flashing while still providing feedback for genuinely slow transitions.
