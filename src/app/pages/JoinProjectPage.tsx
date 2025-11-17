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
  membershipStatus?: string | null;
}

export default function JoinProjectPage() {
  const navigate = useNavigate();
  const [allProjects, setAllProjects] = createSignal<Project[]>([]);
  const [requestedProjects, setRequestedProjects] = createSignal<Set<string>>(new Set());

  const projectsStore = projectsCache.get();
  const myProjects = () => projectsStore.projects.map(p => p.id);

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
    projectsCache.fetch(false);
    loadAllProjects();
  });

  const availableProjects = () => allProjects().filter(p => 
    !myProjects().includes(p.id) && p.userId !== user()?.id
  );

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30">
      <div class="bg-white border-b border-gray-200 backdrop-blur-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center gap-3">
            <button
              ref={backButtonRef}
              onClick={() => navigate('/dashboard')}
              class="text-gray-400 hover:text-primary-600 transition-colors p-2 -ml-2 rounded-lg hover:bg-primary-50"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900">Join a Project</h1>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        <div class="mb-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-2">Available Projects</h2>
          <p class="text-gray-600">Request to join a project to start contributing translations</p>
        </div>

        <Show when={availableProjects().length === 0}>
          <div class="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div class="text-xl font-semibold text-gray-900 mb-2">No projects available</div>
            <div class="text-gray-500">All projects have been joined or there are no public projects</div>
          </div>
        </Show>

        <div class="space-y-4">
          <For each={availableProjects()}>
            {(project) => (
              <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all group">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{project.name}</h3>
                    <code class="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">{project.repository}</code>
                  </div>
                  <button
                    onClick={() => handleJoin(project.id)}
                    disabled={requestedProjects().has(project.id) || !!project.membershipStatus}
                    class="px-6 py-3 text-sm font-semibold border-2 border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:border-gray-200 disabled:hover:text-gray-700 transition-all whitespace-nowrap"
                  >
                    {requestedProjects().has(project.id) || project.membershipStatus === 'pending' ? '✓ Request Sent' : 
                     project.membershipStatus === 'approved' ? '✓ Already Member' :
                     project.membershipStatus === 'rejected' ? '✗ Request Rejected' :
                     'Request to Join'}
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
