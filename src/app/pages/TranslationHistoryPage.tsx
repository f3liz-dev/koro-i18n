import { createSignal, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { SkeletonListItem } from '../components';
import { tryGetCached, createCachedFetcher } from '../utils/cachedFetch';
import { authFetch } from '../utils/authFetch';

interface HistoryEntry {
  id: string;
  value: string;
  username: string;
  action: string;
  commitSha?: string;
  createdAt: string;
}

async function fetchHistory(projectId: string, language: string, key: string) {
  const params = new URLSearchParams({ projectId, language, key });
  const url = `/api/translations/history?${params}`;
  
  // Try to get cached data first
  const cached = await tryGetCached(url, { credentials: 'include' });
  if (cached) {
    const data = await cached.json() as { history: HistoryEntry[] };
    return data.history;
  }
  
  // Fallback to network fetch
  const response = await authFetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch history');
  const data = await response.json() as { history: HistoryEntry[] };
  return data.history;
}

export default function TranslationHistoryPage() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = createSignal('');
  const [language, setLanguage] = createSignal('');
  const [key, setKey] = createSignal('');
  const [history, setHistory] = createSignal<HistoryEntry[] | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSearch = async () => {
    if (projectId() && language() && key()) {
      try {
        setIsLoading(true);
        const data = await fetchHistory(projectId(), language(), key());
        setHistory(data);
      } catch (error) {
        console.error('Failed to fetch history:', error);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'submitted': return 'text-blue-600';
      case 'approved': return 'text-green-600';
      case 'committed': return 'text-purple-600';
      case 'rejected': return 'text-red-600';
      case 'deleted': return 'text-gray-600';
      default: return 'text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'submitted': return '📝';
      case 'approved': return '✅';
      case 'committed': return '🚀';
      case 'rejected': return '❌';
      case 'deleted': return '🗑️';
      default: return '•';
    }
  };

  return (
    <div class="min-h-screen bg-white">
      <div class="border-b">
        <div class="max-w-5xl mx-auto px-8 py-5 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-lg font-semibold">Translation History</h1>
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-8 py-8">
        <div class="border rounded-lg p-6 mb-6">
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-2">Project ID</label>
            <input
              type="text"
              value={projectId()}
              onInput={(e) => setProjectId(e.currentTarget.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              class="w-full px-3 py-2 border rounded"
              placeholder="owner/repo"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Language</label>
            <input
              type="text"
              value={language()}
              onInput={(e) => setLanguage(e.currentTarget.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              class="w-full px-3 py-2 border rounded"
              placeholder="ja"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Translation Key</label>
            <input
              type="text"
              value={key()}
              onInput={(e) => setKey(e.currentTarget.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              class="w-full px-3 py-2 border rounded"
              placeholder="mainpage.title"
            />
          </div>
        </div>
          <button
            onClick={handleSearch}
            disabled={!projectId() || !language() || !key()}
            class="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>

        <div class="border rounded-lg">
          <Show when={!isLoading()} fallback={
            <div class="divide-y">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          }>
            <Show when={history()} fallback={<div class="p-8 text-center text-sm text-gray-400">Enter search criteria and click Search</div>}>
              <Show when={history()?.length} fallback={<div class="p-8 text-center text-sm text-gray-400">No history found</div>}>
                <div class="divide-y">
                  <For each={history()}>
                    {(entry) => (
                      <div class="p-4 hover:bg-gray-50 active:bg-gray-100 transition">
                        <div class="flex items-center gap-3 mb-2">
                          <span class="text-sm font-medium">{entry.username}</span>
                          <span class={`text-xs ${getActionColor(entry.action)}`}>
                            {entry.action}
                          </span>
                          <span class="text-xs text-gray-400">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div class="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded mb-2">
                          {entry.value}
                        </div>
                        <Show when={entry.commitSha}>
                          <code class="text-xs text-gray-500">{entry.commitSha?.substring(0, 7)}</code>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
