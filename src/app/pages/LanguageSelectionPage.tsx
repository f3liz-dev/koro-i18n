import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, createMemo, onMount, For, Show, createResource } from 'solid-js';
import { user, auth } from '../auth';
import { projects, fetchFiles } from '../utils/store';
import { PageHeader } from '../components';
import type { MenuItem } from '../components';

interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
  sourceLanguage: string;
}

interface LanguageStats {
  language: string;
  totalKeys: number;
  translatedKeys: number;
  percentage: number;
}

interface FilesResponse {
  files: any[];
}

export default function LanguageSelectionPage() {
  const navigate = useNavigate();
  const params = useParams();

  const [isOwner, setIsOwner] = createSignal(false);

  const project = () => (projects() || []).find((p: any) => p.id === params.id || p.name === params.id) || null;

  const [sourceFiles] = createResource(
    () => project()?.name,
    async (projectName) => (projectName ? fetchFiles(projectName, 'source-language') : null)
  );

  const [allFiles] = createResource(
    () => project()?.name,
    async (projectName) => (projectName ? fetchFiles(projectName) : null)
  );

  const sourceFilesData = () => sourceFiles();
  const allFilesData = () => allFiles();

  const isLoadingFiles = () => sourceFiles.loading || allFiles.loading;

  // Compute language stats from the resource
  // Helper to match files with language-specific names
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

    // Get the actual source language from the fetched source files
    const sourceFiles = (sourceData as any).files || [];
    const actualSourceLang = sourceFiles.length > 0 ? sourceFiles[0].lang : '';

    // Get all languages except the source language
    const languages = new Set<string>();
    (allData as any).files?.forEach((file: any) => {
      if (file.lang !== actualSourceLang) {
        languages.add(file.lang);
      }
    });

    const stats: LanguageStats[] = [];

    for (const lang of Array.from(languages)) {
      // Only include valid language codes (e.g. "en", "es", "ja", "en-US")
      if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(lang)) continue;
      const targetFiles = ((allData as any).files || []).filter((f: any) => f.lang === lang);

      let totalKeys = 0;
      let translatedKeys = 0;

      for (const sourceFile of sourceFiles) {
        totalKeys += sourceFile.totalKeys || 0;

        // Match files handling both same-name and language-specific names
        const targetFile = targetFiles.find(f =>
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

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'color: #16a34a; background: linear-gradient(135deg, #dcfce7, #f0fdf4);';
    if (percentage >= 50) return 'color: #d97706; background: linear-gradient(135deg, #fef3c7, #fefce8);';
    return 'color: #dc2626; background: linear-gradient(135deg, #fee2e2, #fef2f2);';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'linear-gradient(135deg, #16a34a, #22c55e)';
    if (percentage >= 50) return 'linear-gradient(135deg, #d97706, #f59e0b)';
    return 'linear-gradient(135deg, #dc2626, #ef4444)';
  };

  const menuItems: MenuItem[] = [
    {
      label: 'Settings',
      onClick: () => navigate(`/projects/${params.id}/settings`),
      show: isOwner(),
    },
    {
      label: 'Suggestions',
      onClick: () => navigate(`/projects/${params.id}/suggestions`),
      variant: 'primary',
    },
    {
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <div class="kawaii-page" style="min-height: 100vh;">
      <PageHeader
        title={project()?.name || ''}
        subtitle={`<code style="font-size: 11px; color: var(--kawaii-muted);">${project()?.repository || ''}</code>`}
        backButton={{
          onClick: () => navigate('/dashboard'),
        }}
        menuItems={menuItems}
      />

      <div class="kawaii-container animate-fade-in">
        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 32px; font-weight: 800; color: var(--kawaii-ink); margin-bottom: 8px;">Select Language</h2>
          <p style="color: var(--kawaii-muted); font-size: 14px;">Choose a language to view and translate files</p>
        </div>

        <Show when={isLoading()}>
          <div style="text-align: center; padding: 64px 0;">
            <div style="animation: pulse 2s ease-in-out infinite;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, var(--kawaii-pink), var(--kawaii-peach)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: var(--kawaii-soft-shadow);">
                <svg style="width: 32px; height: 32px; color: white; animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div style="color: var(--kawaii-muted); font-weight: 600; font-size: 14px;">Loading languages...</div>
            </div>
          </div>
        </Show>

        <Show when={!isLoading() && languageStats().length === 0}>
          <div class="kawaii-card kawaii-empty-state">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div class="title">No target languages found</div>
            <div class="description">Upload translation files for languages other than {project()?.sourceLanguage || 'en'} using GitHub Actions</div>
          </div>
        </Show>

        <Show when={!isLoading() && languageStats().length > 0}>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
            <For each={languageStats()}>
              {(langStat) => {
                return (
                  <button
                    onClick={() => navigate(`/projects/${params.id}/language/${langStat.language}`)}
                    class="kawaii-card hover-lift transition-all"
                    style="text-align: left; cursor: pointer;"
                  >
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                      <h3 style="font-size: 24px; font-weight: 800; color: var(--kawaii-ink); transition: var(--kawaii-transition);" class="lang-title">
                        {langStat.language.toUpperCase()}
                      </h3>
                      <div style={`padding: 8px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; box-shadow: var(--kawaii-soft-shadow); ${getPercentageColor(langStat.percentage)}`}>
                        {langStat.percentage}%
                      </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                      <div style="font-size: 13px; color: var(--kawaii-muted); font-weight: 600;">
                        {langStat.translatedKeys} / {langStat.totalKeys} keys translated
                      </div>
                      <div style="width: 100%; background: var(--kawaii-surface); border-radius: 999px; height: 12px; overflow: hidden;">
                        <div
                          style={`height: 12px; border-radius: 999px; background: ${getProgressColor(langStat.percentage)}; transition: var(--kawaii-transition); width: ${langStat.percentage}%;`}
                        />
                      </div>
                    </div>
                  </button>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .lang-title {
          transition: var(--kawaii-transition);
        }
        .kawaii-card:hover .lang-title {
          color: var(--kawaii-accent);
        }
      `}</style>
    </div>
  );
}
