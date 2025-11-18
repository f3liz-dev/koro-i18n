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
    () => project()?.id,
    async (projectId) => (projectId ? fetchFiles(projectId, 'source-language') : null)
  );

  const [allFiles] = createResource(
    () => project()?.id,
    async (projectId) => (projectId ? fetchFiles(projectId) : null)
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
    if (percentage >= 90) return 'text-green-700 bg-gradient-to-r from-green-100 to-green-50';
    if (percentage >= 50) return 'text-amber-700 bg-gradient-to-r from-amber-100 to-amber-50';
    return 'text-red-700 bg-gradient-to-r from-red-100 to-red-50';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'from-green-500 to-green-600';
    if (percentage >= 50) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
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
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30">
      <PageHeader
        title={project()?.name || ''}
        subtitle={`<code class="text-xs text-gray-500">${project()?.repository || ''}</code>`}
        backButton={{
          onClick: () => navigate('/dashboard'),
        }}
        menuItems={menuItems}
      />

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div class="mb-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-2">Select Language</h2>
          <p class="text-gray-600">Choose a language to view and translate files</p>
        </div>

        <Show when={isLoading()}>
          <div class="text-center py-16">
            <div class="animate-pulse">
              <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-primary-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div class="text-gray-500 font-medium">Loading languages...</div>
            </div>
          </div>
        </Show>

        <Show when={!isLoading() && languageStats().length === 0}>
          <div class="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div class="text-xl font-semibold text-gray-900 mb-2">No target languages found</div>
            <div class="text-gray-500">Upload translation files for languages other than {project()?.sourceLanguage || 'en'} using GitHub Actions</div>
          </div>
        </Show>

        <Show when={!isLoading() && languageStats().length > 0}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <For each={languageStats()}>
              {(langStat) => {
                return (
                  <button
                    onClick={() => navigate(`/projects/${params.id}/language/${langStat.language}`)}
                    class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 text-left group"
                  >
                    <div class="flex items-center justify-between mb-6">
                      <h3 class="text-2xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {langStat.language.toUpperCase()}
                      </h3>
                      <div class={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${getPercentageColor(langStat.percentage)}`}>
                        {langStat.percentage}%
                      </div>
                    </div>
                    <div class="space-y-3">
                      <div class="text-sm text-gray-600 font-medium">
                        {langStat.translatedKeys} / {langStat.totalKeys} keys translated
                      </div>
                      <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          class={`h-3 rounded-full bg-gradient-to-r ${getProgressColor(langStat.percentage)} transition-all duration-500`}
                          style={`width: ${langStat.percentage}%`}
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
    </div>
  );
}
