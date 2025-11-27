import { Show, For } from "solid-js";
import type { UiMergedTranslation as MergedTranslation } from "../../utils/translationApi";
import type { SortMethod } from "../../hooks/useTranslationEditor";

interface TranslationListProps {
  translationStrings: MergedTranslation[];
  selectedKey: string | null;
  language: string;
  isLoading: boolean;
  searchQuery: string;
  filterStatus: 'all' | 'valid' | 'invalid';
  sortMethod: SortMethod;
  onSelectKey: (key: string) => void;
  onSearchChange: (query: string) => void;
  onFilterChange: (status: 'all' | 'valid' | 'invalid') => void;
  onSortMethodChange: (method: SortMethod) => void;
}

export function TranslationList(props: TranslationListProps) {
  return (
    <div class="card" style={{
      display: 'flex',
      'flex-direction': 'column',
      height: '100%',
      'max-height': 'calc(100vh - 140px)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem',
        'border-bottom': '1px solid var(--border-light)',
        'flex-shrink': '0'
      }}>
        <h2 style={{ 
          'font-size': '1.0625rem', 
          'font-weight': '700', 
          'margin-bottom': '1rem',
          'letter-spacing': '-0.01em'
        }}>
          Translation Keys
        </h2>

        {/* Search */}
        <div style={{ position: 'relative', 'margin-bottom': '0.75rem' }}>
          <span style={{
            position: 'absolute',
            left: '0.875rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={props.searchQuery}
            onInput={(e) => props.onSearchChange(e.currentTarget.value)}
            placeholder="Search keys..."
            class="input"
            style={{ 'padding-left': '2.5rem' }}
          />
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '0.375rem', 'margin-bottom': '0.75rem' }}>
          <button
            onClick={() => props.onFilterChange('all')}
            class={`btn sm ${props.filterStatus === 'all' ? 'selected' : 'ghost'}`}
          >
            All
          </button>
          <button
            onClick={() => props.onFilterChange('valid')}
            class={`btn sm ${props.filterStatus === 'valid' ? 'success' : 'ghost'}`}
          >
            ✓ Valid
          </button>
          <button
            onClick={() => props.onFilterChange('invalid')}
            class={`btn sm ${props.filterStatus === 'invalid' ? 'warning' : 'ghost'}`}
          >
            Outdated
          </button>
        </div>

        {/* Sort Method */}
        <div style={{ display: 'flex', gap: '0.375rem', 'align-items': 'center' }}>
          <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-right': '0.25rem' }}>Sort:</span>
          <button
            onClick={() => props.onSortMethodChange('priority')}
            class={`btn sm ${props.sortMethod === 'priority' ? 'selected' : 'ghost'}`}
          >
            Priority
          </button>
          <button
            onClick={() => props.onSortMethodChange('alphabetical')}
            class={`btn sm ${props.sortMethod === 'alphabetical' ? 'selected' : 'ghost'}`}
          >
            A-Z
          </button>
          <button
            onClick={() => props.onSortMethodChange('completion')}
            class={`btn sm ${props.sortMethod === 'completion' ? 'selected' : 'ghost'}`}
          >
            Status
          </button>
        </div>

        <div style={{ 
          'font-size': '0.75rem', 
          color: 'var(--text-muted)', 
          'margin-top': '0.75rem',
          'padding-top': '0.75rem',
          'border-top': '1px solid var(--border-light)'
        }}>
          {props.translationStrings.length} keys
        </div>
      </div>

      {/* List */}
      <div style={{ flex: '1', 'overflow-y': 'auto' }}>
        <Show
          when={!props.isLoading}
          fallback={
            <div style={{ 
              padding: '2.5rem', 
              'text-align': 'center', 
              color: 'var(--text-secondary)' 
            }}>
              <div class="animate-spin" style={{
                width: '2rem',
                height: '2rem',
                border: '3px solid var(--border)',
                'border-top-color': 'var(--accent)',
                'border-radius': '50%',
                margin: '0 auto 0.75rem'
              }} />
              <p style={{ 'font-size': '0.875rem' }}>Loading translations...</p>
            </div>
          }
        >
          <Show
            when={props.translationStrings.length > 0}
            fallback={
              <div style={{ 
                padding: '2.5rem', 
                'text-align': 'center', 
                color: 'var(--text-muted)' 
              }}>
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 0.75rem', opacity: '0.5' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ 'font-size': '0.875rem' }}>No translations found</p>
              </div>
            }
          >
            <For each={props.translationStrings}>
              {(translation) => (
                <button
                  onClick={() => props.onSelectKey(translation.key)}
                  style={{
                    width: '100%',
                    'text-align': 'left',
                    padding: '0.875rem 1rem',
                    'border-bottom': '1px solid var(--border-light)',
                    background: props.selectedKey === translation.key ? 'var(--accent-light)' : 'transparent',
                    'border-left': props.selectedKey === translation.key ? '3px solid var(--accent)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: 'none'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    'align-items': 'flex-start', 
                    'justify-content': 'space-between', 
                    gap: '0.625rem' 
                  }}>
                    <div style={{ flex: '1', 'min-width': '0' }}>
                      <code style={{
                        'font-size': '0.8125rem',
                        'font-family': 'ui-monospace, monospace',
                        display: 'block',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'white-space': 'nowrap',
                        'font-weight': '600',
                        color: props.selectedKey === translation.key ? 'var(--accent)' : 'var(--text)'
                      }}>
                        {translation.key}
                      </code>
                      <p style={{
                        'font-size': '0.8125rem',
                        color: 'var(--text-secondary)',
                        'margin-top': '0.375rem',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'white-space': 'nowrap',
                        'line-height': '1.4'
                      }}>
                        {translation.sourceValue}
                      </p>
                      <Show when={translation.currentValue !== translation.sourceValue && translation.currentValue}>
                        <p style={{
                          'font-size': '0.8125rem',
                          color: 'var(--success-dark)',
                          'margin-top': '0.25rem',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          'white-space': 'nowrap'
                        }}>
                          → {translation.currentValue}
                        </p>
                      </Show>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      'flex-direction': 'column', 
                      'align-items': 'flex-end', 
                      gap: '0.25rem', 
                      'flex-shrink': '0' 
                    }}>
                      <Show when={!translation.isValid}>
                        <span class="badge warning" style={{ 'font-size': '0.625rem' }}>⚠</span>
                      </Show>
                      <Show when={translation.webTranslation}>
                        <span class="badge success" style={{ 'font-size': '0.625rem' }}>Web</span>
                      </Show>
                      <Show when={translation.storeEntry && translation.storeEntry.status === 'verified'}>
                        <span class="badge success" style={{ 'font-size': '0.625rem' }} title="Store: verified">✓</span>
                      </Show>
                      <Show when={translation.storeEntry && translation.storeEntry.status === 'pending'}>
                        <span class="badge warning" style={{ 'font-size': '0.625rem' }} title="Store: pending">⏳</span>
                      </Show>
                      <Show when={translation.gitBlame && !translation.webTranslation}>
                        <span class="badge neutral" style={{ 'font-size': '0.625rem' }}>Git</span>
                      </Show>
                    </div>
                  </div>
                </button>
              )}
            </For>
          </Show>
        </Show>
      </div>
    </div>
  );
}
