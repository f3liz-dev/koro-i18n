import { createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { useParams, useNavigate, useSearchParams } from '@solidjs/router';
import { user } from '../auth';
import {
  fetchFileFromGitHub,
  fetchWebTranslations,
  mergeTranslationsWithSource,
  submitTranslation,
  fetchSuggestions,
  approveSuggestion,
  rejectSuggestion,
  streamStore,
  type UiMergedTranslation as MergedTranslation,
} from '../utils/translationApi';
import { authFetch } from '../utils/authFetch';

export type SortMethod = 'priority' | 'alphabetical' | 'completion';

export function useTranslationEditor() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const projectName = () => params.projectName || '';
  const language = () => params.language || 'en';
  const filename = () => params.filename ? decodeURIComponent(params.filename) : 'common.json';

  function displayFilename() {
    const fname = filename();
    const lang = language();
    return fname.replace(new RegExp(lang.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g'), '{lang}');
  }

  const [project, setProject] = createSignal(null as any);
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
  const [suggestions, setSuggestions] = createSignal<any[]>([]);
  const [showMobileMenu, setShowMobileMenu] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSaving, setIsSaving] = createSignal(false);
  const [isStreamingStore, setIsStreamingStore] = createSignal(false);

  let storeController: AbortController | null = null;

  async function loadProject() {
    try {
      setIsStreamingStore(true);
      const response = await authFetch('/api/projects', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch projects');

      const data = await response.json() as { projects: any[] };
      const proj = data.projects.find((p: any) => p.name === projectName());

      if (proj) setProject(proj);
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
        new RegExp(targetLang.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g'),
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
        selectKey(keyFromUrl);
      } else if (merged.length > 0 && !selectedKey()) {
        selectKey(merged[0].key);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function streamStoreAndApply() {
    const proj = project();
    if (!proj) return;

    const targetLang = language();
    const filenameActual = filename();
    const filenameBase = filenameActual.split('/').pop() || filenameActual;

    try {
      if (storeController) {
        try { storeController.abort(); } catch { }
        storeController = null;
      }

      storeController = new AbortController();
      const init: RequestInit = { signal: storeController.signal, credentials: 'include', headers: { 'Accept': 'application/x-ndjson' } };

      for await (const line of streamStore(proj.name, targetLang, init)) {
        if (line.type === 'header' || line.type === 'file_header') continue;

        if (!(line as any).filepath?.endsWith(`/${filenameBase}`) && (line as any).filepath !== filenameBase) continue;

        if (line.type === 'chunk') {
          const chunk = line as any;
          setTranslations(prev => {
            if (!prev || prev.length === 0) return prev;
            const updated = prev.map(t => {
              const entry = chunk.entries?.[t.key];
              if (!entry) return t;

              return { ...t, isValid: entry.status !== 'outdated', storeEntry: entry };
            });
            return updated;
          });
        }
      }
    } catch (e) {
      console.warn('Store stream error:', e);
    } finally {
      setIsStreamingStore(false);
      if (storeController) {
        try { storeController.abort(); } catch { }
        storeController = null;
      }
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
      streamStoreAndApply();
    }
  });

  onCleanup(() => {
    if (storeController) {
      try { storeController.abort(); } catch { }
      storeController = null;
    }
  });

  createEffect(() => {
    if (selectedKey()) loadSuggestions();
  });

  const filteredTranslations = () => {
    const query = searchQuery().toLowerCase();
    const status = filterStatus();

    const filtered = translations().filter(t => {
      const matchesSearch = !query || t.key.toLowerCase().includes(query) || t.sourceValue.toLowerCase().includes(query) || t.currentValue.toLowerCase().includes(query);
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

  const selectKey = (key: string) => {
    setSelectedKey(key);
    setSearchParams({ key, sort: sortMethod() });
    const translation = translations().find(t => t.key === key);
    if (translation) setTranslationValue(translation.currentValue);
  };

  const changeSort = (method: SortMethod) => {
    setSortMethod(method);
    setSearchParams({ key: selectedKey() || undefined, sort: method });
  };

  const saveTranslation = async () => {
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

  const approve = async (id: string) => {
    try {
      const proj = project();
      if (!proj) throw new Error('Project not found');
      await approveSuggestion(proj.name, id);
      await loadTranslations();
      await loadSuggestions(true);
      alert('Suggestion approved!');
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve suggestion');
    }
  };

  const reject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this suggestion?')) return;

    try {
      const proj = project();
      if (!proj) throw new Error('Project not found');
      await rejectSuggestion(proj.name, id);
      await loadSuggestions(true);
      alert('Suggestion rejected!');
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('Failed to reject suggestion');
    }
  };

  const previous = () => {
    const filtered = filteredTranslations();
    const currentIndex = filtered.findIndex(t => t.key === selectedKey());
    if (currentIndex > 0) selectKey(filtered[currentIndex - 1].key);
  };

  const next = () => {
    const filtered = filteredTranslations();
    const currentIndex = filtered.findIndex(t => t.key === selectedKey());
    if (currentIndex >= 0 && currentIndex < filtered.length - 1) selectKey(filtered[currentIndex + 1].key);
  };

  const currentIndex = () => {
    const index = filteredTranslations().findIndex(t => t.key === selectedKey());
    return index >= 0 ? index + 1 : 0;
  };

  const completionPercentage = () => {
    const total = translations().length;
    const proj = project();

    if (!proj || total === 0) return 0;
    if (language() === proj.sourceLanguage) return 0;

    const completed = translations().filter(t => t.currentValue !== '' && t.isValid).length;
    return Math.round((completed / total) * 100);
  };

  return {
    projectName,
    language,
    filename,
    displayFilename,
    state: {
      project,
      translations,
      selectedKey,
      translationValue,
      searchQuery,
      filterStatus,
      sortMethod,
      showSuggestions,
      suggestions,
      showMobileMenu,
      isLoading,
      isSaving,
      isStreamingStore,
    },
    // setters
    setProject,
    setTranslations,
    setSelectedKey,
    setTranslationValue,
    setSearchQuery,
    setFilterStatus,
    setSortMethod,
    setShowSuggestions,
    setSuggestions,
    setShowMobileMenu,
    setIsLoading,
    setIsSaving,
    setIsStreamingStore,

    // derived getters
    filteredTranslations,
    currentIndex,
    completionPercentage,

    // handlers
    selectKey,
    changeSort,
    saveTranslation,
    approve,
    reject,
    previous,
    next,
    loadProject,
    loadTranslations,
    loadSuggestions,
    streamStoreAndApply,
  };
}
