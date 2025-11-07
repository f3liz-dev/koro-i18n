/**
 * Logout Button Component with session cleanup
 */

import { Component, createSignal, Show } from 'solid-js';
import { authStore } from '../../stores/authStore';

interface LogoutButtonProps {
  class?: string;
  variant?: 'button' | 'link';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const LogoutButton: Component<LogoutButtonProps> = (props) => {
  const [isLoggingOut, setIsLoggingOut] = createSignal(false);

  const handleLogout = async () => {
    if (isLoggingOut()) return;

    setIsLoggingOut(true);
    authStore.clearError();

    try {
      const result = await authStore.logout();
      
      if (result.success) {
        props.onSuccess?.();
      } else {
        props.onError?.(result.error || 'Logout failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      props.onError?.(errorMessage);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const baseClass = props.variant === 'link' 
    ? 'text-sm text-muted hover:text-primary cursor-pointer' 
    : 'btn btn-outline';

  return (
    <button
      class={`${baseClass} ${props.class || ''}`}
      onClick={handleLogout}
      disabled={isLoggingOut() || authStore.isLoading}
      aria-label="Sign out"
    >
      <Show
        when={!isLoggingOut() && !authStore.isLoading}
        fallback={
          <div class="flex items-center">
            <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
            Signing out...
          </div>
        }
      >
        Sign out
      </Show>
    </button>
  );
};

export default LogoutButton;