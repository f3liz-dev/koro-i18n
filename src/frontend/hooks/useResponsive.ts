/**
 * Responsive design hook for Solid.js
 */

import { createSignal, createEffect, onCleanup } from 'solid-js';
import { 
  detectDeviceCapabilities, 
  DeviceCapabilities, 
  debounce,
  performanceMonitor 
} from '../utils/deviceDetection';

export interface ResponsiveState extends DeviceCapabilities {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'ultra';
  orientation: 'portrait' | 'landscape';
  isOnline: boolean;
}

/**
 * Hook for responsive design and device capabilities
 */
export function useResponsive() {
  const [state, setState] = createSignal<ResponsiveState>(getInitialState());
  
  function getInitialState(): ResponsiveState {
    const capabilities = detectDeviceCapabilities();
    
    return {
      ...capabilities,
      breakpoint: getBreakpoint(capabilities.screenWidth),
      orientation: capabilities.screenWidth > capabilities.screenHeight ? 'landscape' : 'portrait',
      isOnline: navigator.onLine,
    };
  }
  
  function getBreakpoint(width: number): ResponsiveState['breakpoint'] {
    if (width >= 2560) return 'ultra';
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 480) return 'sm';
    return 'xs';
  }
  
  // Debounced resize handler for performance
  const handleResize = debounce(() => {
    performanceMonitor.start('responsive-update');
    
    const capabilities = detectDeviceCapabilities();
    setState({
      ...capabilities,
      breakpoint: getBreakpoint(capabilities.screenWidth),
      orientation: capabilities.screenWidth > capabilities.screenHeight ? 'landscape' : 'portrait',
      isOnline: navigator.onLine,
    });
    
    performanceMonitor.end('responsive-update');
  }, 100);
  
  const handleOnlineStatusChange = () => {
    setState(prev => ({ ...prev, isOnline: navigator.onLine }));
  };
  
  createEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    });
  });
  
  return state;
}

/**
 * Hook for media query matching
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = createSignal(false);
  
  createEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    onCleanup(() => {
      mediaQuery.removeEventListener('change', handler);
    });
  });
  
  return matches;
}

/**
 * Hook for detecting touch capabilities
 */
export function useTouch() {
  const responsive = useResponsive();
  
  return {
    hasTouch: () => responsive().hasTouch,
    preferredInputMethod: () => responsive().preferredInputMethod,
    isTouchPrimary: () => responsive().preferredInputMethod === 'touch',
    isHybrid: () => responsive().preferredInputMethod === 'hybrid',
  };
}

/**
 * Hook for breakpoint-specific behavior
 */
export function useBreakpoint() {
  const responsive = useResponsive();
  
  return {
    current: () => responsive().breakpoint,
    isMobile: () => responsive().isMobile,
    isTablet: () => responsive().isTablet,
    isDesktop: () => responsive().isDesktop,
    isXs: () => responsive().breakpoint === 'xs',
    isSm: () => responsive().breakpoint === 'sm',
    isMd: () => responsive().breakpoint === 'md',
    isLg: () => responsive().breakpoint === 'lg',
    isXl: () => responsive().breakpoint === 'xl',
    isUltra: () => responsive().breakpoint === 'ultra',
    isAtLeast: (breakpoint: ResponsiveState['breakpoint']) => {
      const order = ['xs', 'sm', 'md', 'lg', 'xl', 'ultra'];
      const currentIndex = order.indexOf(responsive().breakpoint);
      const targetIndex = order.indexOf(breakpoint);
      return currentIndex >= targetIndex;
    },
    isAtMost: (breakpoint: ResponsiveState['breakpoint']) => {
      const order = ['xs', 'sm', 'md', 'lg', 'xl', 'ultra'];
      const currentIndex = order.indexOf(responsive().breakpoint);
      const targetIndex = order.indexOf(breakpoint);
      return currentIndex <= targetIndex;
    },
  };
}