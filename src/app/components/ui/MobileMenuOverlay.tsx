import { Show } from 'solid-js';
import { TranslationList } from '../translation';
import type { UiMergedTranslation as MergedTranslation } from '../../utils/translationApi';
import type { SortMethod } from '../../hooks/useTranslationEditor';

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
    props.onClose();
  };

  return (
    <Show when={props.show}>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: '0',
          background: 'rgba(0,0,0,0.3)',
          'z-index': '40'
        }}
        onClick={props.onClose}
      />

      {/* Slide-in Menu */}
      <div class="panel animate-slide-down" style={{
        position: 'fixed',
        top: '0',
        left: '0',
        bottom: '0',
        width: '90%',
        'max-width': '20rem',
        'z-index': '50',
        display: 'flex',
        'flex-direction': 'column',
        'border-radius': '0'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          padding: '1rem',
          'border-bottom': '1px solid var(--border)'
        }}>
          <h2 style={{ 'font-size': '1.125rem', 'font-weight': '600' }}>Translation Keys</h2>
          <button onClick={props.onClose} class="btn ghost" style={{ padding: '0.5rem' }} aria-label="Close">
            ✕
          </button>
        </div>

        {/* List Content */}
        <div style={{ flex: '1', overflow: 'hidden' }}>
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
