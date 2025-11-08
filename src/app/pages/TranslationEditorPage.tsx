import { createSignal, createResource, For, Show, onMount } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { user } from '../auth';

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

async function approveTranslation(id: string) {
  const response = await fetch(`/api/translations/${id}/approve`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to approve translation');
  return response.json();
}

async function deleteTranslation(id: string) {
  const response = await fetch(`/api/translations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete translation');
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
  const [editingKey, setEditingKey] = createSignal<string | null>(null);
  const [translationValue, setTranslationValue] = createSignal('');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'pending' | 'approved' | 'committed'>('all');
  const [showHistory, setShowHistory] = createSignal(false);
  const [autoSaveTimer, setAutoSaveTimer] = createSignal<number | null>(null);

  // Mock translation strings (in real app, fetch from GitHub)
  const [translationStrings, setTranslationStrings] = createSignal<TranslationString[]>([
    {
      key: 'mainpage.title',
      sourceValue: 'Welcome to our platform',
      currentValue: 'プラットフォームへようこそ',
      translations: [],
    },
    {
      key: 'mainpage.subtitle',
      sourceValue: 'Start your journey today',
      currentValue: '',
      translations: [],
    },
    {
      key: 'buttons.save',
      sourceValue: 'Save',
      currentValue: '保存',
      translations: [],
    },
    {
      key: 'buttons.cancel',
      sourceValue: 'Cancel',
      currentValue: 'キャンセル',
      translations: [],
    },
    {
      key: 'errors.notFound',
      sourceValue: 'Page not found',
      currentValue: '',
      translations: [],
    },
  ]);

  const [translations] = createResource(
    () => ({ projectId: projectId(), language: language() }),
    (params) => fetchProjectTranslations(params.projectId, params.language)
  );

  const [history] = createResource(
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
    setSelectedKey(key);
    setShowHistory(false);
    const str = translationStrings().find(s => s.key === key);
    if (str) {
      setTranslationValue(str.currentValue || '');
    }
  };

  const handleEdit = (key: string) => {
    setEditingKey(key);
    const str = translationStrings().find(s => s.key === key);
    if (str) {
      setTranslationValue(str.currentValue || '');
    }
  };

  const handleSave = async () => {
    const key = editingKey();
    if (!key) return;

    try {
      await submitTranslation(projectId(), language(), key, translationValue());
      
      // Update local state
      setTranslationStrings(prev => prev.map(str => 
        str.key === key 
          ? { ...str, currentValue: translationValue() }
          : str
      ));
      
      setEditingKey(null);
      setSelectedKey(key);
    } catch (error) {
      console.error('Failed to save translation:', error);
      alert('Failed to save translation');
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setTranslationValue('');
  };

  const handleApprove = async (id: string) => {
    try {
      await approveTranslation(id);
      alert('Translation approved! It will be committed in the next batch.');
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve translation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this translation?')) return;
    
    try {
      await deleteTranslation(id);
      alert('Translation deleted');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete translation');
    }
  };

  const handleAutoSave = () => {
    const timer = autoSaveTimer();
    if (timer) clearTimeout(timer);
    
    const newTimer = window.setTimeout(() => {
      if (editingKey()) {
        handleSave();
      }
    }, 30000); // 30 seconds
    
    setAutoSaveTimer(newTimer);
  };

  const getCompletionPercentage = () => {
    const total = translationStrings().length;
    const completed = translationStrings().filter(s => s.currentValue).length;
    return Math.round((completed / total) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'committed': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  onMount(() => {
    if (!user()) {
      navigate('/login');
    }
  });

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Translation Editor</h1>
              <p class="text-sm text-gray-600">
                {projectId()} • {language().toUpperCase()}
              </p>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <div class="text-sm text-gray-600">Progress</div>
                <div class="text-2xl font-bold text-blue-600">{getCompletionPercentage()}%</div>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div class="flex gap-4">
            <input
              type="text"
              placeholder="Search translations..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStatus()}
              onChange={(e) => setFilterStatus(e.currentTarget.value as any)}
              class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="committed">Committed</option>
            </select>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Translation List */}
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b">
              <h2 class="text-lg font-semibold">Translation Strings</h2>
              <p class="text-sm text-gray-600">
                {filteredStrings().length} of {translationStrings().length} strings
              </p>
            </div>
            <div class="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
              <For each={filteredStrings()}>
                {(str) => (
                  <div
                    class={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                      selectedKey() === str.key ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => handleSelectKey(str.key)}
                  >
                    <div class="flex items-start justify-between mb-2">
                      <code class="text-sm font-mono text-gray-700">{str.key}</code>
                      <Show when={str.currentValue}>
                        <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Translated
                        </span>
                      </Show>
                    </div>
                    <div class="text-sm text-gray-600 mb-1">
                      <span class="font-medium">EN:</span> {str.sourceValue}
                    </div>
                    <Show when={str.currentValue}>
                      <div class="text-sm text-gray-900">
                        <span class="font-medium">{language().toUpperCase()}:</span> {str.currentValue}
                      </div>
                    </Show>
                    <Show when={!str.currentValue}>
                      <div class="text-sm text-gray-400 italic">
                        No translation yet
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Editor Panel */}
          <div class="bg-white rounded-lg shadow">
            <Show when={selectedKey()} fallback={
              <div class="p-8 text-center text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p class="text-lg">Select a translation string to edit</p>
              </div>
            }>
              {() => {
                const str = translationStrings().find(s => s.key === selectedKey());
                if (!str) return null;

                return (
                  <div class="flex flex-col h-full">
                    <div class="p-4 border-b">
                      <div class="flex items-center justify-between mb-2">
                        <code class="text-lg font-mono font-semibold">{str.key}</code>
                        <button
                          onClick={() => setShowHistory(!showHistory())}
                          class="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {showHistory() ? 'Hide' : 'Show'} History
                        </button>
                      </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Source Text */}
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                          Source (English)
                        </label>
                        <div class="p-3 bg-gray-50 rounded border text-gray-900">
                          {str.sourceValue}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          {str.sourceValue.length} characters
                        </div>
                      </div>

                      {/* Translation Input */}
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                          Translation ({language().toUpperCase()})
                        </label>
                        <Show when={editingKey() === str.key} fallback={
                          <div>
                            <div class="p-3 bg-gray-50 rounded border text-gray-900 min-h-[80px]">
                              {str.currentValue || <span class="text-gray-400 italic">No translation</span>}
                            </div>
                            <button
                              onClick={() => handleEdit(str.key)}
                              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Edit Translation
                            </button>
                          </div>
                        }>
                          <textarea
                            value={translationValue()}
                            onInput={(e) => {
                              setTranslationValue(e.currentTarget.value);
                              handleAutoSave();
                            }}
                            class="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                            placeholder="Enter translation..."
                          />
                          <div class="flex items-center justify-between mt-2">
                            <div class="text-xs text-gray-500">
                              {translationValue().length} characters
                              <Show when={translationValue().length > str.sourceValue.length * 1.5}>
                                <span class="text-orange-600 ml-2">⚠️ Much longer than source</span>
                              </Show>
                            </div>
                            <div class="flex gap-2">
                              <button
                                onClick={handleCancel}
                                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSave}
                                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                disabled={!translationValue().trim()}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </Show>
                      </div>

                      {/* History */}
                      <Show when={showHistory()}>
                        <div>
                          <h3 class="text-sm font-medium text-gray-700 mb-2">Translation History</h3>
                          <Show when={!history.loading} fallback={<div class="text-sm text-gray-500">Loading...</div>}>
                            <Show when={history()?.history?.length} fallback={
                              <div class="text-sm text-gray-500 italic">No history yet</div>
                            }>
                              <div class="space-y-2">
                                <For each={history()?.history}>
                                  {(entry: any) => (
                                    <div class="p-3 bg-gray-50 rounded border">
                                      <div class="flex items-center justify-between mb-1">
                                        <div class="flex items-center gap-2">
                                          <span class="font-medium text-sm">{entry.username}</span>
                                          <span class={`text-xs px-2 py-1 rounded ${getStatusColor(entry.action)}`}>
                                            {entry.action}
                                          </span>
                                        </div>
                                        <span class="text-xs text-gray-500">
                                          {new Date(entry.createdAt).toLocaleString()}
                                        </span>
                                      </div>
                                      <div class="text-sm text-gray-700">"{entry.value}"</div>
                                      <Show when={entry.commitSha}>
                                        <div class="text-xs text-gray-500 mt-1">
                                          Commit: <code>{entry.commitSha.substring(0, 7)}</code>
                                        </div>
                                      </Show>
                                    </div>
                                  )}
                                </For>
                              </div>
                            </Show>
                          </Show>
                        </div>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
