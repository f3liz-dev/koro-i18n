import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal, For, onMount } from 'solid-js';
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
    try {
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects.map((p: any) => ({
          id: p.id,
          name: p.name,
          repository: p.repository,
          languages: [],
          progress: 0
        })));
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
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newProjectName(),
          repository: newProjectRepo(),
        }),
      });

      if (res.ok) {
        setNewProjectName('');
        setNewProjectRepo('');
        setShowNewProjectModal(false);
        loadProjects();
      } else {
        const data = await res.json();
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
    auth.refresh();
    loadProjects();
  });

  createEffect(() => {
    if (!user()) navigate('/login', { replace: true });
  });

  const handleLogout = async () => {
    await auth.logout();
  };

  return (
    <div class="min-h-screen bg-white">
      <div class="border-b">
        <div class="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button onClick={() => navigate('/')} class="text-lg font-semibold hover:text-gray-600">i18n</button>
            <span class="text-gray-300">/</span>
            <span class="text-sm text-gray-600">{user()?.username}</span>
          </div>
          <div class="flex items-center gap-1">
            <button
              onClick={() => navigate('/history')}
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded hover:bg-gray-50"
            >
              History
            </button>
            <button
              onClick={handleLogout}
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-8 py-16">
        <div>
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold">Projects</h2>
            <button
              onClick={() => setShowNewProjectModal(true)}
              class="px-4 py-2 text-sm border rounded hover:bg-gray-50"
            >
              Add Project
            </button>
          </div>
          {projects().length === 0 ? (
            <div class="border rounded-lg p-8 text-center">
              <p class="text-sm text-gray-400 mb-2">No projects registered</p>
              <p class="text-xs text-gray-400">Add a project to allow uploads from GitHub Actions</p>
            </div>
          ) : (
            <div class="space-y-3">
              <For each={projects()}>
                {(project) => (
                  <div class="border rounded-lg p-6 hover:border-gray-400 transition">
                    <div class="flex items-start justify-between mb-4">
                      <div>
                        <h3 class="font-medium text-gray-900 mb-1.5">{project.name}</h3>
                        <code class="text-xs text-gray-500">{project.repository}</code>
                      </div>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        class="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        Remove
                      </button>
                    </div>
                    <div class="flex gap-2">
                      <For each={project.languages}>
                        {(lang) => (
                          <button
                            onClick={() => navigate(`/projects/${project.id}/translate/${lang}`)}
                            class="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                          >
                            {lang}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      {showNewProjectModal() && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowNewProjectModal(false)}>
          <div class="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-semibold mb-4">Add Project</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Repository</label>
                <input
                  type="text"
                  value={newProjectRepo()}
                  onInput={(e) => setNewProjectRepo(e.currentTarget.value)}
                  placeholder="owner/repo"
                  class="w-full px-3 py-2 border rounded text-sm"
                />
                <p class="text-xs text-gray-500 mt-1">Format: owner/repo (e.g., facebook/react)</p>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newProjectName()}
                  onInput={(e) => setNewProjectName(e.currentTarget.value)}
                  placeholder="My Project"
                  class="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div class="flex gap-2">
                <button
                  onClick={handleAddProject}
                  disabled={!newProjectRepo() || !newProjectName() || isSubmitting()}
                  class="flex-1 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isSubmitting() ? 'Adding...' : 'Add'}
                </button>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  class="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
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