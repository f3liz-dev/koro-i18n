import { For, Show } from 'solid-js';

interface HistoryEntry {
  id: string;
  value: string;
  userId: string;
  username?: string;
  avatarUrl?: string;
  action: string;
  commitSha?: string;
  createdAt: string;
}

interface TranslationHistoryPanelProps {
  history: HistoryEntry[] | undefined;
  isLoading: boolean;
  show: boolean;
}

export default function TranslationHistoryPanel(props: TranslationHistoryPanelProps) {
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

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'submitted':
        return '📝';
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
          <h3 class="text-sm font-semibold text-gray-900 mb-3">Translation History</h3>
          
          <Show when={props.isLoading}>
            <div class="text-center py-6">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p class="text-xs text-gray-500">Loading history...</p>
            </div>
          </Show>

          <Show when={!props.isLoading && (!props.history || props.history.length === 0)}>
            <div class="text-center py-6 text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm">No history yet</p>
              <p class="text-xs mt-1">Submit a translation to start tracking history</p>
            </div>
          </Show>

          <Show when={!props.isLoading && props.history && props.history.length > 0}>
            <div class="space-y-3 max-h-[400px] overflow-y-auto">
              <For each={props.history}>
                {(entry, index) => (
                  <div class={`relative pl-6 pb-3 ${index() < props.history!.length - 1 ? 'border-l-2 border-gray-200' : ''}`}>
                    {/* Timeline dot */}
                    <div class="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
                    
                    <div class="bg-gray-50 rounded-lg p-3 border">
                      {/* Header with User Info */}
                      <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          {/* User Avatar */}
                          <Show when={entry.username}>
                            <img
                              src={entry.avatarUrl || `https://ui-avatars.com/api/?name=${entry.username}`}
                              alt={entry.username}
                              class="w-6 h-6 rounded-full flex-shrink-0"
                            />
                          </Show>
                          
                          <div class="flex flex-col min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                              <Show when={entry.username}>
                                <span class="text-sm font-medium text-gray-900 truncate">
                                  {entry.username}
                                </span>
                              </Show>
                              <span class="text-lg flex-shrink-0">{getActionIcon(entry.action)}</span>
                              <span class={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${getActionBadge(entry.action)}`}>
                                {entry.action}
                              </span>
                            </div>
                            <span class="text-xs text-gray-500" title={formatDate(entry.createdAt)}>
                              {formatRelativeTime(entry.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Value */}
                      <Show when={entry.action !== 'deleted'}>
                        <div class="bg-white p-2 rounded border text-sm text-gray-900 mb-2">
                          {entry.value}
                        </div>
                      </Show>

                      {/* Commit SHA */}
                      <Show when={entry.commitSha}>
                        <div class="flex items-center gap-2 text-xs text-gray-500">
                          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                          </svg>
                          <code class="font-mono">{entry.commitSha.substring(0, 7)}</code>
                        </div>
                      </Show>
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
