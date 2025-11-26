import { createSignal, For, Show, createEffect, createResource } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { user } from '../auth';
import { SkeletonListItem } from '../components';
import { createFetchSuggestionsQuery } from '../utils/store';
import { authFetch } from '../utils/authFetch';

interface TranslationSuggestion {
  id: string;
  projectName: string;
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

async function deleteTranslation(projectName: string, id: string) {
  const response = await authFetch(`/api/projects/${encodeURIComponent(projectName)}/translations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to delete translation');
  return response.json();
}

export default function TranslationSuggestionsPage() {
  const params = useParams();
  const navigate = useNavigate();

  const projectName = () => params.projectName || '';
  const [selectedLanguage, setSelectedLanguage] = createSignal<string>('all');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'pending' | 'approved'>('pending');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [viewMode, setViewMode] = createSignal<'grouped' | 'flat'>('grouped');
  const [error, _setError] = createSignal<boolean>(false);

  const [suggestionsKey, setSuggestionsKey] = createSignal(0);
  const fetchSuggestionsQuery = createFetchSuggestionsQuery();
  const [suggestions] = createResource(
    () => ({ projectName: projectName(), language: selectedLanguage() === 'all' ? '' : selectedLanguage(), key: suggestionsKey() }),
    async ({ projectName, language }) => {
      if (!projectName) return { suggestions: [] };
      return fetchSuggestionsQuery(projectName, language);
    }
  );

  const suggestionsList = () => (suggestions() as any)?.suggestions || [];
  const isLoading = () => suggestions.loading;

  const refetch = () => {
    setSuggestionsKey(k => k + 1);
  };

  createEffect(() => {
    selectedLanguage();
    refetch();
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this translation suggestion?')) {
      return;
    }

    try {
      await deleteTranslation(projectName(), id);
      refetch();
    } catch (error) {
      console.error('Failed to delete translation:', error);
      alert('Failed to delete translation');
    }
  };

  const groupedSuggestions = (): GroupedSuggestion[] => {
    const data = suggestionsList();
    const query = searchQuery().toLowerCase();
    const status = filterStatus();

    const filtered = data.filter((s: TranslationSuggestion) => {
      const matchesSearch = !query ||
        s.key.toLowerCase().includes(query) ||
        s.value.toLowerCase().includes(query) ||
        s.username.toLowerCase().includes(query);

      const matchesStatus = status === 'all' || s.status === status;

      return matchesSearch && matchesStatus;
    });

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

    groups.forEach(group => {
      group.suggestions.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return Array.from(groups.values());
  };

  const flatSuggestions = () => {
    const data = suggestionsList();
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
      case 'pending': return 'badge warning';
      case 'approved': return 'badge success';
      case 'committed': return 'badge';
      case 'rejected': return 'badge danger';
      default: return 'badge';
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

  const availableLanguages = () => {
    const data = suggestionsList();
    const langs = new Set(data.map((s: TranslationSuggestion) => s.language));
    return Array.from(langs).sort();
  };

  const totalSuggestions = () => {
    return viewMode() === 'grouped'
      ? groupedSuggestions().reduce((sum, g) => sum + g.suggestions.length, 0)
      : flatSuggestions().length;
  };

  return (
    <div class="page animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'margin-bottom': '1.5rem',
        'flex-wrap': 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ 'font-size': '1.5rem', 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
            Translation Suggestions
          </h1>
          <p style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
            {projectName()} • Public contributions
          </p>
        </div>
        <button onClick={() => navigate('/dashboard')} class="btn ghost">
          ← Back to Dashboard
        </button>
      </div>

      {/* Filters */}
      <div class="card mb-4">
        <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search by key, value, or username..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="input"
            style={{ flex: '1', 'min-width': '200px' }}
          />

          <select
            value={selectedLanguage()}
            onChange={(e) => setSelectedLanguage(e.currentTarget.value)}
            class="input"
            style={{ width: 'auto' }}
          >
            <option value="all">All Languages</option>
            <For each={availableLanguages()}>
              {(lang) => <option value={String(lang)}>{String(lang).toUpperCase()}</option>}
            </For>
          </select>

          <select
            value={filterStatus()}
            onChange={(e) => setFilterStatus(e.currentTarget.value as any)}
            class="input"
            style={{ width: 'auto' }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>

          <select
            value={viewMode()}
            onChange={(e) => setViewMode(e.currentTarget.value as any)}
            class="input"
            style={{ width: 'auto' }}
          >
            <option value="grouped">Grouped by Key</option>
            <option value="flat">Flat List</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <Show when={isLoading()}>
        <div class="card">
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </div>
      </Show>

      <Show when={error()}>
        <div class="message error">
          Failed to load suggestions. Please try again.
        </div>
      </Show>

      <Show when={!isLoading() && !error()}>
        <div class="card">
          <div style={{ padding: '1rem', 'border-bottom': '1px solid var(--border)' }}>
            <h2 style={{ 'font-size': '1rem', 'font-weight': '600' }}>
              {totalSuggestions()} Suggestion{totalSuggestions() !== 1 ? 's' : ''}
              <Show when={viewMode() === 'grouped'}>
                {' '}in {groupedSuggestions().length} key{groupedSuggestions().length !== 1 ? 's' : ''}
              </Show>
            </h2>
          </div>

          {/* Grouped View */}
          <Show when={viewMode() === 'grouped'}>
            <Show when={groupedSuggestions().length === 0}>
              <div class="empty-state">
                <div class="icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div class="title">No suggestions found</div>
                <div class="description">Try adjusting your filters or search query</div>
              </div>
            </Show>

            <div class="divide-y">
              <For each={groupedSuggestions()}>
                {(group: GroupedSuggestion) => (
                  <div style={{ padding: '1rem' }}>
                    <div style={{ 'margin-bottom': '0.75rem', 'padding-bottom': '0.5rem', 'border-bottom': '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.25rem' }}>
                        <span class="badge info">{group.language.toUpperCase()}</span>
                        <code class="code-chip">{group.key}</code>
                      </div>
                      <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {group.suggestions.length} suggestion{group.suggestions.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div class="space-y-3">
                      <For each={group.suggestions}>
                        {(suggestion: TranslationSuggestion, index) => (
                          <div style={{
                            'padding-left': '1rem',
                            'border-left': `2px solid ${index() === 0 ? 'var(--accent)' : 'var(--border)'}`
                          }}>
                            <div style={{ display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '1rem' }}>
                              <div style={{ flex: '1', 'min-width': '0' }}>
                                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem', 'flex-wrap': 'wrap' }}>
                                  <img
                                    src={suggestion.avatarUrl || `https://ui-avatars.com/api/?name=${suggestion.username}`}
                                    alt={suggestion.username}
                                    style={{ width: '1.5rem', height: '1.5rem', 'border-radius': '50%' }}
                                  />
                                  <span style={{ 'font-weight': '500', 'font-size': '0.875rem' }}>{suggestion.username}</span>
                                  <span class={getStatusBadge(suggestion.status)}>{suggestion.status}</span>
                                  <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                                    {formatRelativeTime(suggestion.createdAt)}
                                  </span>
                                  <Show when={index() === 0 && group.suggestions.length > 1}>
                                    <span class="badge info">Latest</span>
                                  </Show>
                                </div>

                                <div class="panel" style={{ display: 'inline-block' }}>
                                  <p style={{ 'word-break': 'break-word' }}>{suggestion.value}</p>
                                </div>
                              </div>

                              <Show when={user()?.id === suggestion.userId && suggestion.status === 'pending'}>
                                <button
                                  onClick={() => handleDelete(suggestion.id)}
                                  class="btn danger"
                                  title="Delete your suggestion"
                                  aria-label="Delete suggestion"
                                >
                                  🗑️
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
              <div class="empty-state">
                <div class="icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div class="title">No suggestions found</div>
                <div class="description">Try adjusting your filters or search query</div>
              </div>
            </Show>

            <div class="divide-y">
              <For each={flatSuggestions()}>
                {(suggestion: TranslationSuggestion) => (
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '1rem' }}>
                      <div style={{ flex: '1', 'min-width': '0' }}>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', 'margin-bottom': '0.5rem' }}>
                          <img
                            src={suggestion.avatarUrl || `https://ui-avatars.com/api/?name=${suggestion.username}`}
                            alt={suggestion.username}
                            style={{ width: '2rem', height: '2rem', 'border-radius': '50%' }}
                          />
                          <div style={{ flex: '1' }}>
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                              <span style={{ 'font-weight': '500' }}>{suggestion.username}</span>
                              <span class={getStatusBadge(suggestion.status)}>{suggestion.status}</span>
                              <span class="badge info">{suggestion.language.toUpperCase()}</span>
                            </div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {formatDate(suggestion.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div style={{ 'margin-bottom': '0.5rem' }}>
                          <code class="code-chip">{suggestion.key}</code>
                        </div>

                        <div class="panel" style={{ display: 'inline-block' }}>
                          <p style={{ 'word-break': 'break-word' }}>{suggestion.value}</p>
                        </div>
                      </div>

                      <Show when={user()?.id === suggestion.userId && suggestion.status === 'pending'}>
                        <button
                          onClick={() => handleDelete(suggestion.id)}
                          class="btn danger"
                          title="Delete your suggestion"
                          aria-label="Delete suggestion"
                        >
                          🗑️
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
  );
}
