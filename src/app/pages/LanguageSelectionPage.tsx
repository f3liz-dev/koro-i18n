import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, createMemo, onMount, For, Show, createResource } from 'solid-js';
import { user, auth } from '../auth';
import { projects, createFetchFilesSummaryQuery } from '../utils/store';
import { PageHeader } from '../components';
import type { MenuItem } from '../components';

interface LanguageStats {
  language: string;
  totalKeys: number;
  translatedKeys: number;
  percentage: number;
}

export default function LanguageSelectionPage() {
  const navigate = useNavigate();
  const params = useParams();

  const [isOwner, setIsOwner] = createSignal(false);

  const project = () => (projects() || []).find((p: any) => p.id === params.projectName || p.name === params.projectName) || null;

  const fetchFilesSummaryQuery = createFetchFilesSummaryQuery();

  const [sourceFiles] = createResource(
    () => project()?.name,
    async (projectName) => (projectName ? fetchFilesSummaryQuery(projectName, 'source-language') : null)
  );

  const [allFiles] = createResource(
    () => project()?.name,
    async (projectName) => (projectName ? fetchFilesSummaryQuery(projectName) : null)
  );

  const sourceFilesData = () => sourceFiles();
  const allFilesData = () => allFiles();

  const isLoadingFiles = () => sourceFiles.loading || allFiles.loading;

  const matchFiles = (sourceFilename: string, targetFilename: string, sourceLang: string, targetLang: string): boolean => {
    if (sourceFilename === targetFilename) return true;
    const sourcePattern = sourceFilename.replace(sourceLang, '{lang}');
    const targetPattern = targetFilename.replace(targetLang, '{lang}');
    return sourcePattern === targetPattern;
  };

  const languageStats = createMemo(() => {
    const sourceData = sourceFilesData();
    const allData = allFilesData();

    if (!sourceData || !allData) return [];

    const sourceFilesList = (sourceData as any).files || [];
    const actualSourceLang = sourceFilesList.length > 0 ? sourceFilesList[0].lang : '';

    const languages = new Set<string>();
    (allData as any).files?.forEach((file: any) => {
      if (file.lang !== actualSourceLang) {
        languages.add(file.lang);
      }
    });

    const stats: LanguageStats[] = [];

    for (const lang of Array.from(languages)) {
      if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(lang)) continue;
      const targetFiles = ((allData as any).files || []).filter((f: any) => f.lang === lang);

      let totalKeys = 0;
      let translatedKeys = 0;

      for (const sourceFile of sourceFilesList) {
        totalKeys += sourceFile.totalKeys || 0;

        const targetFile = targetFiles.find((f: any) =>
          matchFiles(sourceFile.filename, f.filename, actualSourceLang, lang)
        );
        if (targetFile) {
          translatedKeys += targetFile.translatedKeys || 0;
        }
      }

      const percentage = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;
      stats.push({
        language: lang,
        totalKeys,
        translatedKeys,
        percentage
      });
    }

    stats.sort((a, b) => a.language.localeCompare(b.language));
    return stats;
  });

  const isLoading = () => isLoadingFiles();

  onMount(() => {
    auth.refresh();

    const proj = project();
    if (proj) {
      setIsOwner(proj.userId === user()?.id);
    }
  });

  const handleLogout = async () => {
    await auth.logout();
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'var(--success)';
    if (percentage >= 40) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getStatusBadgeClass = (percentage: number) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 40) return 'warning';
    return 'danger';
  };

  const menuItems: MenuItem[] = [
    {
      label: 'Settings',
      onClick: () => navigate(`/projects/${params.projectName}/settings`),
      show: isOwner(),
    },
    {
      label: 'Suggestions',
      onClick: () => navigate(`/projects/${params.projectName}/suggestions`),
      variant: 'primary',
    },
    {
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <div class="page animate-fade-in">
      <PageHeader
        title={project()?.name || ''}
        subtitle={`<code class="code-chip">${project()?.repository || ''}</code>`}
        backButton={{
          onClick: () => navigate('/dashboard'),
        }}
        menuItems={menuItems}
      />

      <div class="container" style={{ 'padding-top': '2rem' }}>
        {/* Section Header */}
        <div style={{ 'margin-bottom': '2rem' }}>
          <h2 style={{ 
            'font-size': '1.5rem', 
            'font-weight': '700', 
            'margin-bottom': '0.5rem',
            'letter-spacing': '-0.02em'
          }}>
            Select Language
          </h2>
          <p style={{ color: 'var(--text-secondary)', 'font-size': '0.9375rem' }}>
            Choose a language to view and translate files
          </p>
        </div>

        {/* Loading State */}
        <Show when={isLoading()}>
          <div style={{ 
            'text-align': 'center', 
            padding: '4rem 2rem',
            background: 'var(--bg)',
            'border-radius': 'var(--radius-lg)',
            border: '1px solid var(--border-light)'
          }}>
            <div class="animate-spin" style={{
              width: '3rem',
              height: '3rem',
              border: '3px solid var(--border)',
              'border-top-color': 'var(--accent)',
              'border-radius': '50%',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: 'var(--text-secondary)', 'font-size': '0.9375rem' }}>Loading languages...</p>
          </div>
        </Show>

        {/* Empty State */}
        <Show when={!isLoading() && languageStats().length === 0}>
          <div class="card" style={{ 
            'text-align': 'center', 
            padding: '4rem 2rem',
            'border-style': 'dashed',
            'border-width': '2px'
          }}>
            <div style={{
              width: '5rem',
              height: '5rem',
              margin: '0 auto 1.5rem',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              background: 'var(--accent-light)',
              'border-radius': '50%'
            }}>
              <svg width="32" height="32" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <h3 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              No target languages found
            </h3>
            <p style={{ color: 'var(--text-secondary)', 'max-width': '24rem', margin: '0 auto' }}>
              Upload translation files for languages other than {project()?.sourceLanguage || 'en'}
            </p>
          </div>
        </Show>

        {/* Languages Grid */}
        <Show when={!isLoading() && languageStats().length > 0}>
          <div class="grid grid-auto">
            <For each={languageStats()}>
              {(langStat) => (
                <button
                  onClick={() => navigate(`/projects/${params.projectName}/language/${langStat.language}`)}
                  class="card interactive"
                  style={{ 'text-align': 'left' }}
                >
                  <div style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    'margin-bottom': '1rem'
                  }}>
                    <h3 style={{ 
                      'font-size': '1.375rem', 
                      'font-weight': '700',
                      'letter-spacing': '0.02em'
                    }}>
                      {langStat.language.toUpperCase()}
                    </h3>
                    <span class={`badge ${getStatusBadgeClass(langStat.percentage)}`}>
                      {langStat.percentage}%
                    </span>
                  </div>
                  <div style={{ 
                    'font-size': '0.875rem', 
                    color: 'var(--text-secondary)', 
                    'margin-bottom': '0.875rem' 
                  }}>
                    <span style={{ 'font-weight': '600', color: 'var(--text)' }}>
                      {langStat.translatedKeys.toLocaleString()}
                    </span> / {langStat.totalKeys.toLocaleString()} keys translated
                  </div>
                  <div class="progress-bar">
                    <div 
                      class={`progress-fill ${getStatusBadgeClass(langStat.percentage)}`}
                      style={{ width: `${langStat.percentage}%` }}
                    />
                  </div>
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
