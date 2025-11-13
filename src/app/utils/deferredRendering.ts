import { createSignal, createEffect, onCleanup, Accessor } from 'solid-js';

/**
 * Defers updates to improve perceived performance during heavy rendering.
 * This is useful for non-critical UI updates that can wait until the main
 * content is rendered.
 * 
 * @param value - The value to defer
 * @param delay - Delay in milliseconds before updating (default: 0, uses requestIdleCallback)
 * @returns Deferred accessor
 * 
 * @example
 * ```tsx
 * const [heavyData, setHeavyData] = createSignal([]);
 * const deferredData = useDeferredValue(() => heavyData());
 * 
 * // Render critical content immediately, defer heavy lists
 * <For each={deferredData()}>{...}</For>
 * ```
 */
export function useDeferredValue<T>(value: Accessor<T>, delay = 0): Accessor<T> {
  const [deferredValue, setDeferredValue] = createSignal<T>(value());
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;

  createEffect(() => {
    const newValue = value();
    
    // Clean up any pending updates
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (delay === 0) {
      // Use requestIdleCallback if available, otherwise requestAnimationFrame
      if (typeof requestIdleCallback !== 'undefined') {
        const idleId = requestIdleCallback(
          () => setDeferredValue(() => newValue),
          { timeout: 100 }
        );
        onCleanup(() => cancelIdleCallback(idleId));
      } else {
        rafId = requestAnimationFrame(() => {
          setDeferredValue(() => newValue);
        });
      }
    } else {
      timeoutId = setTimeout(() => {
        setDeferredValue(() => newValue);
      }, delay);
    }
  });

  onCleanup(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  });

  return deferredValue;
}

/**
 * Wraps a callback with startTransition-like behavior for SolidJS.
 * Defers the execution to allow high-priority updates to complete first.
 * 
 * @param callback - The callback to defer
 * 
 * @example
 * ```tsx
 * const handleFilter = (query: string) => {
 *   // Update input immediately (high priority)
 *   setSearchQuery(query);
 *   
 *   // Defer filtering (low priority)
 *   startTransition(() => {
 *     setFilteredResults(filterData(data(), query));
 *   });
 * };
 * ```
 */
export function startTransition(callback: () => void): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(callback, { timeout: 100 });
  } else {
    requestAnimationFrame(() => {
      requestAnimationFrame(callback);
    });
  }
}

/**
 * Creates a transition helper that batches updates and provides a pending state.
 * 
 * @returns [isPending, startTransition]
 * 
 * @example
 * ```tsx
 * const [isPending, startTransition] = useTransition();
 * 
 * const handleSearch = (query: string) => {
 *   startTransition(() => {
 *     setFilteredResults(filterData(data(), query));
 *   });
 * };
 * 
 * <Show when={isPending()}>
 *   <div>Filtering...</div>
 * </Show>
 * ```
 */
export function useTransition(): [Accessor<boolean>, (callback: () => void) => void] {
  const [isPending, setIsPending] = createSignal(false);

  const start = (callback: () => void) => {
    setIsPending(true);

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(
        () => {
          callback();
          setIsPending(false);
        },
        { timeout: 100 }
      );
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          callback();
          setIsPending(false);
        });
      });
    }
  };

  return [isPending, start];
}

/**
 * Hook to defer rendering of components until the main content is loaded.
 * Useful for below-the-fold content or secondary UI elements.
 * 
 * @param delay - Delay in milliseconds before rendering (default: 0)
 * @returns Whether the deferred content should render
 * 
 * @example
 * ```tsx
 * const shouldRenderSidebar = useDeferredRender(100);
 * 
 * <Show when={shouldRenderSidebar()}>
 *   <Sidebar />
 * </Show>
 * ```
 */
export function useDeferredRender(delay = 0): Accessor<boolean> {
  const [shouldRender, setShouldRender] = createSignal(false);

  if (typeof window !== 'undefined') {
    if (delay === 0) {
      // Use requestIdleCallback for maximum performance
      if (typeof requestIdleCallback !== 'undefined') {
        const idleId = requestIdleCallback(
          () => setShouldRender(true),
          { timeout: 200 }
        );
        onCleanup(() => cancelIdleCallback(idleId));
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setShouldRender(true));
        });
      }
    } else {
      const timeoutId = setTimeout(() => setShouldRender(true), delay);
      onCleanup(() => clearTimeout(timeoutId));
    }
  } else {
    // SSR: render immediately
    setShouldRender(true);
  }

  return shouldRender;
}
