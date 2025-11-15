import { useNavigate } from '@solidjs/router';
import { createEffect, For, onMount, Show } from 'solid-js';
import { user, auth } from '../auth';
import { prefetchForRoute } from '../utils/prefetch';
import { useForesight } from '../utils/useForesight';
import { SkeletonCard } from '../components/Skeleton';
import { projectsCache } from '../utils/dataStore';
import { authFetch } from '../utils/authFetch';
import PageHeader, { MenuItem } from '../components/PageHeader';

interface Project {
  id: string;
  name: string;
  repository: string;
  languages: string[];
  progress: number;
  userId: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  // ForesightJS refs for navigation buttons
  const homeButtonRef = useForesight({ prefetchUrls: ['/api/user'], debugName: 'home-button' });
  const createProjectButtonRef = useForesight({ prefetchUrls: [], debugName: 'create-project-button' });
  const joinProjectButtonRef = useForesight({ prefetchUrls: [], debugName: 'join-project-button' });
  const historyButtonRef = useForesight({ prefetchUrls: ['/api/history'], debugName: 'history-button' });

  // Get projects from store - returns cached data immediately or empty array
  const store = projectsCache.get();
  const projects = () => store.projects.map((p: any) => ({
    id: p.id,
    name: p.name,
    repository: p.repository,
    languages: p.languages || [],
    progress: 0,
    userId: p.userId
  }));
  
  // Check if we have cached data - show skeleton only if no cache exists
  const isLoading = () => !store.lastFetch;

  onMount(() => {
    console.log('DashboardPage mounted');
    console.log('Current user:', user());
    auth.refresh();
    // Use smart prefetch for dashboard route
    void prefetchForRoute('dashboard');
    
    // Fetch projects with languages (needed for dashboard display)
    // Always force fresh fetch to ensure joined projects appear after navigation
    projectsCache.fetch(true, true);
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
      const res = await authFetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        // Refetch projects with languages to update the store
        projectsCache.fetch(true);
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const menuItems: MenuItem[] = [
    {
      label: 'Create Project',
      onClick: () => navigate('/projects/create'),
      ref: createProjectButtonRef,
    },
    {
      label: 'Join Project',
      onClick: () => navigate('/projects/join'),
      ref: joinProjectButtonRef,
    },
    {
      label: 'History',
      onClick: () => navigate('/history'),
      ref: historyButtonRef,
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
        title="koro-i18n"
        subtitle={`<span class="text-gray-300">/</span> <span class="text-sm text-gray-600">${user()?.username}</span>`}
        logo={true}
        menuItems={menuItems}
      />

      {/* Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-semibold text-gray-900">Projects</h2>
          <button
            ref={createProjectButtonRef}
            onClick={() => navigate('/projects/create')}
            class="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:bg-gray-950 active:scale-[0.98] transition"
          >
            Create Project
          </button>
        </div>
        
        <Show when={isLoading()}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </Show>

        <Show when={!isLoading() && projects().length === 0}>
          <div class="bg-white rounded-lg border p-12 text-center">
            <div class="text-gray-400 mb-2">No projects yet</div>
            <div class="text-sm text-gray-400">Create a project to get started with translations</div>
          </div>
        </Show>

        <Show when={!isLoading() && projects().length > 0}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={projects()}>
              {(project) => {
                const projectCardRef = useForesight({
                  prefetchUrls: [`/api/projects/${project.name}/files/summary`],
                  debugName: `project-card-${project.name}`,
                  hitSlop: 10,
                });
                
                const isOwner = () => project.userId === user()?.id;

                return (
                   <div class="bg-white rounded-lg border p-6 hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition">
                    <button
                      ref={projectCardRef}
                      onClick={() => navigate(`/projects/${project.name}`)}
                      class="w-full text-left mb-4"
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
                    <Show when={isOwner()}>
                      <button
                        onClick={() => navigate(`/projects/${project.name}/settings`)}
                        class="w-full px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition"
                      >
                        Manage Project
                      </button>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}