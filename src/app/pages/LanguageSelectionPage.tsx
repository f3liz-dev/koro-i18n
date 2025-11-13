import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, createResource, createMemo, onMount, For, Show } from 'solid-js';
import { user, auth } from '../auth';
import { prefetchForRoute } from '../utils/prefetch';
import { useForesight } from '../utils/useForesight';
import { createCachedFetcher } from '../utils/cachedFetch';

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
  
  const [project, setProject] = createSignal<Project | null>(null);
  const [isOwner, setIsOwner] = createSignal(false);

  const sourceLanguage = () => project()?.sourceLanguage || 'en';
  
  // Use createResource with cache-first fetcher for instant loading
  const [filesData] = createResource(
    () => `/api/projects/${params.id}/files/summary`,
    createCachedFetcher<FilesResponse>({ credentials: 'include' })
  );
  
  // Compute language stats from the resource
  const languageStats = createMemo(() => {
    const data = filesData();
    if (!data) return [];
    
    const source = sourceLanguage();
    const languages = new Set<string>();
    data.files.forEach(file => {
      if (file.lang !== source) {
        languages.add(file.lang);
      }
    });
    
    const stats: LanguageStats[] = [];
    
    for (const lang of Array.from(languages)) {
      const sourceFiles = data.files.filter(f => f.lang === source);
      const targetFiles = data.files.filter(f => f.lang === lang);
      
      let totalKeys = 0;
      let translatedKeys = 0;
      
      for (const sourceFile of sourceFiles) {
        const sourceStatus = sourceFile.translationStatus || {};
        const sourceKeys = Object.keys(sourceStatus);
        totalKeys += sourceKeys.length;
        
        const targetFile = targetFiles.find(f => f.filename === sourceFile.filename);
        if (targetFile) {
          const targetStatus = targetFile.translationStatus || {};
          for (const key of sourceKeys) {
            if (targetStatus[key]) {
              translatedKeys++;
            }
          }
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
  
  // isLoading is automatically handled by resource
  const isLoading = () => filesData.loading;

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

  const loadProject = async () => {
    try {
      const fetcher = createCachedFetcher<{ projects: Project[] }>({ credentials: 'include' });
      const data = await fetcher('/api/projects');
      const proj = data.projects.find((p: any) => p.name === params.id);
      if (proj) {
        setProject(proj);
        setIsOwner(proj.userId === user()?.id);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  onMount(() => {
    auth.refresh();
    loadProject();
    
    // Use smart prefetch for project-languages route
    const projectId = params.id;
    if (projectId) {
      void prefetchForRoute('project-languages', projectId);
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

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <button
                ref={backButtonRef}
                onClick={() => navigate('/dashboard')}
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 class="text-xl font-semibold text-gray-900">{project()?.name}</h1>
                <code class="text-xs text-gray-500">{project()?.repository}</code>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Show when={isOwner()}>
                <button
                  ref={settingsButtonRef}
                  onClick={() => navigate(`/projects/${params.id}/settings`)}
                  class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                >
                  Settings
                </button>
              </Show>
              <button
                ref={suggestionsButtonRef}
                onClick={() => navigate(`/projects/${params.id}/suggestions`)}
                class="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50"
              >
                Suggestions
              </button>
              <button
                onClick={handleLogout}
                class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

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
