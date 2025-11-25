import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, For, Show, createResource, createMemo } from 'solid-js';
import { user, auth } from '../auth';
import { projects, createFetchFilesSummaryQuery } from '../utils/store';
import { PageHeader } from '../components';
import type { MenuItem } from '../components';

interface FileStats {
  filename: string;
  displayFilename: string;
  targetFilename: string;
  totalKeys: number;
  translatedKeys: number;
  percentage: number;
}

export default function FileSelectionPage() {
  const navigate = useNavigate();
  const params = useParams();

  const [isOwner, setIsOwner] = createSignal(false);

  const project = () => (projects() || []).find((p: any) => p.id === params.projectName || p.name === params.projectName) || null;
  const language = () => params.language || '';

  const fetchFilesSummaryQuery = createFetchFilesSummaryQuery();

  const [sourceFiles] = createResource(
    () => project()?.name,
    async (projectName) => (projectName ? fetchFilesSummaryQuery(projectName, 'source-language') : null)
  );

  const [targetFiles] = createResource(
    () => ({ projectName: project()?.name, language: language() }),
    async ({ projectName, language }) => (projectName && language ? fetchFilesSummaryQuery(projectName, language) : null)
  );

  const sourceFilesData = () => sourceFiles();
  const targetFilesData = () => targetFiles();

  const isLoadingFiles = () => sourceFiles.loading || targetFiles.loading;

  const matchFiles = (sourceFilename: string, targetFilename: string, sourceLang: string, targetLang: string): boolean => {
    if (sourceFilename === targetFilename) return true;
    const sourcePattern = sourceFilename.replace(sourceLang, '{lang}');
    const targetPattern = targetFilename.replace(targetLang, '{lang}');
    return sourcePattern === targetPattern;
  };

  const createDisplayFilename = (filename: string, lang: string): string => {
    return filename.replace(new RegExp(lang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '{lang}');
  };

  const fileStats = createMemo(() => {
    const source = sourceFilesData();
    const target = targetFilesData();

    if (!source || !target) return [];

    const sourceFilesList = (source as any).files || [];
    const targetFilesList = (target as any).files || [];
    const stats: FileStats[] = [];

    const sourceLang = sourceFilesList.length > 0 ? sourceFilesList[0].lang : 'en';
    const targetLang = language();

    for (const sourceFile of sourceFilesList) {
      const totalKeys = sourceFile.totalKeys || 0;

      const targetFile = targetFilesList.find((f: any) =>
        matchFiles(sourceFile.filename, f.filename, sourceLang, targetLang)
      );
      const translatedKeys = targetFile?.translatedKeys || 0;
      const targetFilename = targetFile?.filename || sourceFile.filename;
      const displayFilename = createDisplayFilename(sourceFile.filename, sourceLang);

      const percentage = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;
      stats.push({
        filename: sourceFile.filename,
        displayFilename: displayFilename,
        targetFilename: targetFilename,
        totalKeys,
        translatedKeys,
        percentage
      });
    }

    stats.sort((a, b) => a.filename.localeCompare(b.filename));
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
        subtitle={`<code class="code-chip">${project()?.repository || ''}</code> • <strong>${language().toUpperCase()}</strong>`}
        backButton={{
          onClick: () => navigate(`/projects/${params.projectName}`),
        }}
        menuItems={menuItems}
      />

      <div class="container" style={{ 'padding-top': '2rem' }}>
        <div style={{ 'margin-bottom': '2rem' }}>
          <h2 style={{ 'font-size': '1.5rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
            Select File
          </h2>
          <p style={{ color: 'var(--text-secondary)', 'font-size': '0.875rem' }}>
            Choose a file to translate for {language().toUpperCase()}
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
            <p style={{ color: 'var(--text-secondary)' }}>Loading files...</p>
          </div>
        </Show>

        <Show when={!isLoading() && fileStats().length === 0}>
          <div class="card empty-state">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="title">No translation files yet</div>
            <div class="description">Upload files using GitHub Actions to get started</div>
          </div>
        </Show>

        <Show when={!isLoading() && fileStats().length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
            <For each={fileStats()}>
              {(fileStat) => (
                <button
                  onClick={() => navigate(`/projects/${params.projectName}/translate/${language()}/${encodeURIComponent(fileStat.targetFilename)}`)}
                  class="card hover-lift transition-all"
                  style={{ 'text-align': 'left', cursor: 'pointer' }}
                >
                  <div style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    'margin-bottom': '1rem'
                  }}>
                    <div style={{ flex: '1' }}>
                      <h3 style={{ 'font-size': '1rem', 'font-weight': '600', 'margin-bottom': '0.375rem' }}>
                        {fileStat.displayFilename}
                      </h3>
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                        {fileStat.translatedKeys} / {fileStat.totalKeys} keys
                      </div>
                    </div>
                    <span class="badge" style={{
                      background: fileStat.percentage >= 90 ? 'var(--success-light)' :
                                  fileStat.percentage >= 50 ? 'var(--warning-light)' : 'var(--danger-light)',
                      color: fileStat.percentage >= 90 ? '#065f46' :
                             fileStat.percentage >= 50 ? '#92400e' : '#b91c1c'
                    }}>
                      {fileStat.percentage}%
                    </span>
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
                      width: `${fileStat.percentage}%`,
                      background: getProgressColor(fileStat.percentage),
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
