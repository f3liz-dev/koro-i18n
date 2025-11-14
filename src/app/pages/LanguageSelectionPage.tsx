import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, createMemo, onMount, For, Show } from 'solid-js';
import { user, auth } from '../auth';
import { prefetchForRoute } from '../utils/prefetch';
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

  // Access stores directly - returns cached data immediately
  const projectsStore = projectsCache.get();
  const project = () => projectsStore.projects.find((p: any) => p.name === params.id) || null;
  
  // Get the actual source language files using the special query parameter
  const sourceFilesStore = () => filesSummaryCache.get(params.id || '', 'source-language');
  const sourceFilesData = () => sourceFilesStore()?.data;
  
  // Get all files to determine available languages
  const allFilesStore = () => filesSummaryCache.get(params.id || '');
  const allFilesData = () => allFilesStore()?.data;
  
  // Show loading only if we don't have cached data
  const isLoadingFiles = () => !sourceFilesStore()?.lastFetch || !allFilesStore()?.lastFetch;
  
  // Compute language stats from the resource
  const languageStats = createMemo(() => {
    const sourceData = sourceFilesData();
    const allData = allFilesData();
    
    if (!sourceData || !allData) return [];
    
    // Get the actual source language from the fetched source files
    const sourceFiles = sourceData.files;
    const actualSourceLang = sourceFiles.length > 0 ? sourceFiles[0].lang : '';
    
    // Get all languages except the source language
    const languages = new Set<string>();
    allData.files.forEach(file => {
      if (file.lang !== actualSourceLang) {
        languages.add(file.lang);
      }
    });
    
    const stats: LanguageStats[] = [];
    
    for (const lang of Array.from(languages)) {
      const targetFiles = allData.files.filter(f => f.lang === lang);
      
      let totalKeys = 0;
      let translatedKeys = 0;
      
      for (const sourceFile of sourceFiles) {
        totalKeys += sourceFile.totalKeys || 0;
        
        const targetFile = targetFiles.find(f => f.filename === sourceFile.filename);
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

  // ForesightJS refs for navigation buttons
  const backButtonRef = useForesight({
    prefetchUrls: ['/api/projects'],
    debugName: 'back-to-dashboard',
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
    if (projectId) {
      // Fetch source language files using the special query parameter
      filesSummaryCache.fetch(projectId, 'source-language');
      // Also fetch all files to get all available languages
      filesSummaryCache.fetch(projectId);
      
      // Use smart prefetch for project-languages route
      void prefetchForRoute('project-languages', projectId);
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
        subtitle={`<code class="text-xs text-gray-500">${project()?.repository || ''}</code>`}
        backButton={{
          onClick: () => navigate('/dashboard'),
          ref: backButtonRef,
        }}
        menuItems={menuItems}
      />

      {/* Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Select Language</h2>
          <p class="text-gray-600">Choose a language to view and translate files</p>
        </div>

        <Show when={isLoading()}>
          <div class="text-center py-12">
            <div class="text-gray-400">Loading languages...</div>
          </div>
        </Show>

        <Show when={!isLoading() && languageStats().length === 0}>
          <div class="bg-white rounded-lg border p-12 text-center">
            <div class="text-gray-400 mb-2">No target languages found</div>
            <div class="text-sm text-gray-400">Upload translation files for languages other than {project()?.sourceLanguage || 'en'} using GitHub Actions</div>
          </div>
        </Show>

        <Show when={!isLoading() && languageStats().length > 0}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={languageStats()}>
              {(langStat) => {
                const langCardRef = useForesight({
                  prefetchUrls: [`/api/projects/${params.id}/files/summary?lang=${langStat.language}`],
                  debugName: `language-card-${langStat.language}`,
                  hitSlop: 10,
                });

                return (
                  <button
                    ref={langCardRef}
                    onClick={() => navigate(`/projects/${params.id}/language/${langStat.language}`)}
                    class="bg-white rounded-lg border p-6 hover:border-blue-500 hover:shadow-md transition text-left"
                  >
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-xl font-semibold text-gray-900">{langStat.language.toUpperCase()}</h3>
                      <div class={`px-3 py-1 rounded-full text-sm font-medium ${getPercentageColor(langStat.percentage)}`}>
                        {langStat.percentage}%
                      </div>
                    </div>
                    <div class="space-y-2">
                      <div class="text-sm text-gray-600">
                        {langStat.translatedKeys} / {langStat.totalKeys} keys translated
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          class="bg-blue-600 h-2 rounded-full transition-all"
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
