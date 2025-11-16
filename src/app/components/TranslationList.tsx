import { Show, For } from "solid-js";
import type { MergedTranslation } from "../utils/translationApi";
import type { SortMethod } from "../pages/TranslationEditorPage";

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

export default function TranslationList(props: TranslationListProps) {
  return (
    <div class="bg-white rounded-lg shadow overflow-hidden flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Header */}
      <div class="p-4 border-b flex-shrink-0">
        <h2 class="text-lg font-semibold mb-3">Translation Keys</h2>
        
        {/* Search */}
        <input
          type="text"
          value={props.searchQuery}
          onInput={(e) => props.onSearchChange(e.currentTarget.value)}
          placeholder="Search keys..."
          class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
        />

        {/* Filter */}
        <div class="flex gap-2 mb-2">
          <button
            onClick={() => props.onFilterChange('all')}
            class={`px-3 py-1 text-xs rounded ${
              props.filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => props.onFilterChange('valid')}
            class={`px-3 py-1 text-xs rounded ${
              props.filterStatus === 'valid'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Valid
          </button>
          <button
            onClick={() => props.onFilterChange('invalid')}
            class={`px-3 py-1 text-xs rounded ${
              props.filterStatus === 'invalid'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Outdated
          </button>
        </div>

        {/* Sort Method */}
        <div class="flex gap-2 mb-2">
          <span class="text-xs text-gray-600 self-center mr-1">Sort:</span>
          <button
            onClick={() => props.onSortMethodChange('priority')}
            class={`px-3 py-1 text-xs rounded ${
              props.sortMethod === 'priority'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Sort by priority: empty first, then outdated"
          >
            Priority
          </button>
          <button
            onClick={() => props.onSortMethodChange('alphabetical')}
            class={`px-3 py-1 text-xs rounded ${
              props.sortMethod === 'alphabetical'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Sort alphabetically by key"
          >
            A-Z
          </button>
          <button
            onClick={() => props.onSortMethodChange('completion')}
            class={`px-3 py-1 text-xs rounded ${
              props.sortMethod === 'completion'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Sort by completion status"
          >
            Completion
          </button>
        </div>

        <div class="text-xs text-gray-500 mt-2">
          {props.translationStrings.length} keys
        </div>
      </div>

      {/* List */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={!props.isLoading}
          fallback={
            <div class="p-8 text-center text-gray-500">
              <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Loading translations...</p>
            </div>
          }
        >
          <Show
            when={props.translationStrings.length > 0}
            fallback={
              <div class="p-8 text-center text-gray-500">
                <p>No translations found</p>
              </div>
            }
          >
            <For each={props.translationStrings}>
              {(translation) => (
                <button
                  onClick={() => props.onSelectKey(translation.key)}
                  class={`w-full text-left p-3 border-b hover:bg-gray-50 transition ${
                    props.selectedKey === translation.key
                      ? 'bg-blue-50 border-l-4 border-l-blue-600'
                      : ''
                  }`}
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <code class="text-xs font-mono text-gray-700 block truncate">
                        {translation.key}
                      </code>
                      <p class="text-sm text-gray-600 mt-1 truncate">
                        {translation.sourceValue}
                      </p>
                      <Show when={translation.currentValue !== translation.sourceValue}>
                        <p class="text-sm text-blue-600 mt-1 truncate">
                          → {translation.currentValue}
                        </p>
                      </Show>
                    </div>
                    <div class="flex flex-col items-end gap-1 flex-shrink-0">
                      <Show when={!translation.isValid}>
                        <span class="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                          ⚠️
                        </span>
                      </Show>
                      <Show when={translation.webTranslation}>
                        <span class="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                          Web
                        </span>
                      </Show>
                      <Show when={translation.gitTranslation && !translation.webTranslation}>
                        <span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
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
    </div>
  );
}
