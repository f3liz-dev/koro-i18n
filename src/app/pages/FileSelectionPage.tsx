import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, For, Show, createResource, createMemo } from 'solid-js';
import { user, auth } from '../auth';
import { projects, createFetchFilesSummaryQuery } from '../utils/store';
import { PageHeader } from '../components';
import type { MenuItem } from '../components';

interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
  sourceLanguage: string;
}

interface FileStats {
  filename: string;
  displayFilename: string; // Filename with {lang} placeholder for display
  targetFilename: string; // The actual filename in the target language
  totalKeys: number;
  translatedKeys: number;
  percentage: number;
}

interface FilesResponse {
  files: any[];
}

export default function FileSelectionPage() {
  const navigate = useNavigate();
  const params = useParams();

  const [isOwner, setIsOwner] = createSignal(false);

  const project = () => (projects() || []).find((p: any) => p.id === params.id || p.name === params.id) || null;
  const language = () => params.language || '';

  const fetchFilesSummaryQuery = createFetchFilesSummaryQuery();

  const [sourceFiles] = createResource(
    () => project()?.repository,
    async (projectRepository) => (projectRepository ? fetchFilesSummaryQuery(projectRepository, 'source-language') : null)
  );

  const [targetFiles] = createResource(
    () => ({ projectId: project()?.repository, language: language() }),
    async ({ projectId, language }) => (projectId && language ? fetchFilesSummaryQuery(projectId, language) : null)
  );

  const sourceFilesData = () => sourceFiles();
  const targetFilesData = () => targetFiles();

  const isLoadingFiles = () => sourceFiles.loading || targetFiles.loading;

  // Helper to match files with language-specific names
  // e.g., "en-US.json" matches with "ar-SA.json" (both are {lang}.json pattern)
  const matchFiles = (sourceFilename: string, targetFilename: string, sourceLang: string, targetLang: string): boolean => {
    // Direct match (e.g., browser-chrome.json === browser-chrome.json)
    if (sourceFilename === targetFilename) return true;

    // Check if source filename contains source language code
    // and target filename contains target language code in the same position
    // e.g., "en-US.json" -> "ar-SA.json"
    const sourcePattern = sourceFilename.replace(sourceLang, '{lang}');
    const targetPattern = targetFilename.replace(targetLang, '{lang}');

    return sourcePattern === targetPattern;
  };

  // Helper to create display filename with {lang} placeholder
  // e.g., "newtab/ar-SA.json" -> "newtab/{lang}.json"
  // e.g., "main/en-US/browser-chrome.json" -> "main/{lang}/browser-chrome.json"
  const createDisplayFilename = (filename: string, lang: string): string => {
    // Replace all occurrences of the language code with {lang}
    return filename.replace(new RegExp(lang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '{lang}');
  };

  // Compute file stats from the data
  const fileStats = createMemo(() => {
    const source = sourceFilesData();
    const target = targetFilesData();

    if (!source || !target) return [];

    const sourceFilesList = (source as any).files || [];
    const targetFilesList = (target as any).files || [];
    const stats: FileStats[] = [];

    // Get actual source language from source files
    const sourceLang = sourceFilesList.length > 0 ? sourceFilesList[0].lang : 'en';
    const targetLang = language();

    for (const sourceFile of sourceFilesList) {
      const totalKeys = sourceFile.totalKeys || 0;

      // Try to find matching target file (handles both same-name and language-specific names)
      const targetFile = targetFilesList.find(f =>
        matchFiles(sourceFile.filename, f.filename, sourceLang, targetLang)
      );
      const translatedKeys = targetFile?.translatedKeys || 0;

      // Use target filename if found, otherwise use source filename
      const targetFilename = targetFile?.filename || sourceFile.filename;

      // Create display filename with {lang} placeholder
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

    // Frontend sorting: Simple alphabetical sort
    // Dataset: Typically <50 files per project
    // Performance: O(n log n), ~1ms for typical datasets
    // This is lightweight enough for frontend, no need for backend sorting
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
        subtitle={`
          <code class="text-xs text-gray-500">${project()?.repository || ''}</code>
          <span class="text-xs text-gray-400">•</span>
          <span class="text-xs font-bold text-primary-600">${language().toUpperCase()}</span>
        `}
        backButton={{
          onClick: () => navigate(`/projects/${params.id}`),
        }}
        menuItems={menuItems}
      />

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div class="mb-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-2">Select File</h2>
          <p class="text-gray-600">Choose a file to translate for {language().toUpperCase()}</p>
        </div>

        <Show when={isLoading()}>
          <div class="text-center py-16">
            <div class="animate-pulse">
              <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-primary-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div class="text-gray-500 font-medium">Loading files...</div>
            </div>
          </div>
        </Show>

        <Show when={!isLoading() && fileStats().length === 0}>
          <div class="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="text-xl font-semibold text-gray-900 mb-2">No translation files yet</div>
            <div class="text-gray-500">Upload files using GitHub Actions to get started</div>
          </div>
        </Show>

        <Show when={!isLoading() && fileStats().length > 0}>
          <div class="space-y-4">
            <For each={fileStats()}>
              {(fileStat) => {
                return (
                  <button
                    onClick={() => navigate(`/projects/${params.id}/translate/${language()}/${encodeURIComponent(fileStat.targetFilename)}`)}
                    class="w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left group"
                  >
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex-1">
                        <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                          {fileStat.displayFilename}
                        </h3>
                        <div class="text-sm text-gray-600 font-medium">
                          {fileStat.translatedKeys} / {fileStat.totalKeys} keys translated
                        </div>
                      </div>
                      <div class={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${getPercentageColor(fileStat.percentage)}`}>
                        {fileStat.percentage}%
                      </div>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        class={`h-3 rounded-full bg-gradient-to-r ${getProgressColor(fileStat.percentage)} transition-all duration-500`}
                        style={`width: ${fileStat.percentage}%`}
                      />
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
