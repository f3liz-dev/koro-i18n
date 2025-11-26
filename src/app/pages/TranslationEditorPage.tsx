import { createEffect } from 'solid-js';
import { useTranslationEditor } from '../hooks/useTranslationEditor';
import {
  TranslationEditorHeader,
  TranslationEditorPanel,
  TranslationList,
} from '../components';
import { MobileMenuOverlay } from '../components';
// no direct types needed in this file

export default function TranslationEditorPage() {
  const {
    projectName,
    language,
    filename,
    displayFilename,
    state,
    filteredTranslations,
    currentIndex,
    completionPercentage,
    // setters
    setSearchQuery,
    setFilterStatus,
    setSortMethod,
    setShowMobileMenu,
    setTranslationValue,
    setShowSuggestions,
    // handlers
    selectKey,
    changeSort,
    saveTranslation,
    approve,
    reject,
    previous,
    next,
  } = useTranslationEditor();
  // (setters already destructured above)

  // Hook handles all side-effects and data fetching

  return (
    <div class="page animate-fade-in">
      <TranslationEditorHeader
        projectName={projectName()}
        language={language()}
        filename={displayFilename()}
        completionPercentage={completionPercentage()}
        onMenuToggle={() => setShowMobileMenu(!state.showMobileMenu())}
        showMobileMenu={state.showMobileMenu()}
        isStreamingStore={state.isStreamingStore()}
      />

      <MobileMenuOverlay
        show={state.showMobileMenu()}
        translationStrings={filteredTranslations()}
        selectedKey={state.selectedKey()}
        language={language()}
        isLoading={state.isLoading()}
        searchQuery={state.searchQuery()}
        filterStatus={state.filterStatus()}
        sortMethod={state.sortMethod()}
        onClose={() => setShowMobileMenu(false)}
        onSelectKey={selectKey}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilterStatus}
        onSortMethodChange={changeSort}
      />

      <div class="container" style={{ 'padding-top': '1rem' }}>
        <div style={{
          display: 'grid',
          'grid-template-columns': '1fr',
          gap: '1rem'
        }}>
          <style>{`
            @media (min-width: 1024px) {
              .editor-grid {
                grid-template-columns: 400px 1fr !important;
              }
            }
          `}</style>
          <div class="editor-grid" style={{
            display: 'grid',
            'grid-template-columns': '1fr',
            gap: '1rem'
          }}>
            <TranslationEditorPanel
              selectedKey={state.selectedKey()}
              translations={state.translations()}
              language={language()}
              sourceLanguage={state.project()?.sourceLanguage || 'en'}
              translationValue={state.translationValue()}
              showSuggestions={state.showSuggestions()}
              suggestions={state.suggestions()}
              currentIndex={currentIndex()}
              totalCount={filteredTranslations().length}
              isSaving={state.isSaving()}
              isLoading={state.isLoading()}
              onTranslationChange={setTranslationValue}
              onSave={saveTranslation}
              onToggleSuggestions={() => setShowSuggestions(!state.showSuggestions())}
              onApproveSuggestion={approve}
              onRejectSuggestion={reject}
              onPrevious={previous}
              onNext={next}
            />

            <div class="hidden lg:block">
              <TranslationList
                translationStrings={filteredTranslations()}
                selectedKey={state.selectedKey()}
                language={language()}
                isLoading={state.isLoading()}
                searchQuery={state.searchQuery()}
                filterStatus={state.filterStatus()}
                sortMethod={state.sortMethod()}
                onSelectKey={selectKey}
                onSearchChange={setSearchQuery}
                onFilterChange={setFilterStatus}
                onSortMethodChange={changeSort}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
