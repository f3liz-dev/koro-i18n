import { For, Show } from 'solid-js';
import { SkeletonListItem } from '../ui';

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
      case 'pending': return 'badge warning';
      case 'approved': return 'badge success';
      case 'committed': return 'badge';
      case 'rejected': return 'badge danger';
      default: return 'badge';
    }
  };

  return (
    <Show when={props.show}>
      <div style={{ 'border-top': '1px solid var(--border)', padding: '1rem' }}>
        <h3 style={{ 'font-size': '0.875rem', 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Suggestions</h3>
        
        <Show when={props.isLoading}>
          <SkeletonListItem />
          <SkeletonListItem />
        </Show>

        <Show when={!props.isLoading && (!props.suggestions || props.suggestions.length === 0)}>
          <div style={{ 'text-align': 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
            <p style={{ 'font-size': '0.875rem' }}>No suggestions yet</p>
          </div>
        </Show>

        <Show when={!props.isLoading && props.suggestions && props.suggestions.length > 0}>
          <div class="space-y-2" style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
            <For each={props.suggestions}>
              {(entry) => (
                <div class="panel">
                  <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '0.75rem' }}>
                    <div style={{ flex: '1', 'min-width': '0' }}>
                      <Show when={entry.status !== 'deleted'}>
                        <div style={{ 'margin-bottom': '0.5rem', 'font-size': '0.9375rem' }}>
                          {entry.value}
                        </div>
                      </Show>
                      
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                        <Show when={entry.username}>
                          <img
                            src={entry.avatarUrl || `https://ui-avatars.com/api/?name=${entry.username}`}
                            alt={entry.username}
                            style={{ width: '1.25rem', height: '1.25rem', 'border-radius': '50%' }}
                          />
                          <span style={{ 'font-size': '0.75rem', 'font-weight': '500' }}>{entry.username}</span>
                        </Show>
                        <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                        <span class={getStatusBadge(entry.status)}>{entry.status}</span>
                      </div>
                    </div>

                    <Show when={entry.status === 'pending' && props.onApprove && props.onReject}>
                      <div style={{ display: 'flex', gap: '0.375rem', 'flex-shrink': '0' }}>
                        <button onClick={() => props.onApprove?.(entry.id)} class="btn success" style={{ 'font-size': '0.75rem', padding: '0.375rem 0.5rem' }}>
                          ✓
                        </button>
                        <button onClick={() => props.onReject?.(entry.id)} class="btn danger" style={{ 'font-size': '0.75rem', padding: '0.375rem 0.5rem' }}>
                          ✗
                        </button>
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
}
