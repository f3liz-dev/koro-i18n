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
    <div style="
      background: var(--color-white);
      border-radius: var(--radius);
      border: var(--border);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: calc(100vh - 120px);
    ">
      {/* Header */}
      <div style="
        padding: 1rem;
        border-bottom: var(--border);
        flex-shrink: 0;
      ">
        <h2 style="
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: var(--color-black);
        ">Translation Keys</h2>
        
        {/* Search */}
        <input
          type="text"
          value={props.searchQuery}
          onInput={(e) => props.onSearchChange(e.currentTarget.value)}
          placeholder="Search keys..."
          class="input"
          style="margin-bottom: 0.5rem;"
        />

        {/* Filter */}
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <button
            onClick={() => props.onFilterChange('all')}
            class="btn"
            style={props.filterStatus === 'all' ? 'background: var(--color-black); color: var(--color-white); border-color: var(--color-black);' : ''}
          >
            All
          </button>
          <button
            onClick={() => props.onFilterChange('valid')}
            class="btn"
            style={props.filterStatus === 'valid' ? 'background: var(--color-mint); border-color: var(--color-mint);' : ''}
          >
            Valid
          </button>
          <button
            onClick={() => props.onFilterChange('invalid')}
            class="btn"
            style={props.filterStatus === 'invalid' ? 'background: var(--color-peach); border-color: var(--color-peach);' : ''}
          >
            Outdated
          </button>
        </div>

        {/* Sort Method */}
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;">
          <span style="font-size: 0.75rem; color: var(--color-gray-500);">Sort:</span>
          <button
            onClick={() => props.onSortMethodChange('priority')}
            class="btn"
            style={props.sortMethod === 'priority' ? 'background: var(--color-black); color: var(--color-white); border-color: var(--color-black);' : ''}
            title="Sort by priority: empty first, then outdated"
          >
            Priority
          </button>
          <button
            onClick={() => props.onSortMethodChange('alphabetical')}
            class="btn"
            style={props.sortMethod === 'alphabetical' ? 'background: var(--color-black); color: var(--color-white); border-color: var(--color-black);' : ''}
            title="Sort alphabetically by key"
          >
            A-Z
          </button>
          <button
            onClick={() => props.onSortMethodChange('completion')}
            class="btn"
            style={props.sortMethod === 'completion' ? 'background: var(--color-black); color: var(--color-white); border-color: var(--color-black);' : ''}
            title="Sort by completion status"
          >
            Status
          </button>
        </div>

        <div style="font-size: 0.75rem; color: var(--color-gray-500); margin-top: 0.5rem;">
          {props.translationStrings.length} keys
        </div>
      </div>

      {/* List */}
      <div style="flex: 1; overflow-y: auto;">
        <Show
          when={!props.isLoading}
          fallback={
            <div style="padding: 2rem; text-align: center; color: var(--color-gray-500);">
              <div style="
                width: 2rem;
                height: 2rem;
                border: 3px solid var(--color-gray-200);
                border-top-color: var(--color-black);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 0.5rem;
              "></div>
              <p>Loading translations...</p>
            </div>
          }
        >
          <Show
            when={props.translationStrings.length > 0}
            fallback={
              <div style="padding: 2rem; text-align: center; color: var(--color-gray-500);">
                <p>No translations found</p>
              </div>
            }
          >
            <For each={props.translationStrings}>
              {(translation) => (
                <button
                  onClick={() => props.onSelectKey(translation.key)}
                  style={`
                    width: 100%;
                    text-align: left;
                    padding: 0.75rem;
                    border-bottom: var(--border);
                    transition: var(--transition);
                    background: ${props.selectedKey === translation.key ? 'var(--color-gray-50)' : 'transparent'};
                    border-left: ${props.selectedKey === translation.key ? '3px solid var(--color-black)' : '3px solid transparent'};
                  `}
                  onMouseEnter={(e) => {
                    if (props.selectedKey !== translation.key) {
                      e.currentTarget.style.background = 'var(--color-gray-50)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (props.selectedKey !== translation.key) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style="display: flex; align-items: start; justify-content: space-between; gap: 0.5rem;">
                    <div style="flex: 1; min-width: 0;">
                      <code style="
                        font-size: 0.75rem;
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        color: var(--color-black);
                        display: block;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        font-weight: 500;
                      ">
                        {translation.key}
                      </code>
                      <p style="
                        font-size: 0.813rem;
                        color: var(--color-gray-600);
                        margin-top: 0.25rem;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                      ">
                        {translation.sourceValue}
                      </p>
                      <Show when={translation.currentValue !== translation.sourceValue && translation.currentValue}>
                        <p style="
                          font-size: 0.813rem;
                          color: var(--color-blue);
                          margin-top: 0.25rem;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                        ">
                          → {translation.currentValue}
                        </p>
                      </Show>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: end; gap: 0.25rem; flex-shrink: 0;">
                      <Show when={!translation.isValid}>
                        <span class="badge warning">
                          ⚠
                        </span>
                      </Show>
                      <Show when={translation.webTranslation}>
                        <span class="badge success">
                          Web
                        </span>
                      </Show>
                      <Show when={translation.gitBlame && !translation.webTranslation}>
                        <span class="badge">
                          Git
                        </span>
                      </Show>
                    </div>
                  </div>
                </button>
              )}
            </For>
          </Show>
        </Show>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
