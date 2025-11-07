/**
 * OAuth Callback Handler Component
 * Handles GitHub OAuth callback and completes authentication
 */

import { Component, createSignal, Show, onMount } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { authStore } from '../../stores/authStore';
import LoadingSpinner from '../ui/LoadingSpinner';

const OAuthCallback: Component = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    handleCallback();
  });

  const handleCallback = async () => {
    const code = Array.isArray(searchParams.code) ? searchParams.code[0] : searchParams.code;
    const state = Array.isArray(searchParams.state) ? searchParams.state[0] : searchParams.state;
    const errorParam = Array.isArray(searchParams.error) ? searchParams.error[0] : searchParams.error;

    // Handle OAuth errors
    if (errorParam) {
      const errorDescription = Array.isArray(searchParams.error_description) 
        ? searchParams.error_description[0] 
        : searchParams.error_description || 'Authentication was cancelled or failed';
      setError(errorDescription);
      return;
    }

    // Validate required parameters
    if (!code || !state) {
      setError('Invalid authentication callback - missing required parameters');
      return;
    }

    try {
      const result = await authStore.handleOAuthCallback(code, state);
      
      if (result.success) {
        // Successful authentication - redirect to dashboard
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
    }
  };

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div class="container py-xl">
      <div class="card max-w-md mx-auto">
        <div class="card-body text-center">
          <Show
            when={!error()}
            fallback={
              <div>
                <div class="text-red-600 mb-md">
                  <svg class="w-12 h-12 mx-auto mb-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 class="text-lg font-semibold mb-md text-red-600">
                  Authentication Failed
                </h2>
                <p class="text-sm text-muted mb-lg">
                  {error()}
                </p>
                <div class="space-y-sm">
                  <button 
                    class="btn btn-primary w-full"
                    onClick={handleRetry}
                  >
                    Try Again
                  </button>
                  <a 
                    href="/" 
                    class="btn btn-outline w-full"
                  >
                    Go Home
                  </a>
                </div>
              </div>
            }
          >
            <div>
              <div class="mb-md">
                <LoadingSpinner />
              </div>
              <h2 class="text-lg font-semibold mb-md">
                Completing Sign In
              </h2>
              <p class="text-sm text-muted">
                Please wait while we complete your authentication...
              </p>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;