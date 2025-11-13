import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { user } from '../auth';
import TranslationEditorHeader from '../components/TranslationEditorHeader';
import TranslationEditorPanel from '../components/TranslationEditorPanel';
import TranslationList from '../components/TranslationList';
import MobileMenuOverlay from '../components/MobileMenuOverlay';
import { projectsCache, filesCache, suggestionsCache } from '../utils/dataStore';
import { authFetch } from '../utils/authFetch';

interface Translation {
  id: string;
  key: string;
  value: string;
  sourceValue: string;
  status: 'pending' | 'approved' | 'committed' | 'rejected' | 'deleted';
  userId: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

interface TranslationString {
  key: string;
  sourceValue: string;
  currentValue?: string;
  translations: Translation[];
  suggestionStatus?: 'none' | 'pending' | 'approved';
}

interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
  sourceLanguage: string;
}

async function fetchProjectTranslations(projectId: string, language: string) {
  const response = await authFetch(
    `/api/translations?projectId=${encodeURIComponent(projectId)}&language=${language}&status=pending`,
    { credentials: 'include' }
  );
  if (!response.ok) throw new Error('Failed to fetch translations');
  return response.json();
}

async function submitTranslation(projectId: string, language: string, key: string, value: string) {
  const response = await authFetch('/api/translations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ projectId, language, key, value }),
  });
  if (!response.ok) throw new Error('Failed to submit translation');
  return response.json();
}

