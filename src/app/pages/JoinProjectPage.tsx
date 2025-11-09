import { useNavigate } from '@solidjs/router';
import { createSignal, onMount, For } from 'solid-js';
import { user } from '../auth';

interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
  createdAt: string;
}

export default function JoinProjectPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = createSignal<Project[]>([]);
  const [myProjects, setMyProjects] = createSignal<string[]>([]);
  const [requestedProjects, setRequestedProjects] = createSignal<Set<string>>(new Set());

  const loadProjects = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        fetch('/api/projects/all', { credentials: 'include' }),
        fetch('/api/projects', { credentials: 'include' })
      ]);

      if (allRes.ok && myRes.ok) {
        const allData = await allRes.json() as { projects: Project[] };
        const myData = await myRes.json() as { projects: any[] };
        
        setProjects(allData.projects);
        setMyProjects(myData.projects.map((p: any) => p.id));
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleJoin = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/join`, {
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
    loadProjects();
  });

  const availableProjects = () => projects().filter(p => 
    !myProjects().includes(p.id) && p.userId !== user()?.id
  );

  return (
    <div class="min-h-screen bg-white">
      <div class="border-b">
        <div class="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} class="text-lg font-semibold hover:text-gray-600">
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-8 py-16">
        <h1 class="text-2xl font-semibold mb-8">Join a Project</h1>

        <div class="space-y-3">
          <For each={availableProjects()}>
            {(project) => (
              <div class="border rounded-lg p-6 flex items-start justify-between">
                <div>
                  <h3 class="font-medium text-gray-900 mb-1.5">{project.name}</h3>
                  <code class="text-xs text-gray-500">{project.repository}</code>
                </div>
                <button
                  onClick={() => handleJoin(project.id)}
                  disabled={requestedProjects().has(project.id)}
                  class="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requestedProjects().has(project.id) ? 'Requested' : 'Request to Join'}
                </button>
              </div>
            )}
          </For>
          {availableProjects().length === 0 && (
            <div class="border rounded-lg p-8 text-center">
              <p class="text-sm text-gray-400">No projects available to join</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
