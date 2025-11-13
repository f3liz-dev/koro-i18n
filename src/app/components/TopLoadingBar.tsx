import { createSignal, onCleanup, Show } from 'solid-js';

interface TopLoadingBarProps {
  /**
   * Minimum duration (in ms) before the loading bar appears.
   * This prevents the bar from flashing for quick transitions.
   * Default: 300ms
   */
  threshold?: number;
}

/**
 * A top loading bar that appears during page transitions or async operations.
 * Only shows if the operation takes longer than the threshold.
 * 
 * Usage:
 * ```tsx
 * const [loading, setLoading] = createSignal(false);
 * <TopLoadingBar loading={loading()} threshold={300} />
 * ```
 */
export function TopLoadingBar(props: TopLoadingBarProps) {
  const threshold = props.threshold ?? 300;
  const [visible, setVisible] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  
  let thresholdTimer: number | null = null;
  let progressTimer: number | null = null;

  // Cleanup function
  const cleanup = () => {
    if (thresholdTimer !== null) {
      clearTimeout(thresholdTimer);
      thresholdTimer = null;
    }
    if (progressTimer !== null) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    setVisible(false);
    setProgress(0);
  };

  onCleanup(cleanup);

  return (
    <Show when={visible()}>
      <div
        class="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
        style={{
          width: `${progress()}%`,
          'box-shadow': '0 0 10px rgba(59, 130, 246, 0.5)'
        }}
        role="progressbar"
        aria-valuenow={progress()}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </Show>
  );
}

/**
 * Hook to manage loading bar state
 */
export function useLoadingBar(threshold = 300) {
  const [isLoading, setIsLoading] = createSignal(false);
  const [visible, setVisible] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  
  let thresholdTimer: ReturnType<typeof setTimeout> | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let startTime = 0;

  const start = () => {
    // Reset state
    cleanup();
    setIsLoading(true);
    setProgress(0);
    startTime = Date.now();

    // Wait for threshold before showing the loading bar
    thresholdTimer = setTimeout(() => {
      setVisible(true);
      
      // Simulate progress with exponential slowdown
      // Goes quickly to 70%, then slows down
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

  const complete = () => {
    const elapsed = Date.now() - startTime;
    
    cleanup();
    
    // If we were visible, complete the animation
    if (visible()) {
      setProgress(100);
      
      // Hide after animation completes
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
        setIsLoading(false);
      }, 300);
    } else {
      setIsLoading(false);
    }
    
    // Log performance metric for debugging
    if (elapsed > threshold) {
      console.log(`[Performance] Navigation took ${elapsed}ms (threshold: ${threshold}ms)`);
    }
  };

  const cleanup = () => {
    if (thresholdTimer !== null) {
      clearTimeout(thresholdTimer);
      thresholdTimer = null;
    }
    if (progressTimer !== null) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  };

  onCleanup(cleanup);

  return {
    isLoading,
    visible,
    progress,
    start,
    complete,
  };
}

/**
 * Standalone loading bar with built-in state management
 */
export default function StandaloneLoadingBar(props: TopLoadingBarProps) {
  const { visible, progress } = useLoadingBar(props.threshold);

  return (
    <Show when={visible()}>
      <div
        class="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
        style={{
          width: `${progress()}%`,
          'box-shadow': '0 0 10px rgba(59, 130, 246, 0.5)'
        }}
        role="progressbar"
        aria-valuenow={progress()}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </Show>
  );
}
