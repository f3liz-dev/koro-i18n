import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, For, Show, createResource, createMemo } from 'solid-js';
import { user, auth } from '../auth';
import { projects, createFetchFilesSummaryQuery } from '../utils/store';
import { PageHeader } from '../components';
import type { MenuItem } from '../components';

interface FileStats {
  filename: string;
  displayFilename: string; // Filename with {lang} placeholder for display
  targetFilename: string; // The actual filename in the target language
  totalKeys: number;
  translatedKeys: number;
  percentage: number;
}

// Local types are not required; using shared types via store and API responses

// Types moved to shared types; local declarations removed to avoid unused warnings.
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
    if (percentage >= 90) return 'color: var(--text-on-success); background: var(--color-mint-light);';
    if (percentage >= 50) return 'color: var(--text-on-warning); background: var(--color-peach-light);';
    return 'color: var(--text-on-danger); background: var(--color-danger-light);';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'var(--color-accent-mint)';
    if (percentage >= 50) return 'var(--color-accent-peach)';
    return 'var(--color-danger)';
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
    <div class="page" style="min-height: 100vh;">
      <PageHeader
        title={project()?.name || ''}
        subtitle={`
          <code style="font-size: 0.75rem; color: var(--color-text-secondary);">${project()?.repository || ''}</code>
          <span style="font-size: 0.75rem; color: var(--color-text-muted);">•</span>
          <span style="font-size: 0.75rem; font-weight: 600; color: var(--color-accent-peach);">${language().toUpperCase()}</span>
        `}
            backButton={{
          onClick: () => navigate(`/projects/${params.projectName}`),
        }}
        menuItems={menuItems}
      />

      <div class="container animate-fade-in">
        <div style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.875rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.625rem;">Select File</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.875rem; line-height: 1.6;">Choose a file to translate for {language().toUpperCase()}</p>
        </div>

        <Show when={isLoading()}>
          <div style="text-align: center; padding: 4rem 0;">
            <div style="
              width: 5rem;
              height: 5rem;
              background: linear-gradient(135deg, var(--color-peach-soft) 0%, var(--color-lavender-soft) 100%);
              border: var(--border);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1rem;
              box-shadow: var(--shadow-soft);
            ">
              <svg style="width: 2.5rem; height: 2.5rem; color: var(--color-text-secondary); animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div style="color: var(--color-text-secondary); font-weight: 500; font-size: 0.875rem;">Loading files...</div>
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
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <For each={fileStats()}>
              {(fileStat) => {
                return (
                  <button
                    onClick={() => navigate(`/projects/${params.projectName}/translate/${language()}/${encodeURIComponent(fileStat.targetFilename)}`)}
                    class="card hover-lift transition-all"
                    style="text-align: left; cursor: pointer;"
                  >
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
                      <div style="flex: 1;">
                        <h3 style="font-size: 1.125rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.625rem; transition: var(--transition);" class="file-title">
                          {fileStat.displayFilename}
                        </h3>
                        <div style="font-size: 0.813rem; color: var(--color-text-secondary); font-weight: 500;">
                          {fileStat.translatedKeys} / {fileStat.totalKeys} keys translated
                        </div>
                      </div>
                      <div style={`padding: 0.5rem 0.875rem; border-radius: var(--radius-xl); font-size: 0.813rem; font-weight: 600; border: var(--border); box-shadow: var(--shadow-soft); ${getPercentageColor(fileStat.percentage)}`}>
                        {fileStat.percentage}%
                      </div>
                    </div>
                    <div style="width: 100%; background: var(--color-cream); border-radius: var(--radius-xl); height: 0.75rem; overflow: hidden; border: var(--border);">
                      <div
                        style={`height: 0.75rem; border-radius: var(--radius-xl); background: ${getProgressBarColor(fileStat.percentage)}; transition: var(--transition); width: ${fileStat.percentage}%;`}
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
          transition: var(--transition);
        }
        .card:hover .file-title {
          color: var(--color-accent-peach);
        }
      `}</style>
    </div>
  );
}
