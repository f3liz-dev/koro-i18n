import { For, Show } from 'solid-js';
import { SkeletonListItem } from '../ui';

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

export function TranslationHistoryPanel(props: TranslationHistoryPanelProps) {
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
      case 'submitted': return 'badge';
      case 'approved': return 'badge success';
      case 'committed': return 'badge';
      case 'rejected': return 'badge danger';
      default: return 'badge';
    }
  };

  return (
    <Show when={props.show}>
      <div style={{ 'border-top': '1px solid var(--border)', padding: '1rem' }}>
        <h3 style={{ 'font-size': '0.875rem', 'font-weight': '600', 'margin-bottom': '0.75rem' }}>History</h3>
        
        <Show when={props.isLoading}>
          <SkeletonListItem />
          <SkeletonListItem />
        </Show>

        <Show when={!props.isLoading && (!props.history || props.history.length === 0)}>
          <div style={{ 'text-align': 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
            <p style={{ 'font-size': '0.875rem' }}>No history yet</p>
          </div>
        </Show>

        <Show when={!props.isLoading && props.history && props.history.length > 0}>
          <div class="space-y-2" style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
            <For each={props.history}>
              {(entry) => (
                <div class="panel">
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem', 'flex-wrap': 'wrap' }}>
                    <Show when={entry.username}>
                      <img
                        src={entry.avatarUrl || `https://ui-avatars.com/api/?name=${entry.username}`}
                        alt={entry.username}
                        style={{ width: '1.25rem', height: '1.25rem', 'border-radius': '50%' }}
                      />
                      <span style={{ 'font-size': '0.75rem', 'font-weight': '500' }}>{entry.username}</span>
                    </Show>
                    <span class={getActionBadge(entry.action)}>{entry.action}</span>
                    <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </div>

                  <Show when={entry.action !== 'deleted'}>
                    <div style={{ 'font-size': '0.9375rem' }}>{entry.value}</div>
                  </Show>

                  <Show when={entry.commitSha}>
                    <code class="code-chip" style={{ 'font-size': '0.75rem', 'margin-top': '0.375rem', display: 'inline-block' }}>
                      {entry.commitSha?.substring(0, 7)}
                    </code>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
}
