# ForesightJS Integration

This document describes how ForesightJS is integrated into the koro-i18n application for intelligent SPA preloading.

## Overview

ForesightJS is a library that predicts user interactions by tracking mouse movements, touch gestures, scroll behavior, and keyboard navigation. When it detects that a user is likely to interact with an element (like hovering near a button or scrolling toward a link), it triggers a callback that prefetches data before the actual interaction occurs.

This significantly reduces perceived latency in Single Page Applications (SPAs) by loading data before navigation.

## Installation

ForesightJS is already installed as a dependency:

```json
"js.foresight": "^3.3.3"
```

## Initialization

ForesightJS is initialized in `src/app/index.tsx`:

```typescript
import { initializeForesight } from './utils/prefetch';

// Initialize ForesightJS for smart prefetching
initializeForesight();
```

The initialization is configured in `src/app/utils/prefetch.ts` with optimized settings:

```typescript
ForesightManager.initialize({
  touchDeviceStrategy: 'viewport',
  defaultHitSlop: 20,
  enableMousePrediction: true,
  enableTabPrediction: true,
  enableScrollPrediction: true,
});
```

## Usage

### Using the `useForesight` Hook

The recommended way to add ForesightJS to navigation elements is using the `useForesight` hook:

```typescript
import { useForesight } from '../utils/useForesight';

function MyComponent() {
  const buttonRef = useForesight({
    prefetchUrls: ['/api/data', '/api/more-data'],
    debugName: 'my-button',
    hitSlop: 20, // Optional: larger interaction area in pixels
  });

  return (
    <button ref={buttonRef} onClick={() => navigate('/page')}>
      Navigate
    </button>
  );
}
```

### Dynamic URLs

For elements with dynamic URLs (like project cards), create the ref inside the iteration:

```typescript
<For each={items()}>
  {(item) => {
    const cardRef = useForesight({
      prefetchUrls: [`/api/items/${item.id}`],
      debugName: `item-card-${item.id}`,
    });

    return (
      <button ref={cardRef} onClick={() => navigate(`/items/${item.id}`)}>
        {item.name}
      </button>
    );
  }}
</For>
```

### Custom Prefetch Logic

For advanced use cases, provide a custom callback:

```typescript
const buttonRef = useForesight({
  prefetchUrls: [], // Can be empty if using custom callback
  onPrefetch: async () => {
    // Custom prefetch logic
    await myCustomPrefetchFunction();
  },
});
```

## How It Works

1. **User Intent Detection**: ForesightJS monitors user behavior to detect intent:
   - Mouse movements approaching an element
   - Touch gestures near interactive elements
   - Scrolling behavior revealing new content
   - Tab navigation through the page

2. **Prefetch Trigger**: When intent is detected, the callback function is executed

3. **Data Preloading**: The configured URLs are fetched with low priority so they don't interfere with user-initiated requests

4. **Browser Caching**: The fetched data is cached by the browser, so when the user actually navigates, the data is already available

## Best Practices

1. **Configure Appropriate URLs**: Only prefetch URLs that are actually needed for the target page
2. **Use Debug Names**: Provide descriptive `debugName` values for easier debugging
3. **Hit Slop for Small Elements**: Use `hitSlop` for small buttons to create a larger interaction area
4. **Avoid Over-Prefetching**: Don't prefetch too much data at once, as it wastes bandwidth

## Pages with ForesightJS

The following pages have been updated with ForesightJS integration:

- **HomePage**: Dashboard and login buttons
- **DashboardPage**: Navigation buttons and project cards
- **LanguageSelectionPage**: Navigation buttons and language cards
- **FileSelectionPage**: Navigation buttons and file cards
- **CreateProjectPage**: Back and cancel buttons
- **JoinProjectPage**: Back button
- **NotFoundPage**: Home button
- **LoginPage**: Back button
- **ProjectSettingsPage**: Back button
- **TranslationSuggestionsPage**: Dashboard button

## Components

### `useForesight` Hook

Location: `src/app/utils/useForesight.ts`

A SolidJS hook that integrates ForesightJS with any DOM element using refs.

### `ForesightButton` Component

Location: `src/app/components/ForesightButton.tsx`

A reusable button component with built-in ForesightJS support (available for future use).

## Monitoring and Debugging

To see ForesightJS in action:

1. Open the browser console
2. Look for `[ForesightJS]` log messages showing prefetch activity
3. Use browser DevTools Network tab to see prefetch requests (marked with low priority)

For more advanced debugging, install the ForesightJS DevTools extension (if available).

## Resources

- [ForesightJS Documentation](https://foresightjs.com/)
- [ForesightJS GitHub](https://github.com/spaansba/ForesightJS)
- [SolidJS Refs Documentation](https://www.solidjs.com/docs/latest/api#refs)
