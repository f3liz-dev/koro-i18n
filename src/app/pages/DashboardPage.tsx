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
  const [showNewProjectModal, setShowNewProjectModal] = createSignal(false);
  const [newProjectName, setNewProjectName] = createSignal('');
  const [newProjectRepo, setNewProjectRepo] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

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

  const handleAddProject = async () => {
    if (isSubmitting()) return;

    // Frontend validation
    const nameExists = projects().some(p => p.name.toLowerCase() === newProjectName().toLowerCase());
    if (nameExists) {
      alert('Project name already exists');
      return;
    }

    const repoExists = projects().some(p => p.repository.toLowerCase() === newProjectRepo().toLowerCase());
    if (repoExists) {
      alert('Repository already registered');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Creating project:', { name: newProjectName(), repository: newProjectRepo() });
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newProjectName(),
          repository: newProjectRepo(),
        }),
      });

      console.log('Create project response:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Project created:', data);
        setNewProjectName('');
        setNewProjectRepo('');
        setShowNewProjectModal(false);
        loadProjects();
      } else {
        const data = await res.json() as { error?: string };
        console.error('Failed to create project:', data);
        alert(data.error || 'Failed to add project');
      }
    } catch (error) {
      console.error('Failed to add project:', error);
      alert('Failed to add project');
    } finally {
      setIsSubmitting(false);
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
            onClick={() => setShowNewProjectModal(true)}
            class="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            New Project
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

      {/* Add Project Modal */}
      {showNewProjectModal() && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setShowNewProjectModal(false)}>
          <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-xl font-semibold mb-4">Create New Project</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Repository</label>
                <input
                  type="text"
                  value={newProjectRepo()}
                  onInput={(e) => setNewProjectRepo(e.currentTarget.value)}
                  placeholder="owner/repo"
                  class="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p class="text-xs text-gray-500 mt-1.5">Format: owner/repo (e.g., facebook/react)</p>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  value={newProjectName()}
                  onInput={(e) => setNewProjectName(e.currentTarget.value)}
                  placeholder="My Project"
                  class="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div class="flex gap-3 pt-2">
                <button
                  onClick={handleAddProject}
                  disabled={!newProjectRepo() || !newProjectName() || isSubmitting()}
                  class="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isSubmitting() ? 'Creating...' : 'Create Project'}
                </button>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  class="px-4 py-2.5 border rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}