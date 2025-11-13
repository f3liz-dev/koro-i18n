import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, For, Show } from 'solid-js';
import { user } from '../auth';
import { cachedFetch } from '../utils/cachedFetch';

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

export default function ProjectManagementPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [project, setProject] = createSignal<Project | null>(null);
  const [members, setMembers] = createSignal<Member[]>([]);
  const [activeTab, setActiveTab] = createSignal<'approved' | 'pending' | 'rejected'>('approved');

  const loadProject = async () => {
    try {
      // Try cache first for instant loading
      const res = await cachedFetch(`/api/projects`, { 
        credentials: 'include',
        tryCache: true,
      });
      if (res.ok) {
        const data = await res.json() as { projects: Project[] };
        const proj = data.projects.find((p: any) => p.id === params.id);
        if (proj) setProject(proj);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const loadMembers = async () => {
    try {
      // Try cache first (may be prefetched)
      const res = await cachedFetch(`/api/projects/${params.id}/members`, { 
        credentials: 'include',
        tryCache: true,
      });
      if (res.ok) {
        const data = await res.json() as { members: Member[] };
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleApprove = async (memberId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/projects/${params.id}/members/${memberId}/approve`, {
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

    try {
      const res = await fetch(`/api/projects/${params.id}/members/${memberId}`, {
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
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
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

  onMount(() => {
    loadProject();
    loadMembers();
  });

  const filteredMembers = () => members().filter(m => m.status === activeTab());

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
        <Show when={project()}>
          <div class="mb-8">
            <h1 class="text-2xl font-semibold mb-2">{project()!.name}</h1>
            <code class="text-sm text-gray-500">{project()!.repository}</code>
          </div>

          <div class="mb-8">
            <h2 class="text-lg font-semibold mb-4">Access Control</h2>
            <div class="flex gap-4">
              <button
                onClick={() => handleAccessControlChange('whitelist')}
                class={`px-4 py-2 text-sm border rounded ${
                  project()!.accessControl === 'whitelist' 
                    ? 'bg-gray-900 text-white' 
                    : 'hover:bg-gray-50'
                }`}
              >
                Whitelist (Approve to join)
              </button>
              <button
                onClick={() => handleAccessControlChange('blacklist')}
                class={`px-4 py-2 text-sm border rounded ${
                  project()!.accessControl === 'blacklist' 
                    ? 'bg-gray-900 text-white' 
                    : 'hover:bg-gray-50'
                }`}
              >
                Blacklist (Block specific users)
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              {project()!.accessControl === 'whitelist' 
                ? 'Only approved users can access this project' 
                : 'All users can access except blocked ones'}
            </p>
          </div>

          <div>
            <h2 class="text-lg font-semibold mb-4">Members</h2>
            
            <div class="flex gap-2 mb-4 border-b">
              <button
                onClick={() => setActiveTab('approved')}
                class={`px-4 py-2 text-sm ${
                  activeTab() === 'approved' 
                    ? 'border-b-2 border-gray-900 font-medium' 
                    : 'text-gray-500'
                }`}
              >
                Approved ({members().filter(m => m.status === 'approved').length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                class={`px-4 py-2 text-sm ${
                  activeTab() === 'pending' 
                    ? 'border-b-2 border-gray-900 font-medium' 
                    : 'text-gray-500'
                }`}
              >
                Pending ({members().filter(m => m.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                class={`px-4 py-2 text-sm ${
                  activeTab() === 'rejected' 
                    ? 'border-b-2 border-gray-900 font-medium' 
                    : 'text-gray-500'
                }`}
              >
                Rejected ({members().filter(m => m.status === 'rejected').length})
              </button>
            </div>

            <div class="space-y-2">
              <For each={filteredMembers()}>
                {(member) => (
                  <div class="border rounded-lg p-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <img src={member.avatarUrl} alt={member.username} class="w-10 h-10 rounded-full" />
                      <div>
                        <div class="font-medium">{member.username}</div>
                        <div class="text-xs text-gray-500">{member.role}</div>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <Show when={member.status === 'pending'}>
                        <button
                          onClick={() => handleApprove(member.id, 'approved')}
                          class="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprove(member.id, 'rejected')}
                          class="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                        >
                          Reject
                        </button>
                      </Show>
                      <Show when={member.status === 'approved'}>
                        <button
                          onClick={() => handleRemove(member.id)}
                          class="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded"
                        >
                          Remove
                        </button>
                      </Show>
                      <Show when={member.status === 'rejected'}>
                        <button
                          onClick={() => handleApprove(member.id, 'approved')}
                          class="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          class="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded"
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
        </Show>
      </div>
    </div>
  );
}
