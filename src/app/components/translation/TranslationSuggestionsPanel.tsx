import { For, Show } from 'solid-js';
import { SkeletonListItem } from '../ui';

interface SuggestionEntry {
  id: string;
  projectName?: string;  // Optional for flexibility
  projectId?: string;    // Alternative to projectName
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

/**
 * Virtual suggestion from repository (Phase 2: Hybrid Buffer)
 * When the repository has a value that differs from D1 or has no D1 record
 */
interface VirtualSuggestion {
  key: string;
  value: string;
  source: 'repository';
}

interface TranslationSuggestionsPanelProps {
  suggestions: SuggestionEntry[] | undefined;
  virtualSuggestions?: VirtualSuggestion[];
  isLoading: boolean;
  show: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onImportFromRepo?: (key: string, value: string) => void;
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

  // Get virtual suggestions (from repository)
  const getVirtualSuggestions = () => {
    return props.virtualSuggestions || [];
  };

  const hasContent = () => {
    return (props.suggestions && props.suggestions.length > 0) || 
           getVirtualSuggestions().length > 0;
  };

  return (
    <Show when={props.show}>
      <div style={{ 'border-top': '1px solid var(--border)', padding: '1rem' }}>
        <h3 style={{ 'font-size': '0.875rem', 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Suggestions</h3>

        <Show when={props.isLoading}>
          <SkeletonListItem />
          <SkeletonListItem />
        </Show>

        <Show when={!props.isLoading && !hasContent()}>
          <div style={{ 'text-align': 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
            <p style={{ 'font-size': '0.875rem' }}>No suggestions yet</p>
          </div>
        </Show>

        <Show when={!props.isLoading && hasContent()}>
          <div class="space-y-2" style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
            {/* Virtual Suggestions from Repository (Phase 2: Hybrid Buffer) */}
            <For each={getVirtualSuggestions()}>
              {(vs) => (
                <div class="panel" style={{ 
                  'border-left': '3px solid var(--accent)',
                  background: 'var(--accent-light)'
                }}>
                  <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '0.75rem' }}>
                    <div style={{ flex: '1', 'min-width': '0' }}>
                      <div style={{ 'margin-bottom': '0.5rem', 'font-size': '0.9375rem' }}>
                        {vs.value}
                      </div>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                        <span class="badge" style={{ 
                          background: 'var(--accent)',
                          color: 'white',
                          'font-size': '0.6875rem',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.25rem'
                        }}>
                          <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          From Repository
                        </span>
                        <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                          External translation
                        </span>
                      </div>
                    </div>

                    <Show when={props.onImportFromRepo}>
                      <div style={{ display: 'flex', gap: '0.375rem', 'flex-shrink': '0' }}>
                        <button 
                          onClick={() => props.onImportFromRepo?.(vs.key, vs.value)} 
                          class="btn primary" 
                          style={{ 'font-size': '0.75rem', padding: '0.375rem 0.625rem' }}
                          title="Import & Keep: Accept this translation from repository"
                        >
                          Import & Keep
                        </button>
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </For>

            {/* Regular Suggestions from D1 */}
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
