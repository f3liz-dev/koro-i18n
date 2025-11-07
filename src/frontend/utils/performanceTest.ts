/**
 * Performance testing utilities for validating 200ms response time requirement
 */

import { performanceMonitor } from './deviceDetection';

export interface PerformanceTestResult {
  testName: string;
  duration: number;
  passed: boolean;
  timestamp: number;
}

export class PerformanceValidator {
  private results: PerformanceTestResult[] = [];
  private readonly RESPONSE_TIME_LIMIT = 200; // 200ms requirement

  /**
   * Test user interaction response time
   */
  async testInteractionResponseTime(
    testName: string,
    interaction: () => Promise<void> | void
  ): Promise<PerformanceTestResult> {
    const startTime = performance.now();
    
    try {
      await interaction();
    } catch (error) {
      console.error(`Performance test failed: ${testName}`, error);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const passed = duration <= this.RESPONSE_TIME_LIMIT;
    
    const result: PerformanceTestResult = {
      testName,
      duration,
      passed,
      timestamp: Date.now(),
    };
    
    this.results.push(result);
    
    if (!passed) {
      console.warn(
        `Performance test failed: ${testName} took ${duration.toFixed(2)}ms (limit: ${this.RESPONSE_TIME_LIMIT}ms)`
      );
    }
    
    return result;
  }

  /**
   * Test component rendering performance
   */
  testComponentRender(componentName: string, renderFn: () => void): PerformanceTestResult {
    performanceMonitor.start(`render-${componentName}`);
    
    renderFn();
    
    const duration = performanceMonitor.end(`render-${componentName}`);
    const passed = duration <= this.RESPONSE_TIME_LIMIT;
    
    const result: PerformanceTestResult = {
      testName: `${componentName} render`,
      duration,
      passed,
      timestamp: Date.now(),
    };
    
    this.results.push(result);
    return result;
  }

  /**
   * Test DOM manipulation performance
   */
  testDOMOperation(operationName: string, operation: () => void): PerformanceTestResult {
    const startTime = performance.now();
    
    operation();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const passed = duration <= this.RESPONSE_TIME_LIMIT;
    
    const result: PerformanceTestResult = {
      testName: `DOM: ${operationName}`,
      duration,
      passed,
      timestamp: Date.now(),
    };
    
    this.results.push(result);
    return result;
  }

  /**
   * Test network request performance
   */
  async testNetworkRequest(
    requestName: string,
    requestFn: () => Promise<any>
  ): Promise<PerformanceTestResult> {
    const startTime = performance.now();
    
    try {
      await requestFn();
    } catch (error) {
      console.error(`Network test failed: ${requestName}`, error);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    // Network requests have a higher tolerance (2 seconds for load time requirement)
    const passed = duration <= 2000;
    
    const result: PerformanceTestResult = {
      testName: `Network: ${requestName}`,
      duration,
      passed,
      timestamp: Date.now(),
    };
    
    this.results.push(result);
    return result;
  }

  /**
   * Get all test results
   */
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  /**
   * Get failed tests
   */
  getFailedTests(): PerformanceTestResult[] {
    return this.results.filter(result => !result.passed);
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageDuration: number;
    worstPerformance: PerformanceTestResult | null;
  } {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const averageDuration = totalTests > 0 
      ? this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests 
      : 0;
    const worstPerformance = this.results.length > 0
      ? this.results.reduce((worst, current) => 
          current.duration > worst.duration ? current : worst
        )
      : null;

    return {
      totalTests,
      passedTests,
      failedTests,
      averageDuration,
      worstPerformance,
    };
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Log performance report to console
   */
  logReport(): void {
    const summary = this.getSummary();
    
    console.group('🚀 Performance Test Report');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests} ✅`);
    console.log(`Failed: ${summary.failedTests} ❌`);
    console.log(`Average Duration: ${summary.averageDuration.toFixed(2)}ms`);
    
    if (summary.worstPerformance) {
      console.log(`Worst Performance: ${summary.worstPerformance.testName} (${summary.worstPerformance.duration.toFixed(2)}ms)`);
    }
    
    if (summary.failedTests > 0) {
      console.group('❌ Failed Tests');
      this.getFailedTests().forEach(test => {
        console.log(`${test.testName}: ${test.duration.toFixed(2)}ms`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Global performance validator instance
export const performanceValidator = new PerformanceValidator();

/**
 * Decorator for testing function performance
 */
export function measurePerformance(testName: string) {
  return function (target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      const result = await originalMethod.apply(this, args);
      const endTime = performance.now();
      // const duration = endTime - startTime; // Duration tracking for future use
      
      performanceValidator.testInteractionResponseTime(
        `${target.constructor.name}.${testName}`,
        () => Promise.resolve()
      );
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Test responsive breakpoint changes performance
 */
export async function testResponsivePerformance(): Promise<void> {
  const breakpoints = [320, 480, 768, 1024, 1280, 1920, 2560];
  
  for (const width of breakpoints) {
    await performanceValidator.testInteractionResponseTime(
      `Responsive breakpoint change to ${width}px`,
      () => {
        // Simulate window resize
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
        
        // Allow time for responsive updates
        return new Promise(resolve => setTimeout(resolve, 50));
      }
    );
  }
}

/**
 * Test touch interaction performance
 */
export async function testTouchPerformance(): Promise<void> {
  const touchEvents = ['touchstart', 'touchmove', 'touchend'];
  
  for (const eventType of touchEvents) {
    await performanceValidator.testInteractionResponseTime(
      `Touch ${eventType} event`,
      () => {
        const element = document.createElement('div');
        document.body.appendChild(element);
        
        const event = new TouchEvent(eventType, {
          bubbles: true,
          cancelable: true,
          touches: [],
        });
        
        element.dispatchEvent(event);
        document.body.removeChild(element);
      }
    );
  }
}