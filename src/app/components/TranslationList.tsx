import { For, Show, createSignal } from 'solid-js';

interface TranslationString {
  key: string;
  sourceValue: string;
  currentValue?: string;
  suggestionStatus?: 'none' | 'pending' | 'approved';
}

interface TranslationListProps {
  translationStrings: TranslationString[];
  selectedKey: string | null;
  language: string;
  isLoading: boolean;
  onSelectKey: (key: string) => void;
}

type SortOrder = 'default' | 'alphabetical' | 'completion';
type FilterType = 'all' | 'noSuggestion' | 'pending' | 'approved';

export default function TranslationList(props: TranslationListProps) {
  const [sortOrder, setSortOrder] = createSignal<SortOrder>('default');
  const [filterType, setFilterType] = createSignal<FilterType>('all');

  const getSuggestionStatus = (str: TranslationString): 'none' | 'pending' | 'approved' => {
    // This is a simplified check - in a real implementation, this would come from API data
    // For now, we assume: currentValue = approved, no currentValue = none
    // The parent component should ideally pass this information
    return str.suggestionStatus || (str.currentValue ? 'approved' : 'none');
  };

  const sortedAndFilteredStrings = () => {
    let filtered = props.translationStrings;
    
    // Apply filter
    const filter = filterType();
    if (filter !== 'all') {
      filtered = filtered.filter(str => {
        const status = getSuggestionStatus(str);
        if (filter === 'noSuggestion') return status === 'none';
        if (filter === 'pending') return status === 'pending';
        if (filter === 'approved') return status === 'approved';
        return true;
      });
    }
    
    // Apply sort
    const sort = sortOrder();
    const sorted = [...filtered];
    
    if (sort === 'default') {
      // Default: not suggested first, pending second, approved third
      sorted.sort((a, b) => {
        const statusA = getSuggestionStatus(a);
        const statusB = getSuggestionStatus(b);
        const orderMap = { 'none': 0, 'pending': 1, 'approved': 2 };
        return orderMap[statusA] - orderMap[statusB];
      });
    } else if (sort === 'alphabetical') {
      sorted.sort((a, b) => a.key.localeCompare(b.key));
    } else if (sort === 'completion') {
      sorted.sort((a, b) => {
        const aComplete = a.currentValue ? 1 : 0;
        const bComplete = b.currentValue ? 1 : 0;
        return aComplete - bComplete; // Incomplete first
      });
    }
    
    return sorted;
  };

  return (
    <div class="bg-white rounded-lg shadow flex-1 lg:h-[calc(100vh-200px)] lg:sticky lg:top-20 flex flex-col overflow-hidden">
      <div class="p-2 lg:p-4 border-b flex-shrink-0">
        <h2 class="text-base lg:text-lg font-semibold mb-2">Translation Strings</h2>
        
        {/* Filter and Sort Controls */}
        <div class="space-y-2">
          <select
            value={sortOrder()}
            onChange={(e) => setSortOrder(e.currentTarget.value as SortOrder)}
            class="w-full px-2 py-1 text-xs lg:text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="default">Sort: Default (No suggestion first)</option>
            <option value="alphabetical">Sort: Alphabetical</option>
            <option value="completion">Sort: Completion status</option>
          </select>
          
          <select
            value={filterType()}
            onChange={(e) => setFilterType(e.currentTarget.value as FilterType)}
            class="w-full px-2 py-1 text-xs lg:text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Filter: All</option>
            <option value="noSuggestion">Filter: No suggestion</option>
            <option value="pending">Filter: Pending suggestions</option>
            <option value="approved">Filter: Approved</option>
          </select>
        </div>
        
        <p class="text-xs lg:text-sm text-gray-600 mt-2">
          {sortedAndFilteredStrings().length} of {props.translationStrings.length} strings
        </p>
      </div>
      <div class="divide-y overflow-y-auto flex-1">
        <Show when={props.isLoading}>
          <div class="p-4 lg:p-8 text-center text-gray-500">
            <div class="animate-spin rounded-full h-8 w-8 lg:h-12 lg:w-12 border-b-2 border-blue-600 mx-auto mb-2 lg:mb-4"></div>
            <p class="text-sm lg:text-base">Loading...</p>
          </div>
        </Show>
        <Show when={!props.isLoading && sortedAndFilteredStrings().length === 0}>
          <div class="p-4 lg:p-8 text-center text-gray-500">
            <p class="mb-1 lg:mb-2 text-sm lg:text-base">No translation strings match the filter</p>
            <p class="text-xs lg:text-sm">Try changing the filter settings</p>
          </div>
        </Show>
        <For each={sortedAndFilteredStrings()}>
          {(str) => (
            <div
              class={`p-3 lg:p-4 cursor-pointer hover:bg-gray-50 transition ${
                props.selectedKey === str.key ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => props.onSelectKey(str.key)}
            >
              <div class="flex items-start justify-between mb-1 lg:mb-2">
                <code class="text-xs lg:text-sm font-mono text-gray-700 truncate pr-2">{str.key}</code>
                <Show when={str.currentValue}>
                  <span class="text-xs bg-green-100 text-green-800 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded whitespace-nowrap">
                    ✓
                  </span>
                </Show>
              </div>
              <div class="text-xs lg:text-sm text-gray-600 mb-0.5 lg:mb-1 truncate">
                <span class="font-medium">EN:</span> {str.sourceValue}
              </div>
              <Show when={str.currentValue}>
                <div class="text-xs lg:text-sm text-gray-900 truncate">
                  <span class="font-medium">{props.language.toUpperCase()}:</span> {str.currentValue}
                </div>
              </Show>
              <Show when={!str.currentValue}>
                <div class="text-xs lg:text-sm text-gray-400 italic">
                  No translation
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
