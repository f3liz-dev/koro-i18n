import { createSignal, createResource, onMount, onCleanup } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { user } from '../auth';
import TranslationEditorHeader from '../components/TranslationEditorHeader';
import TranslationEditorPanel from '../components/TranslationEditorPanel';
import TranslationList from '../components/TranslationList';
import MobileMenuOverlay from '../components/MobileMenuOverlay';
import { cachedFetch, mutate } from '../utils/cache';

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
  const response = await cachedFetch(
    `/api/translations?projectId=${encodeURIComponent(projectId)}&language=${language}&status=pending`,
    { credentials: 'include', cacheTTL: 60000 } // 1 minute cache
  );
  if (!response.ok) throw new Error('Failed to fetch translations');
  return response.json();
}

async function submitTranslation(projectId: string, language: string, key: string, value: string) {
  const response = await mutate('/api/translations', {
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
  const response = await cachedFetch(`/api/translations/suggestions?${params}`, {
    credentials: 'include',
    cacheTTL: 60000, // 1 minute cache
  });
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  return response.json();
}

async function approveSuggestion(id: string) {
  const response = await mutate(`/api/translations/${id}/approve`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to approve suggestion');
  return response.json();
}

async function rejectSuggestion(id: string) {
  const response = await mutate(`/api/translations/${id}`, {
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

  const [project, setProject] = createSignal<Project | null>(null);
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [translationValue, setTranslationValue] = createSignal('');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'pending' | 'approved' | 'committed'>('all');
  const [showSuggestions, setShowSuggestions] = createSignal(true); // Show suggestions by default
  const [autoSaveTimer, setAutoSaveTimer] = createSignal<number | null>(null);
  const [showMobileMenu, setShowMobileMenu] = createSignal(false);

  const [translationStrings, setTranslationStrings] = createSignal<TranslationString[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = createSignal(true);
  const [isNavigating, setIsNavigating] = createSignal(false);
  const [suggestionRefetchToken, setSuggestionRefetchToken] = createSignal(0);

  // Load project to get source language
  const loadProject = async () => {
    try {
      const res = await cachedFetch('/api/projects', { 
        credentials: 'include',
        cacheTTL: 300000, // 5 minutes cache
      });
      if (res.ok) {
        const data = await res.json() as { projects: Project[] };
        const proj = data.projects.find((p: any) => p.name === projectId());
        if (proj) {
          setProject(proj);
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  // Load translation files from uploaded data
  const loadTranslationFiles = async () => {
    try {
      setIsLoadingFiles(true);
      
      const pid = projectId();
      const sourceLanguage = project()?.sourceLanguage || 'en';
      const targetFilename = filename();
      
      // Build URLs with filters for optimized data fetching
      let sourceUrl = `/api/projects/${pid}/files?lang=${sourceLanguage}`;
      let targetUrl = `/api/projects/${pid}/files?lang=${language()}`;
      
      // Add filename filter if specified to reduce payload size
      if (targetFilename) {
        sourceUrl += `&filename=${encodeURIComponent(targetFilename)}`;
        targetUrl += `&filename=${encodeURIComponent(targetFilename)}`;
      }
      
      const sourceRes = await cachedFetch(sourceUrl, { 
        credentials: 'include',
        cacheTTL: 600000, // 10 minutes cache
      });
      
      if (!sourceRes.ok) {
        const errorText = await sourceRes.text();
        console.error('Failed to load source files:', sourceRes.status, errorText);
        return;
      }
      
      const sourceData = await sourceRes.json() as { files: any[] };
      const sourceFiles = sourceData.files || [];
      
      const targetRes = await cachedFetch(targetUrl, { 
        credentials: 'include',
        cacheTTL: 600000, // 10 minutes cache
      });
      
      const targetData = targetRes.ok ? (await targetRes.json() as { files: any[] }) : { files: [] };
      const targetFiles = targetData.files || [];
      
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
      
      setTranslationStrings(strings);
      
      // Auto-select the first key if available
      if (strings.length > 0 && !selectedKey()) {
        handleSelectKey(strings[0].key);
      }
    } catch (error) {
      console.error('Failed to load translation files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  onMount(async () => {
    if (!user()) {
      navigate('/login');
      return;
    }
    
    // Load project first to get source language
    await loadProject();
    
    // Then load translation files
    loadTranslationFiles();

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

  const [translations] = createResource(
    () => ({ projectId: projectId(), language: language() }),
    (params) => fetchProjectTranslations(params.projectId, params.language)
  );

  // Fetch all suggestions for the project/language to enrich translation strings
  const [allSuggestions, { refetch: refetchAllSuggestions }] = createResource(
    () => ({ projectId: projectId(), language: language(), token: suggestionRefetchToken() }),
    (params) => fetchSuggestions(params.projectId, params.language)
  );

  // Enrich translation strings with suggestion status
  const enrichedTranslationStrings = () => {
    const strings = translationStrings();
    const suggestionsData = (allSuggestions() as any)?.suggestions || [];
    
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

  // Always fetch suggestions when a key is selected
  const [suggestions, { refetch: refetchSuggestions }] = createResource(
    () => {
      const key = selectedKey();
      return key ? { projectId: projectId(), language: language(), key, token: suggestionRefetchToken() } : null;
    },
    (params) => params ? fetchSuggestions(params.projectId, params.language, params.key) : null
  );

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
    
    // Immediately set the current file value as a fallback
    const str = enrichedTranslationStrings().find(s => s.key === key);
    if (str) {
      setTranslationValue(str.currentValue || '');
    }
    
    // Release navigation lock immediately so user can navigate
    setTimeout(() => setIsNavigating(false), 100);
    
    // Fetch suggestions in the background to get the latest suggestion
    // This won't block navigation
    fetchSuggestions(projectId(), language(), key)
      .then((suggestionsData: any) => {
        const suggestionEntries = suggestionsData?.suggestions || [];
        
        // Find the latest approved or pending translation (not deleted/rejected)
        const latestSuggestion = suggestionEntries.find((entry: any) => 
          entry.status === 'approved' || entry.status === 'pending'
        );
        
        if (latestSuggestion) {
          // Update with the latest suggestion if found
          // Only update if we're still on the same key
          if (selectedKey() === key) {
            setTranslationValue(latestSuggestion.value);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to fetch suggestions:', error);
        // Already have fallback value set, so no action needed
      });
    
    // Trigger suggestions refetch for the panel
    refetchSuggestions();
  };

  const handleToggleSuggestions = () => {
    setShowSuggestions(!showSuggestions());
  };

  const handleApproveSuggestion = async (id: string) => {
    try {
      await approveSuggestion(id);
      // Increment token to force refetch
      setSuggestionRefetchToken(prev => prev + 1);
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
      // Increment token to force refetch
      setSuggestionRefetchToken(prev => prev + 1);
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
      
      // Increment token to force refetch of suggestions
      setSuggestionRefetchToken(prev => prev + 1);
      
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
            suggestions={(suggestions() as any)?.suggestions}
            isLoadingSuggestions={suggestions.loading}
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
