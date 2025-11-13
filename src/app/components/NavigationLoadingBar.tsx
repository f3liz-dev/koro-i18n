import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { useLocation } from '@solidjs/router';

interface NavigationLoadingBarProps {
  /**
   * Minimum duration (in ms) before the loading bar appears.
   * This prevents the bar from flashing for quick transitions.
   * Default: 300ms
   */
  threshold?: number;
}

/**
 * Navigation-aware loading bar that automatically tracks route changes.
 * Shows a progress bar at the top of the screen when navigating between routes,
 * but only if the transition takes longer than the threshold.
 */
export default function NavigationLoadingBar(props: NavigationLoadingBarProps) {
  const threshold = props.threshold ?? 300;
  const location = useLocation();
  
  const [visible, setVisible] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  
  let thresholdTimer: ReturnType<typeof setTimeout> | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let completionTimer: ReturnType<typeof setTimeout> | null = null;
  let startTime = 0;
  let previousPath = location.pathname;

  const cleanup = () => {
    if (thresholdTimer !== null) {
      clearTimeout(thresholdTimer);
      thresholdTimer = null;
    }
    if (progressTimer !== null) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (completionTimer !== null) {
      clearTimeout(completionTimer);
      completionTimer = null;
    }
  };

  const startLoading = () => {
    cleanup();
    setProgress(0);
    startTime = Date.now();

    // Wait for threshold before showing the loading bar
    thresholdTimer = setTimeout(() => {
      setVisible(true);
      
      // Simulate progress with exponential slowdown
      let currentProgress = 0;
      progressTimer = setInterval(() => {
        if (currentProgress < 70) {
          currentProgress += Math.random() * 15;
        } else if (currentProgress < 90) {
          currentProgress += Math.random() * 5;
        } else if (currentProgress < 95) {
          currentProgress += Math.random() * 2;
        }
        
        if (currentProgress > 99) currentProgress = 99;
        setProgress(Math.min(currentProgress, 99));
      }, 200);
    }, threshold);
  };

  const completeLoading = () => {
    const elapsed = Date.now() - startTime;
    
    cleanup();
    
    // If we were visible, complete the animation
    if (visible()) {
      setProgress(100);
      
      // Hide after animation completes
      completionTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
    }
    
    // Log performance metric for debugging
    if (elapsed > threshold) {
      console.log(`[Navigation Performance] Route change took ${elapsed}ms (threshold: ${threshold}ms)`);
    }
  };

  // Track route changes
  createEffect(() => {
    const currentPath = location.pathname;
    
    // Don't trigger on initial load
    if (previousPath !== currentPath && previousPath !== '') {
      startLoading();
      
      // Complete after a short delay to allow the page to start rendering
      // The Suspense boundary will handle the actual content loading
      requestAnimationFrame(() => {
        // Wait for next frame to ensure DOM has started updating
        requestAnimationFrame(() => {
          completeLoading();
        });
      });
    }
    
    previousPath = currentPath;
  });

  onCleanup(cleanup);

  return (
    <Show when={visible()}>
      <div
        class="fixed top-0 left-0 right-0 z-50 h-1 transition-all duration-300 ease-out"
        style={{
          width: `${progress()}%`,
          background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(168, 85, 247), rgb(236, 72, 153))',
          'box-shadow': '0 0 10px rgba(59, 130, 246, 0.5)',
        }}
        role="progressbar"
        aria-valuenow={progress()}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Page loading progress"
      />
    </Show>
  );
}
