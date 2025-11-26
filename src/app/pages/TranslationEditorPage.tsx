import { createSignal, onMount, createEffect } from 'solid-js';
import { useParams, useNavigate, useSearchParams } from '@solidjs/router';
import { user } from '../auth';
import {
  TranslationEditorHeader,
  TranslationEditorPanel,
  TranslationList,
} from '../components';
import { MobileMenuOverlay } from '../components';
import {
  fetchFileFromGitHub,
  fetchWebTranslations,
  mergeTranslationsWithSource,
  submitTranslation,
  fetchSuggestions,
  approveSuggestion,
  rejectSuggestion,
  type MergedTranslation,
  type WebTranslation,
} from '../utils/translationApi';
import { authFetch } from '../utils/authFetch';

interface Project {
  id: string;
  name: string;
  repository: string;
  sourceLanguage: string;
}

export type SortMethod = 'priority' | 'alphabetical' | 'completion';

export default function TranslationEditorPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const projectName = () => params.projectName || '';
  const language = () => params.language || 'en';
  const filename = () => params.filename ? decodeURIComponent(params.filename) : 'common.json';

  const displayFilename = () => {
    const fname = filename();
    const lang = language();
    return fname.replace(new RegExp(lang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '{lang}');
  };

  const [project, setProject] = createSignal<Project | null>(null);
  const [translations, setTranslations] = createSignal<MergedTranslation[]>([]);
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [translationValue, setTranslationValue] = createSignal('');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'valid' | 'invalid'>('all');

  const sortFromUrl = Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort;
  const [sortMethod, setSortMethod] = createSignal<SortMethod>(
    (sortFromUrl && ['priority', 'alphabetical', 'completion'].includes(sortFromUrl) ? sortFromUrl : 'priority') as SortMethod
  );

  const [showSuggestions, setShowSuggestions] = createSignal(true);
  const [suggestions, setSuggestions] = createSignal<WebTranslation[]>([]);
  const [showMobileMenu, setShowMobileMenu] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSaving, setIsSaving] = createSignal(false);

  async function loadProject() {
    try {
      const response = await authFetch('/api/projects', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch projects');

      const data = await response.json() as { projects: any[] };
      const proj = data.projects.find((p: any) => p.name === projectName());

      if (proj) {
        setProject(proj);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  }

  async function loadTranslations() {
    const proj = project();
    if (!proj) return;

    setIsLoading(true);
    try {
      const sourceLang = proj.sourceLanguage;
      const targetLang = language();
      const targetFilename = filename();

      const sourceFilename = targetFilename.replace(
        new RegExp(targetLang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        sourceLang
      );

      const [sourceR2Data, targetR2Data, webTrans] = await Promise.all([
        fetchFileFromGitHub(proj.name, sourceLang, sourceFilename),
        fetchFileFromGitHub(proj.name, targetLang, targetFilename),
        fetchWebTranslations(proj.name, targetLang, targetFilename)
      ]);

      if (sourceR2Data === null) {
        console.debug('[Translations] Source file unchanged — skipping update');
        return;
      }

      const merged = mergeTranslationsWithSource(sourceR2Data, targetR2Data, webTrans);
      setTranslations(merged);

      const keyFromUrl = Array.isArray(searchParams.key) ? searchParams.key[0] : searchParams.key;
      if (keyFromUrl && merged.find(t => t.key === keyFromUrl)) {
        handleSelectKey(keyFromUrl);
      } else if (merged.length > 0 && !selectedKey()) {
        handleSelectKey(merged[0].key);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSuggestions(force = false) {
    const proj = project();
    const key = selectedKey();
    if (!proj || !key) return;

    try {
      const suggs = await fetchSuggestions(proj.name, language(), filename(), key, force);
      setSuggestions(suggs);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  }

  onMount(() => {
    if (!user()) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login');
      return;
    }

    loadProject();
  });

  createEffect(() => {
    if (project()) {
      loadTranslations();
    }
  });

  createEffect(() => {
    if (selectedKey()) {
      loadSuggestions();
    }
  });

  const filteredTranslations = () => {
    const query = searchQuery().toLowerCase();
    const status = filterStatus();

    const filtered = translations().filter(t => {
      const matchesSearch = !query ||
        t.key.toLowerCase().includes(query) ||
        t.sourceValue.toLowerCase().includes(query) ||
        t.currentValue.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (status === 'valid') return t.isValid;
      if (status === 'invalid') return !t.isValid;
      return true;
    });

    const method = sortMethod();
    return filtered.sort((a, b) => {
      if (method === 'priority') {
        const aEmpty = !a.currentValue || a.currentValue === '';
        const bEmpty = !b.currentValue || b.currentValue === '';
        const aOutdated = !a.isValid;
        const bOutdated = !b.isValid;

        if (aEmpty && !bEmpty) return -1;
        if (!aEmpty && bEmpty) return 1;
        if (aOutdated && !bOutdated) return -1;
        if (!aOutdated && bOutdated) return 1;

        return a.key.localeCompare(b.key);
      } else if (method === 'alphabetical') {
        return a.key.localeCompare(b.key);
      } else if (method === 'completion') {
        const aComplete = a.currentValue !== '' && a.isValid;
        const bComplete = b.currentValue !== '' && b.isValid;

        if (!aComplete && bComplete) return -1;
        if (aComplete && !bComplete) return 1;

        return a.key.localeCompare(b.key);
      }

      return a.key.localeCompare(b.key);
    });
  };

  const handleSelectKey = (key: string) => {
    setSelectedKey(key);
    setSearchParams({ key, sort: sortMethod() });

    const translation = translations().find(t => t.key === key);
    if (translation) {
      setTranslationValue(translation.currentValue);
    }
  };

  const handleSortMethodChange = (method: SortMethod) => {
    setSortMethod(method);
    setSearchParams({ key: selectedKey() || undefined, sort: method });
  };

  const handleSave = async () => {
    const proj = project();
    const key = selectedKey();
    if (!proj || !key) return;

    setIsSaving(true);
    try {
      await submitTranslation(proj.name, language(), filename(), key, translationValue());
      await loadTranslations();
      await loadSuggestions(true);
      alert('Translation saved successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save translation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveSuggestion = async (id: string) => {
    try {
      await approveSuggestion(id);
      await loadTranslations();
      await loadSuggestions(true);
      alert('Suggestion approved!');
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve suggestion');
    }
  };

  const handleRejectSuggestion = async (id: string) => {
    if (!confirm('Are you sure you want to reject this suggestion?')) return;

    try {
      await rejectSuggestion(id);
      await loadSuggestions(true);
      alert('Suggestion rejected!');
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('Failed to reject suggestion');
    }
  };

  const handlePrevious = () => {
    const filtered = filteredTranslations();
    const currentIndex = filtered.findIndex(t => t.key === selectedKey());
    if (currentIndex > 0) {
      handleSelectKey(filtered[currentIndex - 1].key);
    }
  };

  const handleNext = () => {
    const filtered = filteredTranslations();
    const currentIndex = filtered.findIndex(t => t.key === selectedKey());
    if (currentIndex >= 0 && currentIndex < filtered.length - 1) {
      handleSelectKey(filtered[currentIndex + 1].key);
    }
  };

  const getCurrentIndex = () => {
    const index = filteredTranslations().findIndex(t => t.key === selectedKey());
    return index >= 0 ? index + 1 : 0;
  };

  const getCompletionPercentage = () => {
    const total = translations().length;
    const proj = project();

    if (!proj || total === 0) return 0;
    if (language() === proj.sourceLanguage) return 0;

    const completed = translations().filter(t => t.currentValue !== '' && t.isValid).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <div class="page animate-fade-in">
      <TranslationEditorHeader
        projectId={projectName()}
        language={language()}
        filename={displayFilename()}
        completionPercentage={getCompletionPercentage()}
        onMenuToggle={() => setShowMobileMenu(!showMobileMenu())}
        showMobileMenu={showMobileMenu()}
      />

      <MobileMenuOverlay
        show={showMobileMenu()}
        translationStrings={filteredTranslations()}
        selectedKey={selectedKey()}
        language={language()}
        isLoading={isLoading()}
        searchQuery={searchQuery()}
        filterStatus={filterStatus()}
        sortMethod={sortMethod()}
        onClose={() => setShowMobileMenu(false)}
        onSelectKey={handleSelectKey}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilterStatus}
        onSortMethodChange={handleSortMethodChange}
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
              selectedKey={selectedKey()}
              translations={translations()}
              language={language()}
              sourceLanguage={project()?.sourceLanguage || 'en'}
              translationValue={translationValue()}
              showSuggestions={showSuggestions()}
              suggestions={suggestions()}
              currentIndex={getCurrentIndex()}
              totalCount={filteredTranslations().length}
              isSaving={isSaving()}
              isLoading={isLoading()}
              onTranslationChange={setTranslationValue}
              onSave={handleSave}
              onToggleSuggestions={() => setShowSuggestions(!showSuggestions())}
              onApproveSuggestion={handleApproveSuggestion}
              onRejectSuggestion={handleRejectSuggestion}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />

            <div class="hidden lg:block">
              <TranslationList
                translationStrings={filteredTranslations()}
                selectedKey={selectedKey()}
                language={language()}
                isLoading={isLoading()}
                searchQuery={searchQuery()}
                filterStatus={filterStatus()}
                sortMethod={sortMethod()}
                onSelectKey={handleSelectKey}
                onSearchChange={setSearchQuery}
                onFilterChange={setFilterStatus}
                onSortMethodChange={handleSortMethodChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
