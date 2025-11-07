import { Component, createSignal, Show, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { authStore } from '../stores/authStore';
import LoginButton from '../components/auth/LoginButton';

const LoginPage: Component = () => {
  const navigate = useNavigate();
  const [error, setError] = createSignal<string | null>(null);

  // Redirect if already authenticated
  createEffect(() => {
    if (!authStore.isLoading && authStore.isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  });

  const handleLoginSuccess = () => {
    // OAuth flow will handle redirect
    setError(null);
  };

  const handleLoginError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div class="container py-xl">
      <div class="card max-w-md mx-auto">
        <div class="card-header text-center">
          <h1 class="text-xl font-semibold">Sign in to I18n Platform</h1>
          <p class="text-sm text-muted mt-sm">
            Connect with your GitHub account to get started
          </p>
        </div>
        <div class="card-body">
          <Show when={error()}>
            <div class="bg-red-50 border border-red-200 rounded-md p-3 mb-md">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-red-800">{error()}</p>
                </div>
                <div class="ml-auto pl-3">
                  <button
                    class="text-red-400 hover:text-red-600"
                    onClick={clearError}
                  >
                    <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </Show>

          <LoginButton 
            class="w-full"
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
          />
          
          <div class="mt-lg text-center">
            <p class="text-xs text-muted">
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;