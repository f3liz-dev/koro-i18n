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
    () => project()?.name,
    async (projectName) => (projectName ? fetchFilesSummaryQuery(projectName, 'source-language') : null)
  );

  const [targetFiles] = createResource(
    () => ({ projectId: project()?.name, language: language() }),
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
    if (percentage >= 90) return 'color: #16a34a; background: #dcfce7;';
    if (percentage >= 50) return 'color: #d97706; background: #fef3c7;';
    return 'color: #dc2626; background: #fee2e2;';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return '#16a34a';
    if (percentage >= 50) return '#d97706';
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
    <div class="kawaii-page" style="min-height: 100vh;">
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

      <div class="kawaii-container animate-fade-in">
        <div class="mb-8">
          <h2 style="font-size: 32px; font-weight: 800; color: var(--kawaii-ink); margin-bottom: 8px;">Select File</h2>
          <p style="color: var(--kawaii-muted); font-size: 14px;">Choose a file to translate for {language().toUpperCase()}</p>
        </div>

        <Show when={isLoading()}>
          <div style="text-align: center; padding: 64px 0;">
            <div style="width: 64px; height: 64px; background: var(--kawaii-pink-light); border: 3px solid var(--kawaii-pink); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
              <svg style="width: 32px; height: 32px; color: var(--kawaii-pink); animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div style="color: var(--kawaii-muted); font-weight: 600; font-size: 14px;">Loading files...</div>
          </div>
        </Show>

        <Show when={!isLoading() && fileStats().length === 0}>
          <div class="kawaii-card kawaii-empty-state">
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
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <For each={fileStats()}>
              {(fileStat) => {
                return (
                  <button
                    onClick={() => navigate(`/projects/${params.id}/translate/${language()}/${encodeURIComponent(fileStat.targetFilename)}`)}
                    class="kawaii-card hover-lift transition-all"
                    style="text-align: left; cursor: pointer;"
                  >
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                      <div style="flex: 1;">
                        <h3 style="font-size: 18px; font-weight: 700; color: var(--kawaii-ink); margin-bottom: 8px; transition: var(--kawaii-transition);" class="file-title">
                          {fileStat.displayFilename}
                        </h3>
                        <div style="font-size: 13px; color: var(--kawaii-muted); font-weight: 600;">
                          {fileStat.translatedKeys} / {fileStat.totalKeys} keys translated
                        </div>
                      </div>
                      <div style={`padding: 8px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; ${getPercentageColor(fileStat.percentage)}`}>
                        {fileStat.percentage}%
                      </div>
                    </div>
                    <div style="width: 100%; background: #f5f5f5; border-radius: 999px; height: 12px; overflow: hidden; border: 2px solid var(--kawaii-border-color);">
                      <div
                        style={`height: 12px; border-radius: 999px; background: ${getProgressBarColor(fileStat.percentage)}; transition: var(--kawaii-transition); width: ${fileStat.percentage}%;`}
                      />
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
        .file-title {
          transition: var(--kawaii-transition);
        }
        .kawaii-card:hover .file-title {
          color: var(--kawaii-pink);
        }
      `}</style>
    </div>
  );
}
