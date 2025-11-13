/**
 * ForesightButton - A button component with ForesightJS integration
 * 
 * This component automatically registers buttons with ForesightJS to predict
 * user interactions and prefetch data before navigation occurs.
 */

import { createEffect, onCleanup, JSX, splitProps } from 'solid-js';
import { ForesightManager } from 'js.foresight';

interface ForesightButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  /** URLs to prefetch when user shows intent to click */
  prefetchUrls?: string[];
  /** Optional hit slop in pixels for larger interaction area */
  hitSlop?: number;
  /** Optional name for debugging */
  debugName?: string;
}

/**
 * A button that integrates with ForesightJS for smart prefetching
 */
export default function ForesightButton(props: ForesightButtonProps) {
  const [local, buttonProps] = splitProps(props, ['prefetchUrls', 'hitSlop', 'debugName']);
  let buttonRef: HTMLButtonElement | undefined;

  createEffect(() => {
    if (!buttonRef || !local.prefetchUrls || local.prefetchUrls.length === 0) {
      return;
    }

    // Register with ForesightJS
    ForesightManager.instance.register({
      element: buttonRef,
      callback: () => {
        // Prefetch all URLs when user shows intent
        local.prefetchUrls!.forEach(async (url) => {
          try {
            await fetch(url, {
              credentials: 'include',
              priority: 'low' as RequestPriority,
            });
            console.log(`[ForesightJS] Prefetched: ${url}`);
          } catch (error) {
            console.warn(`[ForesightJS] Failed to prefetch ${url}:`, error);
          }
        });
      },
      hitSlop: local.hitSlop,
      name: local.debugName,
    });

    // Cleanup on unmount
    onCleanup(() => {
      if (buttonRef) {
        ForesightManager.instance.unregister(buttonRef);
      }
    });
  });

  return <button ref={buttonRef} {...buttonProps} />;
}
