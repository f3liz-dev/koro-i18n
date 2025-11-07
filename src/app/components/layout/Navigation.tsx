/**
 * Navigation Component with Authentication State and Responsive Design
 */

import { Component, Show, createSignal } from 'solid-js';
import { A } from '@solidjs/router';
import { authStore } from '../../stores/authStore';
import { useBreakpoint, useTouch } from '../../hooks/useResponsive';
import UserProfile from '../auth/UserProfile';
import LoginButton from '../auth/LoginButton';

const Navigation: Component = () => {
  const breakpoint = useBreakpoint();
  const touch = useTouch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = createSignal(false);
  
  const showMobileMenu = () => breakpoint.isAtMost('sm');
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen());
  };
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  const navClasses = () => {
    const classes = ['navigation'];
    if (touch.isTouchPrimary()) classes.push('touch-primary');
    if (showMobileMenu()) classes.push('mobile-layout');
    return classes.join(' ');
  };
  
  return (
    <nav class={navClasses()} style="background-color: var(--color-background); border-bottom: 1px solid var(--color-border);">
      <div class="container">
        <div class="nav-content">
          {/* Logo and brand */}
          <div class="nav-brand">
            <A href="/" class="brand-link" onClick={closeMobileMenu}>
              I18n Platform
            </A>
          </div>
          
          {/* Desktop navigation */}
          <Show when={!showMobileMenu()}>
            <div class="nav-links">
              <Show when={authStore.isAuthenticated}>
                <A 
                  href="/dashboard" 
                  class="nav-link"
                  activeClass="nav-link-active"
                >
                  Dashboard
                </A>
              </Show>
            </div>
          </Show>
          
          {/* Desktop auth section */}
          <Show when={!showMobileMenu()}>
            <div class="nav-auth">
              <Show
                when={authStore.isAuthenticated}
                fallback={
                  <Show when={!authStore.isLoading}>
                    <LoginButton />
                  </Show>
                }
              >
                <UserProfile compact />
              </Show>
            </div>
          </Show>
          
          {/* Mobile menu button */}
          <Show when={showMobileMenu()}>
            <button 
              class="mobile-menu-button"
              onClick={toggleMobileMenu}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen()}
            >
              <Show when={!isMobileMenuOpen()}>
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Show>
              <Show when={isMobileMenuOpen()}>
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Show>
            </button>
          </Show>
        </div>
        
        {/* Mobile menu */}
        <Show when={showMobileMenu() && isMobileMenuOpen()}>
          <div class="mobile-menu">
            <div class="mobile-menu-content">
              <Show when={authStore.isAuthenticated}>
                <A 
                  href="/dashboard" 
                  class="mobile-nav-link"
                  activeClass="mobile-nav-link-active"
                  onClick={closeMobileMenu}
                >
                  Dashboard
                </A>
              </Show>
              
              <div class="mobile-auth-section">
                <Show
                  when={authStore.isAuthenticated}
                  fallback={
                    <Show when={!authStore.isLoading}>
                      <LoginButton onSuccess={closeMobileMenu} />
                    </Show>
                  }
                >
                  <UserProfile compact={false} />
                </Show>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </nav>
  );
};

export default Navigation;