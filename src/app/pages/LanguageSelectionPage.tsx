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
    if (percentage >= 90) return 'var(--success)';
    if (percentage >= 50) return 'var(--warning)';
    return 'var(--danger)';
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
        <div style={{ 'margin-bottom': '2rem' }}>
          <h2 style={{ 'font-size': '1.5rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
            Select Language
          </h2>
          <p style={{ color: 'var(--text-secondary)', 'font-size': '0.875rem' }}>
            Choose a language to view and translate files
          </p>
        </div>

        <Show when={isLoading()}>
          <div style={{ 'text-align': 'center', padding: '3rem' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              border: '3px solid var(--border)',
              'border-top-color': 'var(--accent)',
              'border-radius': '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading languages...</p>
          </div>
        </Show>

        <Show when={!isLoading() && languageStats().length === 0}>
          <div class="card empty-state">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div class="title">No target languages found</div>
            <div class="description">Upload translation files for languages other than {project()?.sourceLanguage || 'en'}</div>
          </div>
        </Show>

        <Show when={!isLoading() && languageStats().length > 0}>
          <div class="grid grid-auto">
            <For each={languageStats()}>
              {(langStat) => (
                <button
                  onClick={() => navigate(`/projects/${params.projectName}/language/${langStat.language}`)}
                  class="card hover-lift transition-all"
                  style={{ 'text-align': 'left', cursor: 'pointer' }}
                >
                  <div style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    'margin-bottom': '1rem'
                  }}>
                    <h3 style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
                      {langStat.language.toUpperCase()}
                    </h3>
                    <span class="badge" style={{
                      background: langStat.percentage >= 90 ? 'var(--success-light)' :
                                  langStat.percentage >= 50 ? 'var(--warning-light)' : 'var(--danger-light)',
                      color: langStat.percentage >= 90 ? '#065f46' :
                             langStat.percentage >= 50 ? '#92400e' : '#b91c1c'
                    }}>
                      {langStat.percentage}%
                    </span>
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '0.75rem' }}>
                    {langStat.translatedKeys} / {langStat.totalKeys} keys
                  </div>
                  <div style={{
                    width: '100%',
                    height: '0.5rem',
                    background: 'var(--surface)',
                    'border-radius': '999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${langStat.percentage}%`,
                      background: getProgressColor(langStat.percentage),
                      'border-radius': '999px',
                      transition: 'width 0.3s ease'
                    }} />
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
