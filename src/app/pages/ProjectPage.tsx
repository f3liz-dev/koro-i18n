import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, For, Show } from 'solid-js';
import { user, auth } from '../auth';

interface FileGroup {
  filename: string;
  languages: string[];
  keyCount: number;
}

interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
}

export default function ProjectPage() {
  const navigate = useNavigate();
  const params = useParams();
  
  const [project, setProject] = createSignal<Project | null>(null);
  const [fileGroups, setFileGroups] = createSignal<FileGroup[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isOwner, setIsOwner] = createSignal(false);

  const loadProject = async () => {
    try {
      const res = await fetch('/api/projects', { credentials: 'include' });
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
      const res = await fetch(`/api/projects/${params.id}/files`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json() as { files: any[] };
        
        // Group files by filename
        const fileMap = new Map<string, FileGroup>();
        
        for (const file of data.files) {
          if (!fileMap.has(file.filename)) {
            fileMap.set(file.filename, {
              filename: file.filename,
              languages: [],
              keyCount: Object.keys(file.contents || {}).length
            });
          }
          
          const group = fileMap.get(file.filename)!;
          if (!group.languages.includes(file.lang)) {
            group.languages.push(file.lang);
          }
        }
        
        setFileGroups(Array.from(fileMap.values()));
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
    loadFiles();
  });

  const handleLogout = async () => {
    await auth.logout();
  };

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <button
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
                  onClick={() => navigate(`/projects/${params.id}/settings`)}
                  class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                >
                  Settings
                </button>
              </Show>
              <button
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
        <Show when={isLoading()}>
          <div class="text-center py-12">
            <div class="text-gray-400">Loading files...</div>
          </div>
        </Show>

        <Show when={!isLoading() && fileGroups().length === 0}>
          <div class="bg-white rounded-lg border p-12 text-center">
            <div class="text-gray-400 mb-2">No translation files yet</div>
            <div class="text-sm text-gray-400">Upload files using GitHub Actions to get started</div>
          </div>
        </Show>

        <Show when={!isLoading() && fileGroups().length > 0}>
          <div class="space-y-3">
            <For each={fileGroups()}>
              {(fileGroup) => (
                <div class="bg-white rounded-lg border p-6 hover:border-gray-300 transition">
                  <div class="mb-4">
                    <h3 class="font-medium text-gray-900 mb-1">{fileGroup.filename}</h3>
                    <div class="text-sm text-gray-500">{fileGroup.keyCount} keys</div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <For each={fileGroup.languages}>
                      {(lang) => (
                        <button
                          onClick={() => navigate(`/projects/${params.id}/translate/${lang}/${encodeURIComponent(fileGroup.filename)}`)}
                          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200"
                        >
                          {lang.toUpperCase()}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
