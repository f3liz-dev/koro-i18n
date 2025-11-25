import { Show, For } from "solid-js";
import type { MergedTranslation } from "../../utils/translationApi";
import type { SortMethod } from "../../pages/TranslationEditorPage";

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
      'max-height': 'calc(100vh - 120px)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        'border-bottom': '1px solid var(--border)',
        'flex-shrink': '0'
      }}>
        <h2 style={{ 'font-size': '1rem', 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
          Translation Keys
        </h2>
        
        {/* Search */}
        <input
          type="text"
          value={props.searchQuery}
          onInput={(e) => props.onSearchChange(e.currentTarget.value)}
          placeholder="Search keys..."
          class="input"
          style={{ 'margin-bottom': '0.5rem' }}
        />

        {/* Filter */}
        <div style={{ display: 'flex', gap: '0.375rem', 'margin-bottom': '0.5rem', 'flex-wrap': 'wrap' }}>
          <button
            onClick={() => props.onFilterChange('all')}
            class={`btn ${props.filterStatus === 'all' ? 'selected' : 'ghost'}`}
            style={{ 'font-size': '0.75rem', padding: '0.375rem 0.625rem' }}
          >
            All
          </button>
          <button
            onClick={() => props.onFilterChange('valid')}
            class={`btn ${props.filterStatus === 'valid' ? 'success' : 'ghost'}`}
            style={{ 'font-size': '0.75rem', padding: '0.375rem 0.625rem' }}
          >
            Valid
          </button>
          <button
            onClick={() => props.onFilterChange('invalid')}
            class={`btn ${props.filterStatus === 'invalid' ? 'warning' : 'ghost'}`}
            style={{ 'font-size': '0.75rem', padding: '0.375rem 0.625rem' }}
          >
            Outdated
          </button>
        </div>

        {/* Sort Method */}
        <div style={{ display: 'flex', gap: '0.375rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
          <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Sort:</span>
          <button
            onClick={() => props.onSortMethodChange('priority')}
            class={`btn ${props.sortMethod === 'priority' ? 'selected' : 'ghost'}`}
            style={{ 'font-size': '0.75rem', padding: '0.375rem 0.625rem' }}
          >
            Priority
          </button>
          <button
            onClick={() => props.onSortMethodChange('alphabetical')}
            class={`btn ${props.sortMethod === 'alphabetical' ? 'selected' : 'ghost'}`}
            style={{ 'font-size': '0.75rem', padding: '0.375rem 0.625rem' }}
          >
            A-Z
          </button>
          <button
            onClick={() => props.onSortMethodChange('completion')}
            class={`btn ${props.sortMethod === 'completion' ? 'selected' : 'ghost'}`}
            style={{ 'font-size': '0.75rem', padding: '0.375rem 0.625rem' }}
          >
            Status
          </button>
        </div>

        <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.5rem' }}>
          {props.translationStrings.length} keys
        </div>
      </div>

      {/* List */}
      <div style={{ flex: '1', 'overflow-y': 'auto' }}>
        <Show
          when={!props.isLoading}
          fallback={
            <div style={{ padding: '2rem', 'text-align': 'center', color: 'var(--text-secondary)' }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                border: '3px solid var(--border)',
                'border-top-color': 'var(--accent)',
                'border-radius': '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 0.5rem'
              }} />
              <p>Loading...</p>
            </div>
          }
        >
          <Show
            when={props.translationStrings.length > 0}
            fallback={
              <div style={{ padding: '2rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
                <p>No translations found</p>
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
                    padding: '0.75rem',
                    'border-bottom': '1px solid var(--border)',
                    background: props.selectedKey === translation.key ? 'var(--surface)' : 'transparent',
                    'border-left': props.selectedKey === translation.key ? '3px solid var(--accent)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: '1', 'min-width': '0' }}>
                      <code style={{
                        'font-size': '0.75rem',
                        'font-family': 'ui-monospace, monospace',
                        display: 'block',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'white-space': 'nowrap',
                        'font-weight': '500'
                      }}>
                        {translation.key}
                      </code>
                      <p style={{
                        'font-size': '0.8125rem',
                        color: 'var(--text-secondary)',
                        'margin-top': '0.25rem',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'white-space': 'nowrap'
                      }}>
                        {translation.sourceValue}
                      </p>
                      <Show when={translation.currentValue !== translation.sourceValue && translation.currentValue}>
                        <p style={{
                          'font-size': '0.8125rem',
                          color: 'var(--accent)',
                          'margin-top': '0.25rem',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          'white-space': 'nowrap'
                        }}>
                          → {translation.currentValue}
                        </p>
                      </Show>
                    </div>
                    <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'flex-end', gap: '0.25rem', 'flex-shrink': '0' }}>
                      <Show when={!translation.isValid}>
                        <span class="badge warning">⚠</span>
                      </Show>
                      <Show when={translation.webTranslation}>
                        <span class="badge success">Web</span>
                      </Show>
                      <Show when={translation.gitBlame && !translation.webTranslation}>
                        <span class="badge">Git</span>
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
