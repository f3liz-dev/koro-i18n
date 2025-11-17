import { For, Show } from 'solid-js';
import { SkeletonListItem } from '../Skeleton';

interface SuggestionEntry {
  id: string;
  projectId: string;
  language: string;
  key: string;
  value: string;
  userId: string;
  username?: string;
  avatarUrl?: string;
  status: 'pending' | 'approved' | 'committed' | 'rejected' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

interface TranslationSuggestionsPanelProps {
  suggestions: SuggestionEntry[] | undefined;
  isLoading: boolean;
  show: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function TranslationSuggestionsPanel(props: TranslationSuggestionsPanelProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'committed':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'deleted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'approved':
        return '✅';
      case 'committed':
        return '🚀';
      case 'rejected':
        return '❌';
      case 'deleted':
        return '🗑️';
      default:
        return '•';
    }
  };

  return (
    <Show when={props.show}>
      <div class="border-t bg-white">
        <div class="p-3 lg:p-4">
          <h3 class="text-sm font-semibold text-gray-900 mb-3">Translation Suggestions</h3>
          
          <Show when={props.isLoading}>
            <div class="py-3">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          </Show>

          <Show when={!props.isLoading && (!props.suggestions || props.suggestions.length === 0)}>
            <div class="text-center py-6 text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-sm">No suggestions yet</p>
              <p class="text-xs mt-1">Submit a translation to start tracking suggestions</p>
            </div>
          </Show>

          <Show when={!props.isLoading && props.suggestions && props.suggestions.length > 0}>
            <div class="space-y-3 max-h-[400px] overflow-y-auto">
              <For each={props.suggestions}>
                {(entry, index) => (
                  <div class={`relative pl-6 pb-3 ${index() < props.suggestions!.length - 1 ? 'border-l-2 border-gray-200' : ''}`}>
                    {/* Timeline dot */}
                    <div class="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
                    
                    <div class="bg-gray-50 rounded-lg p-3 border">
                      {/* Main horizontal layout */}
                      <div class="flex items-start gap-3">
                        {/* Left side: vertical layout with value and user info */}
                        <div class="flex flex-col gap-2 flex-1 min-w-0">
                          {/* Value */}
                          <Show when={entry.status !== 'deleted'}>
                            <div class="bg-white p-2 rounded border text-sm text-gray-900">
                              {entry.value}
                            </div>
                          </Show>
                          
                          {/* Horizontal layout for profile image, username, and date */}
                          <div class="flex items-center gap-2">
                            {/* User Avatar */}
                            <Show when={entry.username}>
                              <img
                                src={entry.avatarUrl || `https://ui-avatars.com/api/?name=${entry.username}`}
                                alt={entry.username}
                                class="w-6 h-6 rounded-full flex-shrink-0"
                              />
                            </Show>
                            
                            {/* Username */}
                            <Show when={entry.username}>
                              <span class="text-sm font-medium text-gray-900 truncate">
                                {entry.username}
                              </span>
                            </Show>
                            
                            {/* Date */}
                            <span class="text-xs text-gray-500" title={formatDate(entry.createdAt)}>
                              {formatRelativeTime(entry.createdAt)}
                            </span>
                            
                            {/* Status icon and badge */}
                            <span class="text-lg flex-shrink-0">{getStatusIcon(entry.status)}</span>
                            <span class={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${getStatusBadge(entry.status)}`}>
                              {entry.status}
                            </span>
                          </div>
                        </div>

                        {/* Right side: Action buttons for pending suggestions */}
                        <Show when={entry.status === 'pending' && props.onApprove && props.onReject}>
                          <div class="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => props.onApprove?.(entry.id)}
                              class="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded transition whitespace-nowrap"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => props.onReject?.(entry.id)}
                              class="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded transition whitespace-nowrap"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
