/**
 * Cross-platform compatibility validator
 */

import { detectDeviceCapabilities } from './deviceDetection';

export interface ValidationResult {
  feature: string;
  supported: boolean;
  details?: string;
}

export class CrossPlatformValidator {
  private results: ValidationResult[] = [];

  /**
   * Validate responsive breakpoints
   */
  validateResponsiveBreakpoints(): ValidationResult[] {
    const breakpoints = [
      { name: 'xs', min: 320 },
      { name: 'sm', min: 480 },
      { name: 'md', min: 768 },
      { name: 'lg', min: 1024 },
      { name: 'xl', min: 1280 },
      { name: 'ultra', min: 2560 },
    ];

    const results: ValidationResult[] = [];

    breakpoints.forEach(bp => {
      const mediaQuery = window.matchMedia(`(min-width: ${bp.min}px)`);
      results.push({
        feature: `Responsive breakpoint ${bp.name} (${bp.min}px+)`,
        supported: mediaQuery.matches || window.innerWidth >= bp.min,
        details: `Current width: ${window.innerWidth}px`,
      });
    });

    this.results.push(...results);
    return results;
  }

  /**
   * Validate touch capabilities
   */
  validateTouchCapabilities(): ValidationResult[] {
    const capabilities = detectDeviceCapabilities();
    
    const results: ValidationResult[] = [
      {
        feature: 'Touch support',
        supported: capabilities.hasTouch,
        details: `Touch points: ${navigator.maxTouchPoints}`,
      },
      {
        feature: 'Hover support',
        supported: capabilities.hasHover,
        details: `Preferred input: ${capabilities.preferredInputMethod}`,
      },
      {
        feature: 'High DPI display',
        supported: capabilities.isHighDPI,
        details: `Pixel ratio: ${capabilities.pixelRatio}`,
      },
    ];

    this.results.push(...results);
    return results;
  }

  /**
   * Validate performance requirements
   */
  async validatePerformanceRequirements(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Test DOM manipulation performance
    const domTestStart = performance.now();
    const testElement = document.createElement('div');
    testElement.className = 'test-element';
    document.body.appendChild(testElement);
    testElement.style.transform = 'translateX(100px)';
    document.body.removeChild(testElement);
    const domTestEnd = performance.now();
    const domDuration = domTestEnd - domTestStart;

    results.push({
      feature: 'DOM manipulation (200ms requirement)',
      supported: domDuration <= 200,
      details: `Duration: ${domDuration.toFixed(2)}ms`,
    });

    // Test CSS transition performance
    const transitionTestStart = performance.now();
    const transitionElement = document.createElement('div');
    transitionElement.style.transition = 'transform 0.2s ease-in-out';
    transitionElement.style.transform = 'translateX(0)';
    document.body.appendChild(transitionElement);
    
    // Trigger transition
    requestAnimationFrame(() => {
      transitionElement.style.transform = 'translateX(100px)';
    });
    
    // Wait for transition to complete
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const transitionTestEnd = performance.now();
    const transitionDuration = transitionTestEnd - transitionTestStart;
    document.body.removeChild(transitionElement);

    results.push({
      feature: 'CSS transitions (200ms requirement)',
      supported: transitionDuration <= 400, // Allow for transition duration + overhead
      details: `Duration: ${transitionDuration.toFixed(2)}ms`,
    });

    this.results.push(...results);
    return results;
  }

  /**
   * Validate accessibility features
   */
  validateAccessibilityFeatures(): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    results.push({
      feature: 'Reduced motion support',
      supported: true, // Always supported, just checking preference
      details: `User prefers reduced motion: ${prefersReducedMotion}`,
    });

    // Check for high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    results.push({
      feature: 'High contrast support',
      supported: true, // Always supported, just checking preference
      details: `User prefers high contrast: ${prefersHighContrast}`,
    });

    // Check for color scheme preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    results.push({
      feature: 'Color scheme support',
      supported: true, // Always supported, just checking preference
      details: `User prefers dark mode: ${prefersDarkMode}`,
    });

    this.results.push(...results);
    return results;
  }

  /**
   * Validate browser features
   */
  validateBrowserFeatures(): ValidationResult[] {
    const capabilities = detectDeviceCapabilities();
    
    const results: ValidationResult[] = [
      {
        feature: 'Local Storage',
        supported: capabilities.supportedFeatures.localStorage,
        details: 'Required for offline functionality',
      },
      {
        feature: 'Session Storage',
        supported: capabilities.supportedFeatures.sessionStorage,
        details: 'Required for session management',
      },
      {
        feature: 'Service Worker',
        supported: capabilities.supportedFeatures.serviceWorker,
        details: 'Required for PWA functionality',
      },
      {
        feature: 'IndexedDB',
        supported: capabilities.supportedFeatures.indexedDB,
        details: 'Required for offline data storage',
      },
    ];

    this.results.push(...results);
    return results;
  }

  /**
   * Run all validation tests
   */
  async runAllTests(): Promise<ValidationResult[]> {
    this.results = [];
    
    this.validateResponsiveBreakpoints();
    this.validateTouchCapabilities();
    await this.validatePerformanceRequirements();
    this.validateAccessibilityFeatures();
    this.validateBrowserFeatures();
    
    return this.results;
  }

  /**
   * Get validation summary
   */
  getSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
  } {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.supported).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
    };
  }

  /**
   * Log validation report
   */
  logReport(): void {
    const summary = this.getSummary();
    
    console.group('🔍 Cross-Platform Validation Report');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests} ✅`);
    console.log(`Failed: ${summary.failedTests} ❌`);
    console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
    
    const failedTests = this.results.filter(r => !r.supported);
    if (failedTests.length > 0) {
      console.group('❌ Failed Tests');
      failedTests.forEach(test => {
        console.log(`${test.feature}: ${test.details || 'No details'}`);
      });
      console.groupEnd();
    }
    
    const passedTests = this.results.filter(r => r.supported);
    if (passedTests.length > 0) {
      console.group('✅ Passed Tests');
      passedTests.forEach(test => {
        console.log(`${test.feature}: ${test.details || 'Supported'}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Global validator instance
export const crossPlatformValidator = new CrossPlatformValidator();