import { createSignal, createResource, onMount, onCleanup } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { user } from '../auth';
import TranslationEditorHeader from '../components/TranslationEditorHeader';
import TranslationEditorPanel from '../components/TranslationEditorPanel';
import TranslationList from '../components/TranslationList';
import MobileMenuOverlay from '../components/MobileMenuOverlay';

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
}

async function fetchProjectTranslations(projectId: string, language: string) {
  const response = await fetch(
    `/api/translations?projectId=${encodeURIComponent(projectId)}&language=${language}&status=pending`,
    { credentials: 'include' }
  );
  if (!response.ok) throw new Error('Failed to fetch translations');
  return response.json();
}

async function submitTranslation(projectId: string, language: string, key: string, value: string) {
  const response = await fetch('/api/translations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ projectId, language, key, value }),
  });
  if (!response.ok) throw new Error('Failed to submit translation');
  return response.json();
}

async function fetchHistory(projectId: string, language: string, key: string) {
  const params = new URLSearchParams({ projectId, language, key });
  const response = await fetch(`/api/translations/history?${params}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

export default function TranslationEditorPage() {
  const params = useParams();
  const navigate = useNavigate();
  
  const projectId = () => params.projectId || '';
  const language = () => params.language || 'en';

  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [translationValue, setTranslationValue] = createSignal('');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'pending' | 'approved' | 'committed'>('all');
  const [showHistory, setShowHistory] = createSignal(true); // Show history by default
  const [autoSaveTimer, setAutoSaveTimer] = createSignal<number | null>(null);
  const [showMobileMenu, setShowMobileMenu] = createSignal(false);

  const [translationStrings, setTranslationStrings] = createSignal<TranslationString[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = createSignal(true);
  const [isNavigating, setIsNavigating] = createSignal(false);

  // Load translation files from uploaded data
  const loadTranslationFiles = async () => {
    try {
      setIsLoadingFiles(true);
      
      const pid = projectId();
      
      const sourceUrl = `/api/projects/${pid}/files?lang=en`;
      const sourceRes = await fetch(sourceUrl, { credentials: 'include' });
      
      if (!sourceRes.ok) {
        const errorText = await sourceRes.text();
        console.error('Failed to load source files:', sourceRes.status, errorText);
        return;
      }
      
      const sourceData = await sourceRes.json() as { files: any[] };
      const sourceFiles = sourceData.files || [];
      
      const targetUrl = `/api/projects/${pid}/files?lang=${language()}`;
      const targetRes = await fetch(targetUrl, { credentials: 'include' });
      
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

  onMount(() => {
    if (!user()) {
      navigate('/login');
      return;
    }
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

  // Always fetch history when a key is selected
  const [history, { refetch: refetchHistory }] = createResource(
    () => {
      const key = selectedKey();
      return key ? { projectId: projectId(), language: language(), key } : null;
    },
    (params) => params ? fetchHistory(params.projectId, params.language, params.key) : null
  );

  const filteredStrings = () => {
    const query = searchQuery().toLowerCase();
    const status = filterStatus();
    
    return translationStrings().filter(str => {
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
    const str = translationStrings().find(s => s.key === key);
    if (str) {
      setTranslationValue(str.currentValue || '');
    }
    
    // Release navigation lock immediately so user can navigate
    setTimeout(() => setIsNavigating(false), 100);
    
    // Fetch history in the background to get the latest suggestion
    // This won't block navigation
    fetchHistory(projectId(), language(), key)
      .then((historyData: any) => {
        const historyEntries = historyData?.history || [];
        
        // Find the latest submitted or approved translation (not deleted/rejected)
        const latestSuggestion = historyEntries.find((entry: any) => 
          entry.action === 'submitted' || entry.action === 'approved'
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
        console.error('Failed to fetch history:', error);
        // Already have fallback value set, so no action needed
      });
    
    // Trigger history refetch for the panel
    refetchHistory();
  };

  const handleToggleHistory = () => {
    setShowHistory(!showHistory());
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
    const total = translationStrings().length;
    const completed = translationStrings().filter(s => s.currentValue).length;
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
            translationStrings={translationStrings()}
            language={language()}
            translationValue={translationValue()}
            showHistory={showHistory()}
            history={(history() as any)?.history}
            isLoadingHistory={history.loading}
            currentIndex={getCurrentIndex()}
            totalCount={filteredStrings().length}
            onTranslationChange={handleTranslationChange}
            onSave={handleSave}
            onToggleHistory={handleToggleHistory}
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
