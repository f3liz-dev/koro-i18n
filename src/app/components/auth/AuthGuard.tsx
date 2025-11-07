/**
 * Authentication Guard Component
 * Protects routes and components that require authentication
 */

import { Component, JSX, Show, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { authStore } from '../../stores/authStore';
import LoadingSpinner from '../ui/LoadingSpinner';

interface AuthGuardProps {
  children: JSX.Element;
  fallback?: JSX.Element;
  redirectTo?: string;
  requireAuth?: boolean;
}

const AuthGuard: Component<AuthGuardProps> = (props) => {
  const navigate = useNavigate();
  const requireAuth = props.requireAuth ?? true;
  const redirectTo = props.redirectTo ?? '/login';

  // Effect to handle authentication redirects
  createEffect(() => {
    if (!authStore.isLoading && requireAuth && !authStore.isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  });

  return (
    <Show
      when={!authStore.isLoading}
      fallback={<LoadingSpinner />}
    >
      <Show
        when={!requireAuth || authStore.isAuthenticated}
        fallback={
          props.fallback || (
            <div class="container py-lg text-center">
              <h2 class="text-xl font-semibold mb-md">Authentication Required</h2>
              <p class="text-muted mb-lg">
                You need to sign in to access this page.
              </p>
              <a href="/login" class="btn btn-primary">
                Sign In
              </a>
            </div>
          )
        }
      >
        {props.children}
      </Show>
    </Show>
  );
};

export default AuthGuard;