async function fetchSuggestions(projectId: string, language: string, key?: string) {
  const params = new URLSearchParams({ projectId, language });
  if (key) params.append('key', key);
  const response = await authFetch(`/api/translations/suggestions?${params}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  return response.json();
}

async function approveSuggestion(id: string) {
  const response = await authFetch(`/api/translations/${id}/approve`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to approve suggestion');
  return response.json();
}

async function rejectSuggestion(id: string) {
  const response = await authFetch(`/api/translations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to reject suggestion');
  return response.json();
}

export default function TranslationEditorPage() {
  const params = useParams();
  const navigate = useNavigate();
  
  const projectId = () => params.projectId || '';
  const language = () => params.language || 'en';
  const filename = () => params.filename ? decodeURIComponent(params.filename) : null;

  // Access stores directly - returns cached data immediately
  const projectsStore = projectsCache.get();
  const project = () => projectsStore.projects.find((p: any) => p.name === projectId()) || null;
  
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [translationValue, setTranslationValue] = createSignal('');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'pending' | 'approved' | 'committed'>('all');
  const [showSuggestions, setShowSuggestions] = createSignal(true); // Show suggestions by default
  const [autoSaveTimer, setAutoSaveTimer] = createSignal<number | null>(null);
  const [showMobileMenu, setShowMobileMenu] = createSignal(false);

  const [translationStrings, setTranslationStrings] = createSignal<TranslationString[]>([]);
  const [isNavigating, setIsNavigating] = createSignal(false);
  const [suggestionRefetchToken, setSuggestionRefetchToken] = createSignal(0);

  // Get files from store - returns cached data immediately
  const sourceLanguage = () => project()?.sourceLanguage || 'en';
  const targetFilename = () => filename();
  
  const sourceFilesStore = () => filesCache.get(projectId(), sourceLanguage());
  const targetFilesStore = () => filesCache.get(projectId(), language());
  
  // Compute translation strings from store data
  const computeTranslationStrings = () => {
    const sourceFiles = sourceFilesStore()?.files || [];
    const targetFiles = targetFilesStore()?.files || [];
    
    if (sourceFiles.length === 0) return [];
    
    const strings: TranslationString[] = [];
    
    for (const sourceFile of sourceFiles) {
      const targetFile = targetFiles.find((f: any) => f.filename === sourceFile.filename);
      const sourceContents = sourceFile.contents || {};
      const targetContents = targetFile?.contents || {};
      
      for (const [key, sourceValue] of Object.entries(sourceContents)) {
        strings.push({
          key: `${sourceFile.filename}:${key}`,
          sourceValue: String(sourceValue),
          currentValue: targetContents[key] ? String(targetContents[key]) : '',
          translations: []
        });
      }
    }
    
    return strings;
  };
  
  // Update translationStrings when store data changes
  createEffect(() => {
    const strings = computeTranslationStrings();
    if (strings.length > 0) {
      setTranslationStrings(strings);
      
      // Auto-select the first key if available and no key is selected
      if (!selectedKey()) {
        handleSelectKey(strings[0].key);
      }
    }
  });
  
  // Show loading only if we don't have cached data
  const isLoadingFiles = () => !sourceFilesStore()?.lastFetch || !targetFilesStore()?.lastFetch;

  onMount(() => {
    if (!user()) {
      // Save the current URL to sessionStorage before redirecting to login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      navigate('/login');
      return;
    }
    
    // Fetch data in background - will update stores when data arrives
    projectsCache.fetch();
    
    const pid = projectId();
    const lang = language();
    const srcLang = sourceLanguage();
    const targetFilename = filename();
    
    if (pid && lang) {
      // Fetch files
      filesCache.fetch(pid, srcLang, targetFilename || undefined);
      filesCache.fetch(pid, lang, targetFilename || undefined);
      
      // Fetch suggestions for all keys
      suggestionsCache.fetch(pid, lang);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  // Get suggestions from store
  const allSuggestionsStore = () => suggestionsCache.get(projectId(), language());
  const allSuggestions = () => allSuggestionsStore()?.suggestions || [];

  // Enrich translation strings with suggestion status
  const enrichedTranslationStrings = () => {
    const strings = translationStrings();
    const suggestionsData = allSuggestions();
    
    // Create a map of key -> suggestion status
    const suggestionMap = new Map<string, 'pending' | 'approved'>();
    suggestionsData.forEach((s: any) => {
      if (s.status === 'approved') {
        suggestionMap.set(s.key, 'approved');
      } else if (s.status === 'pending' && !suggestionMap.has(s.key)) {
        suggestionMap.set(s.key, 'pending');
      }
    });
    
    // Enrich strings with suggestion status
    return strings.map(str => ({
      ...str,
      suggestionStatus: suggestionMap.get(str.key) || 'none' as 'none' | 'pending' | 'approved'
    }));
  };

  // Get suggestions for selected key from store
  const keySuggestionsStore = () => suggestionsCache.get(projectId(), language(), selectedKey() || undefined);
  const suggestions = () => keySuggestionsStore()?.suggestions || [];
  const isLoadingKeySuggestions = () => !keySuggestionsStore()?.lastFetch;

  // Watch for selected key changes to fetch suggestions
  createEffect(() => {
    const key = selectedKey();
    if (key) {
      suggestionsCache.fetch(projectId(), language(), key);
    }
  });

  const filteredStrings = () => {
    const query = searchQuery().toLowerCase();
    const status = filterStatus();
    
    return enrichedTranslationStrings().filter(str => {
      const matchesSearch = !query || 
        str.key.toLowerCase().includes(query) ||
        str.sourceValue.toLowerCase().includes(query) ||
        (str.currentValue && str.currentValue.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
      
      if (status === 'all') return true;
      
      const hasStatus = str.translations.some(t => t.status === status);
      return hasStatus;
    });
  };

  const handleSelectKey = (key: string) => {
    // Prevent rapid successive calls
    if (isNavigating()) return;
    
    setIsNavigating(true);
    setSelectedKey(key);
    
    // Immediately set the current file value or latest suggestion from cache
    const str = enrichedTranslationStrings().find(s => s.key === key);
    if (str) {
      // Check if we have suggestions in cache
      const cachedSuggestions = suggestionsCache.get(projectId(), language(), key);
      const suggestionEntries = cachedSuggestions?.suggestions || [];
      
      // Find the latest approved or pending translation (not deleted/rejected)
      const latestSuggestion = suggestionEntries.find((entry: any) => 
        entry.status === 'approved' || entry.status === 'pending'
      );
      
      // Use suggestion if available, otherwise use current value
      setTranslationValue(latestSuggestion?.value || str.currentValue || '');
    }
    
    // Release navigation lock immediately so user can navigate
    setTimeout(() => setIsNavigating(false), 100);
    
    // Fetch suggestions in background to update cache (already handled by createEffect)
  };

  const handleToggleSuggestions = () => {
    setShowSuggestions(!showSuggestions());
  };

  const handleApproveSuggestion = async (id: string) => {
    try {
      await approveSuggestion(id);
      // Refetch suggestions to update cache
      suggestionsCache.fetch(projectId(), language());
      suggestionsCache.fetch(projectId(), language(), selectedKey() || undefined);
      alert('Suggestion approved successfully!');
    } catch (error) {
      console.error('Failed to approve suggestion:', error);
      alert('Failed to approve suggestion');
    }
  };

  const handleRejectSuggestion = async (id: string) => {
    if (!confirm('Are you sure you want to reject this suggestion?')) {
      return;
    }

    try {
      await rejectSuggestion(id);
      // Refetch suggestions to update cache
      suggestionsCache.fetch(projectId(), language());
      suggestionsCache.fetch(projectId(), language(), selectedKey() || undefined);
      alert('Suggestion rejected successfully!');
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      alert('Failed to reject suggestion');
    }
  };

  const handleSave = async () => {
    const key = selectedKey();
    if (!key) return;

    try {
      await submitTranslation(projectId(), language(), key, translationValue());
      
      setTranslationStrings(prev => prev.map(str => 
        str.key === key 
          ? { ...str, currentValue: translationValue() }
          : str
      ));
      
      // Refetch suggestions to update cache
      suggestionsCache.fetch(projectId(), language());
      suggestionsCache.fetch(projectId(), language(), selectedKey() || undefined);
      
      alert('Translation saved! It will be reviewed and committed.');
    } catch (error) {
      console.error('Failed to save translation:', error);
      alert('Failed to save translation');
    }
  };

  const handleAutoSave = () => {
    const timer = autoSaveTimer();
    if (timer) clearTimeout(timer);
    
    const newTimer = window.setTimeout(() => {
      handleSave();
    }, 30000);
    
    setAutoSaveTimer(newTimer);
  };

  const getCompletionPercentage = () => {
    const total = enrichedTranslationStrings().length;
    const completed = enrichedTranslationStrings().filter(s => s.currentValue).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const handlePrevious = () => {
    if (isNavigating()) return; // Prevent double-clicks
    
    // Capture the filtered list once to avoid reactivity issues
    const filtered = filteredStrings();
    const currentIndex = filtered.findIndex(s => s.key === selectedKey());
    if (currentIndex > 0) {
      const nextKey = filtered[currentIndex - 1].key;
      handleSelectKey(nextKey);
    }
  };

  const handleNext = () => {
    if (isNavigating()) return; // Prevent double-clicks
    
    // Capture the filtered list once to avoid reactivity issues
    const filtered = filteredStrings();
    const currentIndex = filtered.findIndex(s => s.key === selectedKey());
    if (currentIndex >= 0 && currentIndex < filtered.length - 1) {
      const nextKey = filtered[currentIndex + 1].key;
      handleSelectKey(nextKey);
    }
  };

  const getCurrentIndex = () => {
    const index = filteredStrings().findIndex(s => s.key === selectedKey());
    return index >= 0 ? index + 1 : 0;
  };

  const handleTranslationChange = (value: string) => {
    setTranslationValue(value);
    handleAutoSave();
  };

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <TranslationEditorHeader
        projectId={projectId()}
        language={language()}
        completionPercentage={getCompletionPercentage()}
        onMenuToggle={() => setShowMobileMenu(!showMobileMenu())}
        showMobileMenu={showMobileMenu()}
      />

      {/* Mobile Menu Overlay */}
      <MobileMenuOverlay
        show={showMobileMenu()}
        translationStrings={filteredStrings()}
        selectedKey={selectedKey()}
        language={language()}
        isLoading={isLoadingFiles()}
        onClose={() => setShowMobileMenu(false)}
        onSelectKey={handleSelectKey}
      />

      <div class="max-w-7xl mx-auto px-4 h-[calc(100vh-80px)] lg:h-auto lg:py-6">
        <div class="flex flex-col lg:grid lg:grid-cols-[400px_1fr] gap-3 lg:gap-6 h-full lg:h-auto">
          {/* Editor Panel - First on Mobile, Right on PC */}
          <TranslationEditorPanel
            selectedKey={selectedKey()}
            translationStrings={enrichedTranslationStrings()}
            language={language()}
            translationValue={translationValue()}
            showSuggestions={showSuggestions()}
            suggestions={suggestions()}
            isLoadingSuggestions={isLoadingKeySuggestions()}
            currentIndex={getCurrentIndex()}
            totalCount={filteredStrings().length}
            onTranslationChange={handleTranslationChange}
            onSave={handleSave}
            onToggleSuggestions={handleToggleSuggestions}
            onApproveSuggestion={handleApproveSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />

          {/* Translation List - Hidden on Mobile (in hamburger menu), Left on PC */}
          <div class="hidden lg:block order-2 lg:order-1">
            <TranslationList
              translationStrings={filteredStrings()}
              selectedKey={selectedKey()}
              language={language()}
              isLoading={isLoadingFiles()}
              onSelectKey={handleSelectKey}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
