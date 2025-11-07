/**
 * User Profile Component
 * Displays authenticated user information with reactive updates
 */

import { Component, Show, createMemo } from 'solid-js';
import { authStore } from '../../stores/authStore';
import LogoutButton from './LogoutButton';

interface UserProfileProps {
  class?: string;
  showLogout?: boolean;
  compact?: boolean;
}

const UserProfile: Component<UserProfileProps> = (props) => {
  const user = createMemo(() => authStore.user);
  const showLogout = props.showLogout ?? true;
  const compact = props.compact ?? false;

  return (
    <Show when={user()}>
      <div class={`flex items-center ${props.class || ''}`}>
        <div class="flex items-center">
          <img
            src={user()!.avatarUrl}
            alt={`${user()!.username}'s avatar`}
            class={`rounded-full ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
            loading="lazy"
          />
          <Show when={!compact}>
            <div class="ml-3">
              <div class="text-sm font-medium">
                {user()!.username}
              </div>
              <Show when={user()!.email}>
                <div class="text-xs text-muted">
                  {user()!.email}
                </div>
              </Show>
            </div>
          </Show>
        </div>
        
        <Show when={showLogout}>
          <div class={compact ? 'ml-2' : 'ml-4'}>
            <LogoutButton 
              variant="link" 
              class={compact ? 'text-xs' : ''}
            />
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default UserProfile;