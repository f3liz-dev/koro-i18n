import { createSignal, onMount, createEffect, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { user } from '../auth';
import TranslationEditorHeader from '../components/TranslationEditorHeader';
import TranslationEditorPanel from '../components/TranslationEditorPanel';
import TranslationList from '../components/TranslationList';
import MobileMenuOverlay from '../components/MobileMenuOverlay';
import {
  fetchR2File,
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

export default function TranslationEditorPage() {
  const params = useParams();
  const navigate = useNavigate();
  
  const projectName = () => params.projectId || '';
  const language = () => params.language || 'en';
  const filename = () => params.filename ? decodeURIComponent(params.filename) : 'common.json';
  
  // Create display filename with {lang} placeholder
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
  const [showSuggestions, setShowSuggestions] = createSignal(true);
  const [suggestions, setSuggestions] = createSignal<WebTranslation[]>([]);
  const [showMobileMenu, setShowMobileMenu] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSaving, setIsSaving] = createSignal(false);

  // Fetch project info
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

  // Load translations from R2 + D1
  async function loadTranslations() {
    const proj = project();
    if (!proj) return;

    setIsLoading(true);
    try {
      // Determine source and target filenames
      const sourceLang = proj.sourceLanguage;
      const targetLang = language();
      const targetFilename = filename();
      
      // For language-specific filenames, compute the source filename
      const sourceFilename = targetFilename.replace(
        new RegExp(targetLang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        sourceLang
      );
      
      // Fetch source file from R2 (for sourceValue)
      const sourceR2Data = await fetchR2File(proj.name, sourceLang, sourceFilename);
      
      // Fetch target file from R2 (for existing translations)
      const targetR2Data = await fetchR2File(proj.name, targetLang, targetFilename);
      
      // Fetch from D1 (web translations - overrides)
      const webTrans = await fetchWebTranslations(proj.id, targetLang, targetFilename);
      
      // Merge: use source for sourceValue, target for currentValue, web for overrides
      const merged = mergeTranslationsWithSource(sourceR2Data, targetR2Data, webTrans);
      setTranslations(merged);

      // Auto-select first key
      if (merged.length > 0 && !selectedKey()) {
        handleSelectKey(merged[0].key);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Load suggestions for selected key
  async function loadSuggestions() {
    const proj = project();
    const key = selectedKey();
    if (!proj || !key) return;

    try {
      const suggs = await fetchSuggestions(proj.id, language(), filename(), key);
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

  // Load translations when project is ready
  createEffect(() => {
    if (project()) {
      loadTranslations();
    }
  });

  // Load suggestions when key changes
  createEffect(() => {
    if (selectedKey()) {
      loadSuggestions();
    }
  });

  const filteredTranslations = () => {
    const query = searchQuery().toLowerCase();
    const status = filterStatus();
    
    return translations().filter(t => {
      const matchesSearch = !query || 
        t.key.toLowerCase().includes(query) ||
        t.sourceValue.toLowerCase().includes(query) ||
        t.currentValue.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
      
      if (status === 'valid') return t.isValid;
      if (status === 'invalid') return !t.isValid;
      return true;
    });
  };

  const handleSelectKey = (key: string) => {
    setSelectedKey(key);
    
    const translation = translations().find(t => t.key === key);
    if (translation) {
      setTranslationValue(translation.currentValue);
    }
  };

  const handleSave = async () => {
    const proj = project();
    const key = selectedKey();
    if (!proj || !key) return;

    setIsSaving(true);
    try {
      await submitTranslation(
        proj.id,
        language(),
        filename(),
        key,
        translationValue()
      );

      // Reload translations
      await loadTranslations();
      await loadSuggestions();

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
      await loadSuggestions();
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
      await loadSuggestions();
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
    
    // For source language files, nothing is "translated" (they are the source)
    if (language() === proj.sourceLanguage) {
      return 0;
    }
    
    // For target language files:
    // A key is "translated" if it has a value different from the source
    // (This works because R2 files already have translations, and web translations override them)
    const completed = translations().filter(t => {
      // If currentValue is different from sourceValue, it's translated
      return t.currentValue !== t.sourceValue;
    }).length;
    
    return Math.round((completed / total) * 100);
  };

  return (
    <div class="min-h-screen bg-gray-50">
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
        onClose={() => setShowMobileMenu(false)}
        onSelectKey={handleSelectKey}
      />

      <div class="max-w-7xl mx-auto px-4 h-[calc(100vh-80px)] lg:h-auto lg:py-6">
        <div class="flex flex-col lg:grid lg:grid-cols-[400px_1fr] gap-3 lg:gap-6 h-full lg:h-auto">
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
            onTranslationChange={setTranslationValue}
            onSave={handleSave}
            onToggleSuggestions={() => setShowSuggestions(!showSuggestions())}
            onApproveSuggestion={handleApproveSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />

          <div class="hidden lg:block order-2 lg:order-1">
            <TranslationList
              translationStrings={filteredTranslations()}
              selectedKey={selectedKey()}
              language={language()}
              isLoading={isLoading()}
              searchQuery={searchQuery()}
              filterStatus={filterStatus()}
              onSelectKey={handleSelectKey}
              onSearchChange={setSearchQuery}
              onFilterChange={setFilterStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
