import { Show } from 'solid-js';
import { TranslationList } from '../translation';
import type { MergedTranslation } from '../../utils/translationApi';
import type { SortMethod } from '../../pages/TranslationEditorPage';

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

export function MobileMenuOverlay(props: MobileMenuOverlayProps) {
  const handleSelectKey = (key: string) => {
    props.onSelectKey(key);
    props.onClose(); // Close menu after selection on mobile
  };

  return (
    <Show when={props.show}>
      {/* Backdrop */}
      <div
        class="lg:hidden fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={props.onClose}
      />

      {/* Slide-in Menu */}
  <div class="lg:hidden fixed top-0 left-0 bottom-0 w-[95%] max-w-sm z-50 flex flex-col kawaii-panel" style="backdrop-filter: blur(4px);">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-transparent">
          <h2 class="text-lg font-semibold">翻訳文字列</h2>
          <button
            onClick={props.onClose}
            class="kawaii-ghost p-2 rounded transition"
            aria-label="閉じる"
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
