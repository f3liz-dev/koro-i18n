import { createSignal, createResource, For, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { user } from '../auth';
import { useForesight } from '../utils/useForesight';
import { SkeletonListItem } from '../components/Skeleton';

interface TranslationSuggestion {
  id: string;
  projectId: string;
  language: string;
  key: string;
  value: string;
  userId: string;
  username: string;
  avatarUrl: string;
  status: 'pending' | 'approved' | 'committed' | 'rejected' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

interface GroupedSuggestion {
  key: string;
  language: string;
  suggestions: TranslationSuggestion[];
}

async function fetchTranslationSuggestions(projectId: string, language?: string) {
  const params = new URLSearchParams({ projectId });
  if (language) params.append('language', language);
  
  const response = await fetch(`/api/translations/suggestions?${params}`, {
    credentials: 'include',
  });
  
  if (!response.ok) throw new Error('Failed to fetch suggestions');
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

export default function TranslationSuggestionsPage() {
  const params = useParams();
  const navigate = useNavigate();
  
  const projectId = () => params.projectId || '';
  const [selectedLanguage, setSelectedLanguage] = createSignal<string>('all');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'pending' | 'approved'>('pending');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [viewMode, setViewMode] = createSignal<'grouped' | 'flat'>('grouped');

  // ForesightJS ref
  const backButtonRef = useForesight({
    prefetchUrls: ['/api/projects'],
    debugName: 'back-to-dashboard',
  });

  const [suggestions, { refetch }] = createResource(
    () => ({ projectId: projectId(), language: selectedLanguage() === 'all' ? undefined : selectedLanguage() }),
    (params) => fetchTranslationSuggestions(params.projectId, params.language)
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this translation suggestion?')) {
      return;
    }

    try {
      await deleteTranslation(id);
      refetch();
    } catch (error) {
      console.error('Failed to delete translation:', error);
      alert('Failed to delete translation');
    }
  };

  // Group suggestions by key and language
  const groupedSuggestions = (): GroupedSuggestion[] => {
    const data = (suggestions() as any)?.suggestions || [];
    const query = searchQuery().toLowerCase();
    const status = filterStatus();

    // Filter first
    const filtered = data.filter((s: TranslationSuggestion) => {
      const matchesSearch = !query || 
        s.key.toLowerCase().includes(query) ||
        s.value.toLowerCase().includes(query) ||
        s.username.toLowerCase().includes(query);
      
      const matchesStatus = status === 'all' || s.status === status;
      
      return matchesSearch && matchesStatus;
    });

    // Group by key + language
    const groups = new Map<string, GroupedSuggestion>();
    
    filtered.forEach((s: TranslationSuggestion) => {
      const groupKey = `${s.language}:${s.key}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: s.key,
          language: s.language,
          suggestions: []
        });
      }
      
      groups.get(groupKey)!.suggestions.push(s);
    });

    // Sort suggestions within each group by date (newest first)
    groups.forEach(group => {
      group.suggestions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return Array.from(groups.values());
  };

  const flatSuggestions = () => {
    const data = (suggestions() as any)?.suggestions || [];
    const query = searchQuery().toLowerCase();
    const status = filterStatus();

    return data.filter((s: TranslationSuggestion) => {
      const matchesSearch = !query || 
        s.key.toLowerCase().includes(query) ||
        s.value.toLowerCase().includes(query) ||
        s.username.toLowerCase().includes(query);
      
      const matchesStatus = status === 'all' || s.status === status;
      
      return matchesSearch && matchesStatus;
    }).sort((a: TranslationSuggestion, b: TranslationSuggestion) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'committed':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get unique languages from suggestions
  const availableLanguages = () => {
    const data = (suggestions() as any)?.suggestions || [];
    const langs = new Set(data.map((s: TranslationSuggestion) => s.language));
    return Array.from(langs).sort();
  };

  const totalSuggestions = () => {
    return viewMode() === 'grouped' 
      ? groupedSuggestions().reduce((sum, g) => sum + g.suggestions.length, 0)
      : flatSuggestions().length;
  };

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Translation Suggestions</h1>
              <p class="text-sm text-gray-600">
                {projectId()} • Public contributions
              </p>
            </div>
            <button
              ref={backButtonRef}
              onClick={() => navigate('/dashboard')}
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Filters */}
          <div class="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search by key, value, or username..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="flex-1 min-w-[200px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={selectedLanguage()}
              onChange={(e) => setSelectedLanguage(e.currentTarget.value)}
              class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Languages</option>
              <For each={availableLanguages()}>
                {(lang) => <option value={String(lang)}>{String(lang).toUpperCase()}</option>}
              </For>
            </select>

            <select
              value={filterStatus()}
              onChange={(e) => setFilterStatus(e.currentTarget.value as any)}
              class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>

            <select
              value={viewMode()}
              onChange={(e) => setViewMode(e.currentTarget.value as any)}
              class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="grouped">Grouped by Key</option>
              <option value="flat">Flat List</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="max-w-7xl mx-auto px-4 py-6">
        <Show when={suggestions.loading}>
          <div class="bg-white rounded-lg shadow divide-y">
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </div>
        </Show>

        <Show when={suggestions.error}>
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            Failed to load suggestions. Please try again.
          </div>
        </Show>

        <Show when={!suggestions.loading && !suggestions.error}>
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b">
              <h2 class="text-lg font-semibold">
                {totalSuggestions()} Suggestion{totalSuggestions() !== 1 ? 's' : ''}
                <Show when={viewMode() === 'grouped'}>
                  {' '}in {groupedSuggestions().length} key{groupedSuggestions().length !== 1 ? 's' : ''}
                </Show>
              </h2>
            </div>

            {/* Grouped View */}
            <Show when={viewMode() === 'grouped'}>
              <Show when={groupedSuggestions().length === 0}>
                <div class="p-12 text-center text-gray-500">
                  <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p class="text-lg mb-2">No suggestions found</p>
                  <p class="text-sm">Try adjusting your filters or search query</p>
                </div>
              </Show>

              <div class="divide-y">
                <For each={groupedSuggestions()}>
                  {(group: GroupedSuggestion) => (
                    <div class="p-4">
                      {/* Key header */}
                      <div class="mb-3 pb-2 border-b">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
                            {group.language.toUpperCase()}
                          </span>
                          <code class="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            {group.key}
                          </code>
                        </div>
                        <p class="text-xs text-gray-500">
                          {group.suggestions.length} suggestion{group.suggestions.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* All suggestions for this key */}
                      <div class="space-y-3">
                        <For each={group.suggestions}>
                          {(suggestion: TranslationSuggestion, index) => (
                            <div class={`pl-4 border-l-2 ${index() === 0 ? 'border-blue-400' : 'border-gray-200'}`}>
                              <div class="flex items-start justify-between gap-4">
                                <div class="flex-1 min-w-0">
                                  {/* User info and status */}
                                  <div class="flex items-center gap-2 mb-2">
                                    <img
                                      src={suggestion.avatarUrl || `https://ui-avatars.com/api/?name=${suggestion.username}`}
                                      alt={suggestion.username}
                                      class="w-6 h-6 rounded-full"
                                    />
                                    <span class="font-medium text-sm text-gray-900">{suggestion.username}</span>
                                    <span class={`text-xs px-2 py-0.5 rounded ${getStatusBadge(suggestion.status)}`}>
                                      {suggestion.status}
                                    </span>
                                    <span class="text-xs text-gray-500">
                                      {formatRelativeTime(suggestion.createdAt)}
                                    </span>
                                    <Show when={index() === 0 && group.suggestions.length > 1}>
                                      <span class="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                                        Latest
                                      </span>
                                    </Show>
                                  </div>

                                  {/* Translation value */}
                                  <div class="bg-gray-50 p-2 rounded border text-sm">
                                    <p class="text-gray-900 break-words">{suggestion.value}</p>
                                  </div>
                                </div>

                                {/* Actions */}
                                <Show when={user()?.id === suggestion.userId && suggestion.status === 'pending'}>
                                  <button
                                    onClick={() => handleDelete(suggestion.id)}
                                    class="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200 transition flex-shrink-0"
                                    title="Delete your suggestion"
                                  >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </Show>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            {/* Flat View */}
            <Show when={viewMode() === 'flat'}>
              <Show when={flatSuggestions().length === 0}>
                <div class="p-12 text-center text-gray-500">
                  <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p class="text-lg mb-2">No suggestions found</p>
                  <p class="text-sm">Try adjusting your filters or search query</p>
                </div>
              </Show>

              <div class="divide-y">
                <For each={flatSuggestions()}>
                  {(suggestion: TranslationSuggestion) => (
                    <div class="p-4 hover:bg-gray-50 transition">
                      <div class="flex items-start justify-between gap-4">
                        <div class="flex-1 min-w-0">
                          {/* Header with user info and status */}
                          <div class="flex items-center gap-3 mb-2">
                            <img
                              src={suggestion.avatarUrl || `https://ui-avatars.com/api/?name=${suggestion.username}`}
                              alt={suggestion.username}
                              class="w-8 h-8 rounded-full"
                            />
                            <div class="flex-1">
                              <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-medium text-gray-900">{suggestion.username}</span>
                                <span class={`text-xs px-2 py-1 rounded ${getStatusBadge(suggestion.status)}`}>
                                  {suggestion.status}
                                </span>
                                <span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                  {suggestion.language.toUpperCase()}
                                </span>
                              </div>
                              <div class="text-xs text-gray-500">
                                {formatDate(suggestion.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* Translation key */}
                          <div class="mb-2">
                            <code class="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {suggestion.key}
                            </code>
                          </div>

                          {/* Translation value */}
                          <div class="bg-gray-50 p-3 rounded border">
                            <p class="text-gray-900 break-words">{suggestion.value}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <Show when={user()?.id === suggestion.userId && suggestion.status === 'pending'}>
                          <button
                            onClick={() => handleDelete(suggestion.id)}
                            class="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200 transition flex-shrink-0"
                            title="Delete your suggestion"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
