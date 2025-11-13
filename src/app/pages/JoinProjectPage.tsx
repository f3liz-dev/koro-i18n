import { useNavigate } from '@solidjs/router';
import { createSignal, onMount, For, Show } from 'solid-js';
import { user } from '../auth';
import { useForesight } from '../utils/useForesight';
import { projectsCache } from '../utils/dataStore';
import { authFetch } from '../utils/authFetch';

interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
  createdAt: string;
}

export default function JoinProjectPage() {
  const navigate = useNavigate();
  const [allProjects, setAllProjects] = createSignal<Project[]>([]);
  const [requestedProjects, setRequestedProjects] = createSignal<Set<string>>(new Set());

  // Get my projects from store
  const projectsStore = projectsCache.get();
  const myProjects = () => projectsStore.projects.map(p => p.id);

  // ForesightJS refs
  const backButtonRef = useForesight({
    prefetchUrls: ['/api/projects'],
    debugName: 'back-to-dashboard',
  });

  const loadAllProjects = async () => {
    try {
      const res = await authFetch('/api/projects/all', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { projects: Project[] };
        setAllProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to load all projects:', error);
    }
  };

  const handleJoin = async (projectId: string) => {
    try {
      const res = await authFetch(`/api/projects/${projectId}/join`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        setRequestedProjects(prev => new Set([...prev, projectId]));
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || 'Failed to join project');
      }
    } catch (error) {
      console.error('Failed to join project:', error);
      alert('Failed to join project');
    }
  };

  onMount(() => {
    // Fetch my projects in background
    projectsCache.fetch();
    // Fetch all available projects
    loadAllProjects();
  });

  const availableProjects = () => allProjects().filter(p => 
    !myProjects().includes(p.id) && p.userId !== user()?.id
  );

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center gap-3">
            <button
              ref={backButtonRef}
              onClick={() => navigate('/dashboard')}
              class="text-gray-400 hover:text-gray-600 active:text-gray-700 transition"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 class="text-xl font-semibold text-gray-900">Join a Project</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Show when={availableProjects().length === 0}>
          <div class="bg-white rounded-lg border p-12 text-center">
            <div class="text-gray-400 mb-2">No projects available</div>
            <div class="text-sm text-gray-400">All projects have been joined or there are no public projects</div>
          </div>
        </Show>

        <div class="space-y-3">
          <For each={availableProjects()}>
            {(project) => (
              <div class="bg-white rounded-lg border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-gray-300 active:scale-[0.98] transition">
                <div>
                  <h3 class="font-medium text-gray-900 mb-1">{project.name}</h3>
                  <code class="text-xs text-gray-500">{project.repository}</code>
                </div>
                <button
                  onClick={() => handleJoin(project.id)}
                  disabled={requestedProjects().has(project.id)}
                  class="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 transition"
                >
                  {requestedProjects().has(project.id) ? 'Request Sent' : 'Request to Join'}
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
