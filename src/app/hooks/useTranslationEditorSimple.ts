/**
 * Simplified Translation Editor Hook
 * 
 * A cleaner, more intuitive hook for the translation editor that uses
 * the unified translation API endpoint.
 */

import { createSignal, createEffect, onMount, createMemo, onCleanup } from 'solid-js';
import { useParams, useNavigate, useSearchParams } from '@solidjs/router';
import { user } from '../auth';
import { authFetch } from '../utils/authFetch';
import {
  fetchFileTranslations,
  mergeTranslations,
  submitTranslation,
  approveTranslation,
  rejectTranslation,
  fetchSuggestions,
  type MergedTranslation,
  type WebTranslation,
} from '../utils/translationApiSimple';

export type SortMethod = 'priority' | 'alphabetical' | 'completion';
export type FilterStatus = 'all' | 'untranslated' | 'pending' | 'translated';

export interface TranslationEditorState {
  translations: MergedTranslation[];
  selectedKey: string | null;
  editValue: string;
  suggestions: WebTranslation[];
  searchQuery: string;
  filterStatus: FilterStatus;
  sortMethod: SortMethod;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  sourceLanguage: string;
  commitSha: string;
}

export function useTranslationEditorSimple() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Computed route params
  const projectName = () => params.projectName || '';
  const language = () => params.language || 'en';
  const filename = () => params.filename ? decodeURIComponent(params.filename) : 'common.json';
  const displayFilename = () => filename().replace(new RegExp(language(), 'g'), '{lang}');

  // State
  const [translations, setTranslations] = createSignal<MergedTranslation[]>([]);
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [editValue, setEditValue] = createSignal('');
  const [suggestions, setSuggestions] = createSignal<WebTranslation[]>([]);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterStatus, setFilterStatus] = createSignal<FilterStatus>('all');
  const [sortMethod, setSortMethod] = createSignal<SortMethod>(
    (searchParams.sort as SortMethod) || 'priority'
  );
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSaving, setIsSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = createSignal('en');
  const [commitSha, setCommitSha] = createSignal('');
  const [showMobileMenu, setShowMobileMenu] = createSignal(false);

  // Load translation data
  async function loadTranslations() {
    setIsLoading(true);
    setError(null);

    const data = await fetchFileTranslations(projectName(), language(), filename());
    
    if (!data) {
      setError('Failed to load translation data');
      setIsLoading(false);
      return;
    }

    const merged = mergeTranslations(data);
    setTranslations(merged);
    setSourceLanguage(data.sourceLanguage);
    setCommitSha(data.commitSha);

    // Select first key if none selected
    const keyFromUrl = searchParams.key as string;
    if (keyFromUrl && merged.find(t => t.key === keyFromUrl)) {
      selectKey(keyFromUrl);
    } else if (merged.length > 0 && !selectedKey()) {
      selectKey(merged[0].key);
    }

    setIsLoading(false);
  }

  // Load suggestions for selected key
  async function loadSuggestions() {
    const key = selectedKey();
    if (!key) {
      setSuggestions([]);
      return;
    }

    const data = await fetchSuggestions(projectName(), language(), filename(), key);
    setSuggestions(data);
  }

  // Filter and sort translations
  const filteredTranslations = createMemo(() => {
    const query = searchQuery().toLowerCase();
    const status = filterStatus();

    const filtered = translations().filter(t => {
      // Search filter
      const matchesSearch = !query || 
        t.key.toLowerCase().includes(query) || 
        t.sourceValue.toLowerCase().includes(query) || 
        t.currentValue.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      // Status filter
      if (status === 'untranslated') return t.status === 'untranslated';
      if (status === 'pending') return t.status === 'pending';
      if (status === 'translated') return t.status === 'translated' || t.status === 'approved';
      return true;
    });

    // Sort
    const method = sortMethod();
    return filtered.sort((a, b) => {
      if (method === 'priority') {
        // Priority: untranslated > pending > translated > approved
        const priority = { untranslated: 0, pending: 1, translated: 2, approved: 3 };
        const diff = priority[a.status] - priority[b.status];
        if (diff !== 0) return diff;
        return a.key.localeCompare(b.key);
      }
      if (method === 'alphabetical') {
        return a.key.localeCompare(b.key);
      }
      if (method === 'completion') {
        // Incomplete first
        const aComplete = a.status === 'approved' || a.status === 'translated';
        const bComplete = b.status === 'approved' || b.status === 'translated';
        if (!aComplete && bComplete) return -1;
        if (aComplete && !bComplete) return 1;
        return a.key.localeCompare(b.key);
      }
      return a.key.localeCompare(b.key);
    });
  });

  // Completion percentage
  const completionPercentage = createMemo(() => {
    const all = translations();
    if (all.length === 0) return 0;
    const completed = all.filter(t => t.status === 'approved' || t.status === 'translated').length;
    return Math.round((completed / all.length) * 100);
  });

  // Current index in filtered list
  const currentIndex = createMemo(() => {
    const key = selectedKey();
    if (!key) return 0;
    const idx = filteredTranslations().findIndex(t => t.key === key);
    return idx >= 0 ? idx + 1 : 0;
  });

  // Actions
  function selectKey(key: string) {
    setSelectedKey(key);
    setSearchParams({ key, sort: sortMethod() });
    const translation = translations().find(t => t.key === key);
    if (translation) {
      setEditValue(translation.currentValue);
    }
  }

  function changeSort(method: SortMethod) {
    setSortMethod(method);
    setSearchParams({ key: selectedKey() || undefined, sort: method });
  }

  async function save() {
    const key = selectedKey();
    const value = editValue();
    if (!key || !value) return;

    setIsSaving(true);
    const result = await submitTranslation(projectName(), language(), filename(), key, value);
    
    if (result.success) {
      await loadTranslations();
      await loadSuggestions();
    } else {
      setError(result.error || 'Failed to save translation');
    }
    
    setIsSaving(false);
  }

  async function approve(translationId: string) {
    const result = await approveTranslation(projectName(), translationId);
    if (result.success) {
      await loadTranslations();
      await loadSuggestions();
    } else {
      setError(result.error || 'Failed to approve translation');
    }
  }

  async function reject(translationId: string) {
    if (!confirm('Are you sure you want to reject this suggestion?')) return;
    
    const result = await rejectTranslation(projectName(), translationId);
    if (result.success) {
      await loadSuggestions();
    } else {
      setError(result.error || 'Failed to reject translation');
    }
  }

  function previous() {
    const filtered = filteredTranslations();
    const idx = filtered.findIndex(t => t.key === selectedKey());
    if (idx > 0) selectKey(filtered[idx - 1].key);
  }

  function next() {
    const filtered = filteredTranslations();
    const idx = filtered.findIndex(t => t.key === selectedKey());
    if (idx >= 0 && idx < filtered.length - 1) selectKey(filtered[idx + 1].key);
  }

  // Effects
  onMount(() => {
    if (!user()) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login');
      return;
    }
    loadTranslations();
  });

  createEffect(() => {
    if (selectedKey()) loadSuggestions();
  });

  return {
    // Route info
    projectName,
    language,
    filename,
    displayFilename,

    // State
    state: {
      translations,
      selectedKey,
      editValue,
      suggestions,
      searchQuery,
      filterStatus,
      sortMethod,
      isLoading,
      isSaving,
      error,
      sourceLanguage,
      commitSha,
      showMobileMenu,
    },

    // Setters
    setEditValue,
    setSearchQuery,
    setFilterStatus,
    setShowMobileMenu,

    // Computed
    filteredTranslations,
    completionPercentage,
    currentIndex,

    // Actions
    selectKey,
    changeSort,
    save,
    approve,
    reject,
    previous,
    next,
    reload: loadTranslations,
  };
}
