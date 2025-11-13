import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, For, Show } from 'solid-js';
import { user, auth } from '../auth';
import { prefetchData } from '../utils/prefetch';
import { useForesight } from '../utils/useForesight';
import { cachedFetch } from '../utils/cachedFetch';

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

export default function FileSelectionPage() {
  const navigate = useNavigate();
  const params = useParams();
  
  const [project, setProject] = createSignal<Project | null>(null);
  const [fileStats, setFileStats] = createSignal<FileStats[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isOwner, setIsOwner] = createSignal(false);

  const language = () => params.language || '';

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

  const loadProject = async () => {
    try {
      // Try cache first for instant loading
      const res = await cachedFetch('/api/projects', { 
        credentials: 'include',
        tryCache: true,
      });
      if (res.ok) {
        const data = await res.json() as { projects: Project[] };
        const proj = data.projects.find((p: any) => p.name === params.id);
        if (proj) {
          setProject(proj);
          setIsOwner(proj.userId === user()?.id);
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const sourceLanguage = project()?.sourceLanguage || 'en';
      const targetLanguage = language();
      
      // Try to fetch from cache first (ForesightJS may have prefetched this)
      // This provides instant loading when data is already cached
      const [sourceRes, targetRes] = await Promise.all([
        cachedFetch(`/api/projects/${params.id}/files/summary?lang=${sourceLanguage}`, {
          credentials: 'include',
          tryCache: true,
        }),
        cachedFetch(`/api/projects/${params.id}/files/summary?lang=${targetLanguage}`, {
          credentials: 'include',
          tryCache: true,
        })
      ]);
      
      if (sourceRes.ok) {
        const sourceData = await sourceRes.json() as { files: any[] };
        const targetData = targetRes.ok ? await targetRes.json() as { files: any[] } : { files: [] };
        
        const sourceFiles = sourceData.files;
        const targetFiles = targetData.files;
        
        const stats: FileStats[] = [];
        
        for (const sourceFile of sourceFiles) {
          const sourceStatus = sourceFile.translationStatus || {};
          const sourceKeys = Object.keys(sourceStatus);
          const totalKeys = sourceKeys.length;
          
          // Find corresponding target file
          const targetFile = targetFiles.find(f => f.filename === sourceFile.filename);
          let translatedKeys = 0;
          
          if (targetFile) {
            const targetStatus = targetFile.translationStatus || {};
            
            // Count how many source keys have translations
            for (const key of sourceKeys) {
              if (targetStatus[key]) {
                translatedKeys++;
              }
            }
          }
          
          const percentage = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;
          
          stats.push({
            filename: sourceFile.filename,
            totalKeys,
            translatedKeys,
            percentage
          });
        }
        
        // Sort by filename
        stats.sort((a, b) => a.filename.localeCompare(b.filename));
        
        setFileStats(stats);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    auth.refresh();
    loadProject();
    
    // Prefetch summary endpoints for this page
    const projectId = params.id;
    const targetLanguage = language();
    
    // Prefetch both source and target language summaries
    if (projectId && targetLanguage) {
      // Prefetch target language summary
      void prefetchData(`/api/projects/${projectId}/files/summary?lang=${targetLanguage}`);
    }
  });

  // Load files after project is loaded
  onMount(() => {
    const interval = setInterval(() => {
      if (project()) {
        const sourceLanguage = project()!.sourceLanguage;
        const projectId = params.id;
        
        // Prefetch source language summary
        if (sourceLanguage && projectId) {
          void prefetchData(`/api/projects/${projectId}/files/summary?lang=${sourceLanguage}`);
        }
        
        loadFiles();
        clearInterval(interval);
      }
    }, 100);
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
                onClick={() => navigate(`/projects/${params.id}`)}
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 class="text-xl font-semibold text-gray-900">{project()?.name}</h1>
                <div class="flex items-center gap-2">
                  <code class="text-xs text-gray-500">{project()?.repository}</code>
                  <span class="text-xs text-gray-400">•</span>
                  <span class="text-xs font-medium text-blue-600">{language().toUpperCase()}</span>
                </div>
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
                    class="w-full bg-white rounded-lg border p-6 hover:border-blue-500 hover:shadow-md transition text-left"
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
