/**
 * Tests for application state management
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { isFirstLoad, resetInitializationState, getInitializationState } from './appState';

describe('Application State', () => {
  beforeEach(() => {
    // Reset state before each test
    resetInitializationState();
  });

  describe('isFirstLoad', () => {
    it('should return true on first call', () => {
      expect(isFirstLoad()).toBe(true);
    });

    it('should return false on subsequent calls', () => {
      isFirstLoad(); // First call
      expect(isFirstLoad()).toBe(false);
      expect(isFirstLoad()).toBe(false);
      expect(isFirstLoad()).toBe(false);
    });

    it('should return true again after reset', () => {
      isFirstLoad(); // First call
      expect(isFirstLoad()).toBe(false); // Second call
      
      resetInitializationState(); // Reset
      expect(isFirstLoad()).toBe(true); // Should be true again
    });
  });

  describe('getInitializationState', () => {
    it('should return false before first call to isFirstLoad', () => {
      expect(getInitializationState()).toBe(false);
    });

    it('should return true after first call to isFirstLoad', () => {
      isFirstLoad();
      expect(getInitializationState()).toBe(true);
    });

    it('should return false after reset', () => {
      isFirstLoad();
      expect(getInitializationState()).toBe(true);
      
      resetInitializationState();
      expect(getInitializationState()).toBe(false);
    });
  });

  describe('resetInitializationState', () => {
    it('should reset the state allowing isFirstLoad to return true again', () => {
      isFirstLoad(); // Initialize
      expect(isFirstLoad()).toBe(false); // Already initialized
      
      resetInitializationState(); // Reset
      expect(isFirstLoad()).toBe(true); // Should be true after reset
    });

    it('should be safe to call multiple times', () => {
      resetInitializationState();
      resetInitializationState();
      resetInitializationState();
      
      expect(isFirstLoad()).toBe(true);
    });
  });

  describe('Page reload simulation', () => {
    it('should simulate page reload behavior', () => {
      // Simulate initial page load
      const isFirstLoadOnPageLoad = isFirstLoad();
      expect(isFirstLoadOnPageLoad).toBe(true);
      
      // Simulate multiple SPA navigations
      expect(isFirstLoad()).toBe(false);
      expect(isFirstLoad()).toBe(false);
      
      // Simulate page reload (in real scenario, JS state resets automatically)
      resetInitializationState();
      
      // After "reload", should be first load again
      expect(isFirstLoad()).toBe(true);
      
      // More SPA navigations
      expect(isFirstLoad()).toBe(false);
    });
  });
});
