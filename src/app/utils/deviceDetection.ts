/**
 * Device detection utilities for cross-platform compatibility
 */

export interface DeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  hasHover: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  isHighDPI: boolean;
  preferredInputMethod: 'touch' | 'mouse' | 'hybrid';
  supportedFeatures: {
    webGL: boolean;
    serviceWorker: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
  };
}

/**
 * Detect device capabilities and characteristics
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  
  // Breakpoint-based device detection
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;
  
  // Touch and hover capability detection
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasHover = window.matchMedia('(hover: hover)').matches;
  
  // High DPI detection
  const isHighDPI = pixelRatio >= 2;
  
  // Preferred input method detection
  let preferredInputMethod: 'touch' | 'mouse' | 'hybrid' = 'mouse';
  if (hasTouch && !hasHover) {
    preferredInputMethod = 'touch';
  } else if (hasTouch && hasHover) {
    preferredInputMethod = 'hybrid';
  }
  
  // Feature detection
  const supportedFeatures = {
    webGL: !!window.WebGLRenderingContext,
    serviceWorker: 'serviceWorker' in navigator,
    localStorage: (() => {
      try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    })(),
    sessionStorage: (() => {
      try {
        const test = '__sessionStorage_test__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    })(),
    indexedDB: !!window.indexedDB,
  };
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    hasTouch,
    hasHover,
    screenWidth,
    screenHeight,
    pixelRatio,
    isHighDPI,
    preferredInputMethod,
    supportedFeatures,
  };
}

/**
 * Get optimal touch target size based on device
 */
export function getOptimalTouchTargetSize(capabilities: DeviceCapabilities): number {
  if (capabilities.preferredInputMethod === 'touch') {
    // iOS: 44px minimum, Android: 48px minimum
    return capabilities.isMobile ? 48 : 44;
  }
  return 32; // Desktop default
}

/**
 * Get optimal font size based on device and screen size
 */
export function getOptimalFontSize(capabilities: DeviceCapabilities): number {
  if (capabilities.isMobile) {
    return 16; // Prevent zoom on iOS
  }
  if (capabilities.screenWidth >= 2560) {
    return 18; // 4K displays
  }
  if (capabilities.screenWidth >= 1920) {
    return 17; // 2K displays
  }
  return 16; // Default
}

/**
 * Check if device supports smooth scrolling
 */
export function supportsSmoothScrolling(): boolean {
  return 'scrollBehavior' in document.documentElement.style;
}

/**
 * Check if device prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get optimal animation duration based on user preferences
 */
export function getOptimalAnimationDuration(defaultDuration: number): number {
  return prefersReducedMotion() ? 0 : defaultDuration;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  private measurements: Map<string, number> = new Map();
  
  start(label: string): void {
    this.measurements.set(label, performance.now());
  }
  
  end(label: string): number {
    const startTime = this.measurements.get(label);
    if (!startTime) {
      console.warn(`Performance measurement '${label}' was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.measurements.delete(label);
    
    // Log slow operations (>200ms requirement)
    if (duration > 200) {
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  measure<T>(label: string, fn: () => T): T {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();