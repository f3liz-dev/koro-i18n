import { createSignal, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { SkeletonListItem } from '../components';
import { authFetch } from '../utils/authFetch';
import { useI18n } from '../utils/i18n';

interface HistoryEntry {
  id: string;
  value: string;
  username: string;
  action: string;
  commitSha?: string;
  createdAt: string;
}

async function fetchHistory(projectName: string, language: string, key: string) {
  const params = new URLSearchParams({ projectName, language, key });
  const url = `/api/translations/history?${params}`;
  
  // Always fetch from network (dataStore handles caching)
  const response = await authFetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch history');
  const data = await response.json() as { history: HistoryEntry[] };
  return data.history;
}

export default function TranslationHistoryPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [projectName, setProjectName] = createSignal('');
  const [language, setLanguage] = createSignal('');
  const [key, setKey] = createSignal('');
  const [history, setHistory] = createSignal<HistoryEntry[] | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSearch = async () => {
  if (projectName() && language() && key()) {
      try {
        setIsLoading(true);
  const data = await fetchHistory(projectName(), language(), key());
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
      case 'submitted': return 'action-submitted';
      case 'approved': return 'action-approved';
      case 'committed': return 'action-committed';
      case 'rejected': return 'action-rejected';
      case 'deleted': return 'action-deleted';
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
    <div class="page min-h-screen">
      <div class="border-b">
        <div class="max-w-5xl mx-auto px-8 py-5 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            class="btn ghost p-2 rounded transition"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-lg font-semibold">{t('translationHistory.title')}</h1>
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-8 py-8">
  <div class="card mb-6">
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-2">{t('translationHistory.project')}</label>
            <input
              type="text"
              value={projectName()}
              onInput={(e) => setProjectName(e.currentTarget.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              class="input"
              placeholder="project-name"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">{t('translationHistory.language')}</label>
            <input
              type="text"
              value={language()}
              onInput={(e) => setLanguage(e.currentTarget.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              class="input"
              placeholder="ja"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">{t('translationHistory.key')}</label>
            <input
              type="text"
              value={key()}
              onInput={(e) => setKey(e.currentTarget.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              class="input"
              placeholder="mainpage.title"
            />
          </div>
        </div>
          <button
            onClick={handleSearch}
            disabled={!projectName() || !language() || !key()}
            class="btn primary"
          >
            {t('common.search')}
          </button>
        </div>

        <div class="card">
          <Show when={!isLoading()} fallback={
            <div class="divide-y">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          }>
            <Show when={history()} fallback={<div class="p-8 text-center text-sm text-gray-400">{t('translationHistory.enterSearch')}</div>}>
              <Show when={history()?.length} fallback={<div class="p-8 text-center text-sm text-gray-400">{t('translationHistory.noHistory')}</div>}>
                <div class="divide-y">
                  <For each={history()}>
                    {(entry) => (
                      <div class="p-4 hover-lift transition-all">
                        <div class="flex items-center gap-3 mb-2">
                          <span class="text-sm font-medium">{entry.username}</span>
                          <span class="icon">{getActionIcon(entry.action)}</span>
                          <span class={`text-xs ${getActionColor(entry.action)}`}>{entry.action}</span>
                          <span class="text-xs text-gray-400">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div class="card sm" style="display:inline-block;">
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
