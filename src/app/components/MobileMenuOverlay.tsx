import { Show, createSignal } from 'solid-js';
import TranslationList from './TranslationList';
import type { MergedTranslation } from '../utils/translationApi';
import type { SortMethod } from '../pages/TranslationEditorPage';

interface MobileMenuOverlayProps {
  show: boolean;
  translationStrings: MergedTranslation[];
  selectedKey: string | null;
  language: string;
  isLoading: boolean;
  searchQuery: string;
  filterStatus: 'all' | 'valid' | 'invalid';
  sortMethod: SortMethod;
  onClose: () => void;
  onSelectKey: (key: string) => void;
  onSearchChange: (query: string) => void;
  onFilterChange: (status: 'all' | 'valid' | 'invalid') => void;
  onSortMethodChange: (method: SortMethod) => void;
}

export default function MobileMenuOverlay(props: MobileMenuOverlayProps) {
  const handleSelectKey = (key: string) => {
    props.onSelectKey(key);
    props.onClose(); // Close menu after selection on mobile
  };

  return (
    <Show when={props.show}>
      {/* Backdrop */}
      <div 
        class="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" 
        onClick={props.onClose} 
      />
      
      {/* Slide-in Menu */}
      <div class="lg:hidden fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold">Translation Strings</h2>
          <button
            onClick={props.onClose}
            class="p-2 hover:bg-gray-100 active:bg-gray-200 rounded transition"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List Content */}
        <div class="flex-1 overflow-hidden">
          <TranslationList
            translationStrings={props.translationStrings}
            selectedKey={props.selectedKey}
            language={props.language}
            searchQuery={props.searchQuery}
            filterStatus={props.filterStatus}
            sortMethod={props.sortMethod}
            onSearchChange={props.onSearchChange}
            onFilterChange={props.onFilterChange}
            onSortMethodChange={props.onSortMethodChange}
            isLoading={props.isLoading}
            onSelectKey={handleSelectKey}
          />
        </div>
      </div>
    </Show>
  );
}
