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
    if (percentage >= 90) return 'color: #16a34a; background: var(--color-mint-light);';
    if (percentage >= 50) return 'color: #d97706; background: var(--color-peach-light);';
    return 'color: #dc2626; background: #fee2e2;';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'var(--color-mint)';
    if (percentage >= 50) return 'var(--color-peach)';
    return '#dc2626';
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
    <div class="page" style="min-height: 100vh;">
      <PageHeader
        title={project()?.name || ''}
        subtitle={`<code style="font-size: 0.75rem; color: var(--color-gray-500);">${project()?.repository || ''}</code>`}
        backButton={{
          onClick: () => navigate('/dashboard'),
        }}
        menuItems={menuItems}
      />

      <div class="container animate-fade-in">
        <div style="margin-bottom: 2rem;">
          <h2 style="font-size: 2rem; font-weight: 700; color: var(--color-black); margin-bottom: 0.5rem;">Select Language</h2>
          <p style="color: var(--color-gray-600); font-size: 0.875rem;">Choose a language to view and translate files</p>
        </div>

        <Show when={isLoading()}>
          <div style="text-align: center; padding: 4rem 0;">
            <div style="
              width: 4rem;
              height: 4rem;
              background: var(--color-gray-100);
              border: 2px solid var(--color-gray-300);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1rem;
            ">
              <svg style="width: 2rem; height: 2rem; color: var(--color-gray-600); animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div style="color: var(--color-gray-600); font-weight: 500; font-size: 0.875rem;">Loading languages...</div>
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
            <div class="description">Upload translation files for languages other than {project()?.sourceLanguage || 'en'} using GitHub Actions</div>
          </div>
        </Show>

        <Show when={!isLoading() && languageStats().length > 0}>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr)); gap: 1.25rem;">
            <For each={languageStats()}>
              {(langStat) => {
                return (
                  <button
                    onClick={() => navigate(`/projects/${params.id}/language/${langStat.language}`)}
                    class="card hover-lift transition-all"
                    style="text-align: left; cursor: pointer;"
                  >
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                      <h3 class="lang-title" style="
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: var(--color-black);
                        transition: var(--transition);
                      ">
                        {langStat.language.toUpperCase()}
                      </h3>
                      <div style={`
                        padding: 0.5rem 0.75rem;
                        border-radius: 999px;
                        font-size: 0.813rem;
                        font-weight: 600;
                        box-shadow: var(--shadow);
                        ${getPercentageColor(langStat.percentage)}
                      `}>
                        {langStat.percentage}%
                      </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                      <div style="font-size: 0.813rem; color: var(--color-gray-600); font-weight: 500;">
                        {langStat.translatedKeys} / {langStat.totalKeys} keys translated
                      </div>
                      <div style="
                        width: 100%;
                        background: var(--color-gray-100);
                        border-radius: 999px;
                        height: 0.5rem;
                        overflow: hidden;
                        border: var(--border);
                      ">
                        <div
                          style={`
                            height: 0.5rem;
                            border-radius: 999px;
                            background: ${getProgressBarColor(langStat.percentage)};
                            transition: var(--transition);
                            width: ${langStat.percentage}%;
                          `}
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
        .lang-title {
          transition: var(--transition);
        }
        .card:hover .lang-title {
          color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}
