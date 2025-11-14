import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, For, Show } from 'solid-js';
import { user, auth } from '../auth';
import { prefetchData } from '../utils/prefetch';
import { useForesight } from '../utils/useForesight';
import { projectsCache, filesSummaryCache } from '../utils/dataStore';
import PageHeader, { MenuItem } from '../components/PageHeader';

interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
  sourceLanguage: string;
}

interface FileStats {
  filename: string;
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

  // Access stores directly - returns cached data immediately
  const projectsStore = projectsCache.get();
  const project = () => projectsStore.projects.find((p: any) => p.id === params.id) || null;
  
  const language = () => params.language || '';
  
  // Use 'source-language' to automatically detect the actual source language from uploaded files
  const sourceFilesStore = () => filesSummaryCache.get(params.id || '', 'source-language');
  const targetFilesStore = () => filesSummaryCache.get(params.id || '', language());
  
  const sourceFilesData = () => sourceFilesStore()?.data;
  const targetFilesData = () => targetFilesStore()?.data;
  
  // Show loading only if we don't have cached data for both source and target
  const isLoadingFiles = () => !sourceFilesStore()?.lastFetch || !targetFilesStore()?.lastFetch;
  
  // Compute file stats from the data
  const fileStats = () => {
    const source = sourceFilesData();
    const target = targetFilesData();
    
    if (!source || !target) return [];
    
    const sourceFilesList = source.files;
    const targetFilesList = target.files;
    const stats: FileStats[] = [];
    
    for (const sourceFile of sourceFilesList) {
      const totalKeys = sourceFile.totalKeys || 0;
      
      const targetFile = targetFilesList.find(f => f.filename === sourceFile.filename);
      const translatedKeys = targetFile?.translatedKeys || 0;
      
      const percentage = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;
      stats.push({
        filename: sourceFile.filename,
        totalKeys,
        translatedKeys,
        percentage
      });
    }
    
    stats.sort((a, b) => a.filename.localeCompare(b.filename));
    return stats;
  };
  
  const isLoading = () => isLoadingFiles();

  // ForesightJS refs for navigation buttons
  const backButtonRef = useForesight({
    prefetchUrls: [`/api/projects/${params.id}/files/summary`],
    debugName: 'back-to-languages',
  });

  const settingsButtonRef = useForesight({
    prefetchUrls: [],
    debugName: 'project-settings',
  });

  const suggestionsButtonRef = useForesight({
    prefetchUrls: [`/api/projects/${params.id}/suggestions`],
    debugName: 'suggestions-button',
  });

  onMount(() => {
    auth.refresh();
    
    // Fetch data in background - will update stores when data arrives
    projectsCache.fetch(false);
    
    const projectId = params.id;
    const targetLanguage = language();
    
    if (projectId && targetLanguage) {
      // Use 'source-language' to automatically detect the actual source language
      filesSummaryCache.fetch(projectId, 'source-language');
      filesSummaryCache.fetch(projectId, targetLanguage);
      
      // Prefetch summary endpoints for this page
      void prefetchData(`/api/projects/${projectId}/files/summary?lang=${targetLanguage}`);
    }
    
    // Set isOwner based on project data
    const proj = project();
    if (proj) {
      setIsOwner(proj.userId === user()?.id);
    }
  });

  const handleLogout = async () => {
    await auth.logout();
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const menuItems: MenuItem[] = [
    {
      label: 'Settings',
      onClick: () => navigate(`/projects/${params.id}/settings`),
      ref: settingsButtonRef,
      show: isOwner(),
    },
    {
      label: 'Suggestions',
      onClick: () => navigate(`/projects/${params.id}/suggestions`),
      ref: suggestionsButtonRef,
      variant: 'primary',
    },
    {
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <PageHeader
        title={project()?.name || ''}
        subtitle={`
          <code class="text-xs text-gray-500">${project()?.repository || ''}</code>
          <span class="text-xs text-gray-400">•</span>
          <span class="text-xs font-medium text-blue-600">${language().toUpperCase()}</span>
        `}
        backButton={{
          onClick: () => navigate(`/projects/${params.id}`),
          ref: backButtonRef,
        }}
        menuItems={menuItems}
      />

      {/* Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Select File</h2>
          <p class="text-gray-600">Choose a file to translate for {language().toUpperCase()}</p>
        </div>

        <Show when={isLoading()}>
          <div class="text-center py-12">
            <div class="text-gray-400">Loading files...</div>
          </div>
        </Show>

        <Show when={!isLoading() && fileStats().length === 0}>
          <div class="bg-white rounded-lg border p-12 text-center">
            <div class="text-gray-400 mb-2">No translation files yet</div>
            <div class="text-sm text-gray-400">Upload files using GitHub Actions to get started</div>
          </div>
        </Show>

        <Show when={!isLoading() && fileStats().length > 0}>
          <div class="space-y-3">
            <For each={fileStats()}>
              {(fileStat) => {
                const fileCardRef = useForesight({
                  prefetchUrls: [`/api/translations?projectId=${params.id}&language=${language()}&filename=${encodeURIComponent(fileStat.filename)}`],
                  debugName: `file-card-${fileStat.filename}`,
                  hitSlop: 10,
                });

                return (
                  <button
                    ref={fileCardRef}
                    onClick={() => navigate(`/projects/${params.id}/translate/${language()}/${encodeURIComponent(fileStat.filename)}`)}
                    class="w-full bg-white rounded-lg border p-6 hover:border-blue-500 hover:shadow-md active:scale-[0.98] transition text-left"
                  >
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex-1">
                        <h3 class="font-medium text-gray-900 mb-1">{fileStat.filename}</h3>
                        <div class="text-sm text-gray-600">
                          {fileStat.translatedKeys} / {fileStat.totalKeys} keys translated
                        </div>
                      </div>
                      <div class={`px-3 py-1 rounded-full text-sm font-medium ${getPercentageColor(fileStat.percentage)}`}>
                        {fileStat.percentage}%
                      </div>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        class="bg-blue-600 h-2 rounded-full transition-all"
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
