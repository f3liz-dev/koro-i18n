import { createSignal, createResource, For, Show } from 'solid-js';

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
  const response = await fetch(`/api/translations/history?${params}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch history');
  const data = await response.json();
  return data.history as HistoryEntry[];
}

export default function TranslationHistoryPage() {
  const [projectId, setProjectId] = createSignal('owner/repo');
  const [language, setLanguage] = createSignal('ja');
  const [key, setKey] = createSignal('mainpage.title');

  const [history] = createResource(
    () => ({ projectId: projectId(), language: language(), key: key() }),
    (params) => fetchHistory(params.projectId, params.language, params.key)
  );

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
    <div class="max-w-4xl mx-auto p-6">
      <h1 class="text-3xl font-bold mb-6">Translation History</h1>

      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Project ID</label>
            <input
              type="text"
              value={projectId()}
              onInput={(e) => setProjectId(e.currentTarget.value)}
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
              class="w-full px-3 py-2 border rounded"
              placeholder="mainpage.title"
            />
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow">
        <Show when={!history.loading} fallback={<div class="p-6">Loading...</div>}>
          <Show when={history()?.length} fallback={<div class="p-6 text-gray-500">No history found</div>}>
            <div class="divide-y">
              <For each={history()}>
                {(entry) => (
                  <div class="p-4 hover:bg-gray-50">
                    <div class="flex items-start gap-3">
                      <span class="text-2xl">{getActionIcon(entry.action)}</span>
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="font-medium">{entry.username}</span>
                          <span class={`text-sm font-semibold ${getActionColor(entry.action)}`}>
                            {entry.action}
                          </span>
                          <span class="text-sm text-gray-500">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div class="text-gray-700 bg-gray-50 px-3 py-2 rounded">
                          "{entry.value}"
                        </div>
                        <Show when={entry.commitSha}>
                          <div class="text-xs text-gray-500 mt-1">
                            Commit: <code class="bg-gray-100 px-1 rounded">{entry.commitSha?.substring(0, 7)}</code>
                          </div>
                        </Show>
                        <div class="text-xs text-gray-400 mt-1">
                          ID: {entry.id}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
