import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { user, auth } from '../auth';

interface Project {
  id: string;
  name: string;
  repository: string;
  languages: string[];
  progress: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = createSignal<Project[]>([]);

  const loadProjects = async () => {
    console.log('loadProjects called');
    try {
      console.log('Fetching projects...');
      const res = await fetch('/api/projects', { credentials: 'include' });
      console.log('Projects response:', res.status);
      if (res.ok) {
        const data = await res.json() as { projects: any[] };
        console.log('Projects data:', data);
        console.log('Number of projects:', data.projects.length);
        
        // Load languages for each project
        const projectsWithLanguages = await Promise.all(
          data.projects.map(async (p: any) => {
            try {
              // Use project name for file queries (API will look up repository)
              const filesRes = await fetch(`/api/projects/${p.name}/files`, {
                credentials: 'include'
              });
              console.log(`Files API response for ${p.name}:`, filesRes.status);
              if (filesRes.ok) {
                const filesData = await filesRes.json() as { files: any[] };
                console.log(`Files for ${p.name}:`, filesData.files);
                const languages = [...new Set(filesData.files.map((f: any) => f.lang))] as string[];
                console.log(`Languages for ${p.name}:`, languages);
                return {
                  id: p.id,
                  name: p.name,
                  repository: p.repository,
                  languages,
                  progress: 0
                };
              } else {
                const errorText = await filesRes.text();
                console.error(`Failed to load files for ${p.name}:`, filesRes.status, errorText);
              }
            } catch (err) {
              console.error(`Failed to load files for ${p.name}:`, err);
            }
            return {
              id: p.id,
              name: p.name,
              repository: p.repository,
              languages: [],
              progress: 0
            };
          })
        );
        
        setProjects(projectsWithLanguages);
      } else {
        const errorData = await res.json();
        console.error('Failed to load projects:', res.status, errorData);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  onMount(() => {
    console.log('DashboardPage mounted');
    console.log('Current user:', user());
    auth.refresh();
    loadProjects();
  });

  createEffect(() => {
    if (!user()) navigate('/login', { replace: true });
  });

  const handleLogout = async () => {
    await auth.logout();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        loadProjects();
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <button onClick={() => navigate('/')} class="text-xl font-semibold text-gray-900 hover:text-gray-600">
                koro-i18n
              </button>
              <span class="text-gray-300">/</span>
              <span class="text-sm text-gray-600">{user()?.username}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                onClick={() => navigate('/projects/create')}
                class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                Create Project
              </button>
              <button
                onClick={() => navigate('/projects/join')}
                class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                Join Project
              </button>
              <button
                onClick={() => navigate('/history')}
                class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                History
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
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-semibold text-gray-900">Projects</h2>
          <button
            onClick={() => navigate('/projects/create')}
            class="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Create Project
          </button>
        </div>
        
        {projects().length === 0 ? (
          <div class="bg-white rounded-lg border p-12 text-center">
            <div class="text-gray-400 mb-2">No projects yet</div>
            <div class="text-sm text-gray-400">Create a project to get started with translations</div>
          </div>
        ) : (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={projects()}>
              {(project) => (
                <button
                  onClick={() => navigate(`/projects/${project.name}`)}
                  class="bg-white rounded-lg border p-6 hover:border-gray-300 hover:shadow-sm transition text-left"
                >
                  <div class="mb-4">
                    <h3 class="font-semibold text-gray-900 mb-1">{project.name}</h3>
                    <code class="text-xs text-gray-500">{project.repository}</code>
                  </div>
                  <Show when={project.languages.length > 0} fallback={
                    <div class="text-xs text-gray-400 italic">No files uploaded yet</div>
                  }>
                    <div class="flex flex-wrap gap-2">
                      <For each={project.languages.slice(0, 4)}>
                        {(lang) => (
                          <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {lang.toUpperCase()}
                          </span>
                        )}
                      </For>
                      <Show when={project.languages.length > 4}>
                        <span class="px-2 py-1 text-xs font-medium text-gray-500">
                          +{project.languages.length - 4}
                        </span>
                      </Show>
                    </div>
                  </Show>
                </button>
              )}
            </For>
          </div>
        )}
      </div>
    </div>
  );
}