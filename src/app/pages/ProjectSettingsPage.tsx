import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, For, Show } from 'solid-js';
import { user } from '../auth';

interface Member {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  role: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
  accessControl: 'whitelist' | 'blacklist';
}

export default function ProjectSettingsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [project, setProject] = createSignal<Project | null>(null);
  const [members, setMembers] = createSignal<Member[]>([]);
  const [activeTab, setActiveTab] = createSignal<'approved' | 'pending' | 'rejected'>('approved');

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { projects: Project[] };
        const proj = data.projects.find((p: any) => p.name === params.id);
        if (proj) setProject(proj);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const loadMembers = async () => {
    if (!project()) return;
    
    try {
      const res = await fetch(`/api/projects/${project()!.id}/members`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { members: Member[] };
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleApprove = async (memberId: string, status: 'approved' | 'rejected') => {
    if (!project()) return;
    
    try {
      const res = await fetch(`/api/projects/${project()!.id}/members/${memberId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        loadMembers();
      }
    } catch (error) {
      console.error('Failed to update member:', error);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member?')) return;
    if (!project()) return;

    try {
      const res = await fetch(`/api/projects/${project()!.id}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        loadMembers();
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleAccessControlChange = async (accessControl: 'whitelist' | 'blacklist') => {
    if (!project()) return;
    
    try {
      const res = await fetch(`/api/projects/${project()!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessControl }),
      });

      if (res.ok) {
        loadProject();
      }
    } catch (error) {
      console.error('Failed to update access control:', error);
    }
  };

  const handleDeleteProject = async () => {
    if (!project()) return;
    if (!confirm('Delete this project? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/projects/${project()!.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        navigate('/dashboard');
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  onMount(() => {
    loadProject();
  });

  // Load members when project is loaded
  onMount(() => {
    const checkProject = setInterval(() => {
      if (project()) {
        loadMembers();
        clearInterval(checkProject);
      }
    }, 100);
  });

  const filteredMembers = () => members().filter(m => m.status === activeTab());

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center gap-3">
            <button
              onClick={() => navigate(`/projects/${params.id}`)}
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 class="text-xl font-semibold text-gray-900">Project Settings</h1>
              <div class="text-sm text-gray-500">{project()?.name}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Show when={project()}>
          {/* Access Control */}
          <div class="bg-white rounded-lg border p-6 mb-6">
            <h2 class="text-lg font-semibold mb-4">Access Control</h2>
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleAccessControlChange('whitelist')}
                class={`px-4 py-2.5 text-sm rounded-lg border transition ${
                  project()!.accessControl === 'whitelist' 
                    ? 'bg-gray-900 text-white border-gray-900' 
                    : 'bg-white hover:bg-gray-50 border-gray-300'
                }`}
              >
                <div class="font-medium">Whitelist</div>
                <div class="text-xs opacity-80">Approve users to join</div>
              </button>
              <button
                onClick={() => handleAccessControlChange('blacklist')}
                class={`px-4 py-2.5 text-sm rounded-lg border transition ${
                  project()!.accessControl === 'blacklist' 
                    ? 'bg-gray-900 text-white border-gray-900' 
                    : 'bg-white hover:bg-gray-50 border-gray-300'
                }`}
              >
                <div class="font-medium">Blacklist</div>
                <div class="text-xs opacity-80">Block specific users</div>
              </button>
            </div>
            <p class="text-sm text-gray-500 mt-3">
              {project()!.accessControl === 'whitelist' 
                ? 'Only approved users can access this project' 
                : 'All users can access except blocked ones'}
            </p>
          </div>

          {/* Members */}
          <div class="bg-white rounded-lg border p-6 mb-6">
            <h2 class="text-lg font-semibold mb-4">Members</h2>
            
            <div class="flex gap-2 mb-4 border-b">
              <button
                onClick={() => setActiveTab('approved')}
                class={`px-4 py-2 text-sm transition ${
                  activeTab() === 'approved' 
                    ? 'border-b-2 border-gray-900 font-medium text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Approved ({members().filter(m => m.status === 'approved').length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                class={`px-4 py-2 text-sm transition ${
                  activeTab() === 'pending' 
                    ? 'border-b-2 border-gray-900 font-medium text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending ({members().filter(m => m.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                class={`px-4 py-2 text-sm transition ${
                  activeTab() === 'rejected' 
                    ? 'border-b-2 border-gray-900 font-medium text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Rejected ({members().filter(m => m.status === 'rejected').length})
              </button>
            </div>

            <div class="space-y-2">
              <For each={filteredMembers()}>
                {(member) => (
                  <div class="rounded-lg border p-4 flex items-center justify-between hover:bg-gray-50">
                    <div class="flex items-center gap-3">
                      <img src={member.avatarUrl} alt={member.username} class="w-10 h-10 rounded-full" />
                      <div>
                        <div class="font-medium text-gray-900">{member.username}</div>
                        <div class="text-xs text-gray-500">{member.role}</div>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <Show when={member.status === 'pending'}>
                        <button
                          onClick={() => handleApprove(member.id, 'approved')}
                          class="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprove(member.id, 'rejected')}
                          class="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
                        >
                          Reject
                        </button>
                      </Show>
                      <Show when={member.status === 'approved'}>
                        <button
                          onClick={() => handleRemove(member.id)}
                          class="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Remove
                        </button>
                      </Show>
                      <Show when={member.status === 'rejected'}>
                        <button
                          onClick={() => handleApprove(member.id, 'approved')}
                          class="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          class="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Remove
                        </button>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
              <Show when={filteredMembers().length === 0}>
                <div class="text-center py-8 text-gray-400 text-sm">
                  No {activeTab()} members
                </div>
              </Show>
            </div>
          </div>

          {/* Danger Zone */}
          <div class="bg-white rounded-lg border border-red-200 p-6">
            <h2 class="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium text-gray-900">Delete Project</div>
                <div class="text-sm text-gray-500">This action cannot be undone</div>
              </div>
              <button
                onClick={handleDeleteProject}
                class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Project
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
