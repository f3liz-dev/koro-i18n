/**
 * useForesight - A hook for integrating ForesightJS with SolidJS components
 * 
 * This hook provides a simple way to add ForesightJS prediction to any element,
 * following SolidJS patterns for refs and effects.
 */

import { onCleanup, Accessor } from 'solid-js';
import { ForesightManager } from 'js.foresight';

interface UseForesightOptions {
  /** URLs to prefetch when user shows intent to interact */
  prefetchUrls: string[] | Accessor<string[]>;
  /** Optional hit slop in pixels for larger interaction area */
  hitSlop?: number;
  /** Optional name for debugging */
  debugName?: string;
  /** Optional callback for custom prefetch logic */
  onPrefetch?: () => void | Promise<void>;
}

/**
 * Hook to integrate ForesightJS with any DOM element
 * 
 * @example
 * ```tsx
 * function MyButton() {
 *   const foresightRef = useForesight({
 *     prefetchUrls: ['/api/data'],
 *     hitSlop: 20,
 *   });
 * 
 *   return <button ref={foresightRef}>Click me</button>;
 * }
 * ```
 */
export function useForesight(options: UseForesightOptions) {
  return (element: HTMLElement) => {
    if (!element) return;

    const urls = typeof options.prefetchUrls === 'function' 
      ? options.prefetchUrls() 
      : options.prefetchUrls;

    if (urls.length === 0) return;

    // Register with ForesightJS
    ForesightManager.instance.register({
      element,
      callback: async () => {
        // Use custom callback if provided
        if (options.onPrefetch) {
          await options.onPrefetch();
          return;
        }

        // Default prefetch behavior
        for (const url of urls) {
          try {
            await fetch(url, {
              credentials: 'include',
              priority: 'low' as RequestPriority,
            });
            console.log(`[ForesightJS] Prefetched: ${url}`);
          } catch (error) {
            console.warn(`[ForesightJS] Failed to prefetch ${url}:`, error);
          }
        }
      },
      hitSlop: options.hitSlop,
      name: options.debugName,
    });

    // Cleanup on unmount
    onCleanup(() => {
      ForesightManager.instance.unregister(element);
    });
  };
}
