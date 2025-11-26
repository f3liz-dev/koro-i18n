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
  const params = new URLSearchParams({ language, key });
  const url = `/api/projects/${encodeURIComponent(projectName)}/translations/history?${params}`;

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

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'submitted': return 'badge';
      case 'approved': return 'badge success';
      case 'committed': return 'badge info';
      case 'rejected': return 'badge danger';
      case 'deleted': return 'badge danger';
      default: return 'badge';
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
    <div class="page animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '0.75rem',
        'margin-bottom': '2rem'
      }}>
        <button onClick={() => navigate('/dashboard')} class="btn ghost">
          ←
        </button>
        <h1 style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
          {t('translationHistory.title') || 'Translation History'}
        </h1>
      </div>

      <div style={{ 'max-width': '48rem' }}>
        {/* Search Form */}
        <div class="card mb-4">
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '1rem', 'margin-bottom': '1rem' }}>
            <div>
              <label class="label">{t('translationHistory.project') || 'Project'}</label>
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
              <label class="label">{t('translationHistory.language') || 'Language'}</label>
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
              <label class="label">{t('translationHistory.key') || 'Key'}</label>
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
            {t('common.search') || 'Search'}
          </button>
        </div>

        {/* Results */}
        <div class="card">
          <Show when={!isLoading()} fallback={
            <div class="divide-y">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          }>
            <Show when={history()} fallback={
              <div style={{ padding: '2rem', 'text-align': 'center', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                {t('translationHistory.enterSearch') || 'Enter project, language, and key to search history'}
              </div>
            }>
              <Show when={history()?.length} fallback={
                <div style={{ padding: '2rem', 'text-align': 'center', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                  {t('translationHistory.noHistory') || 'No history found'}
                </div>
              }>
                <div class="divide-y">
                  <For each={history()}>
                    {(entry) => (
                      <div style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', 'margin-bottom': '0.5rem' }}>
                          <span style={{ 'font-weight': '500', 'font-size': '0.875rem' }}>{entry.username}</span>
                          <span>{getActionIcon(entry.action)}</span>
                          <span class={getActionBadge(entry.action)}>{entry.action}</span>
                          <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div class="panel" style={{ display: 'inline-block' }}>
                          {entry.value}
                        </div>
                        <Show when={entry.commitSha}>
                          <code class="code-chip" style={{ 'margin-left': '0.5rem', 'font-size': '0.75rem' }}>
                            {entry.commitSha?.substring(0, 7)}
                          </code>
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
