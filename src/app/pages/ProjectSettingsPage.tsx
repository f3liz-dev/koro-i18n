import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, For, Show, createResource } from 'solid-js';
import { projects, createFetchMembersQuery, refreshProjects } from '../utils/store';
import { authFetch } from '../utils/authFetch';

interface Member {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  role: string;
  createdAt: string;
}

// Project type is available via store's Project interface; this local type removed

export default function ProjectSettingsPage() {
  const navigate = useNavigate();
  const params = useParams();

  const project = () => (projects() || []).find((p: any) => p.name === params.projectName) || null;
  const projectId = () => project()?.id || params.projectName || '';

  const fetchMembersQuery = createFetchMembersQuery();
  const [membersKey, setMembersKey] = createSignal(0);
  const [members] = createResource(
    () => ({ projectId: projectId(), key: membersKey() }),
    async ({ projectId }) => {
      if (!projectId) return { members: [] };
      return fetchMembersQuery(projectId);
    }
  );

  const membersList = () => (members() as any)?.members || [];

  const [activeTab, setActiveTab] = createSignal<'approved' | 'pending' | 'rejected'>('approved');
  const [successMessage, setSuccessMessage] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal('');
  const [actionInProgress, setActionInProgress] = createSignal<string | null>(null);


  const handleApprove = async (memberId: string, status: 'approved' | 'rejected') => {
    const pid = projectId();
    if (!pid) return;

    setActionInProgress(memberId);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await authFetch(`/api/projects/${pid}/members/${memberId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setMembersKey(k => k + 1);
        setSuccessMessage(`Member ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json() as { error?: string };
        setErrorMessage(data.error || 'Failed to update member');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to update member:', error);
      setErrorMessage('Failed to update member');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member?')) return;
    const pid = projectId();
    if (!pid) return;

    setActionInProgress(memberId);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await authFetch(`/api/projects/${pid}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMembersKey(k => k + 1);
        setSuccessMessage('Member removed successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json() as { error?: string };
        setErrorMessage(data.error || 'Failed to remove member');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      setErrorMessage('Failed to remove member');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAccessControlChange = async (accessControl: 'whitelist' | 'blacklist') => {
    const pid = projectId();
    if (!pid) return;

    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await authFetch(`/api/projects/${pid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessControl }),
      });

      if (res.ok) {
        refreshProjects();
        setSuccessMessage('Access control updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json() as { error?: string };
        setErrorMessage(data.error || 'Failed to update access control');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to update access control:', error);
      setErrorMessage('Failed to update access control');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleDeleteProject = async () => {
    const pid = projectId();
    if (!pid) return;
    if (!confirm('Delete this project? This cannot be undone.')) return;

    try {
      const res = await authFetch(`/api/projects/${pid}`, {
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
    // Resources will auto-fetch
  });

  const filteredMembers = () => (membersList() as Member[]).filter(m => m.status === activeTab());

  return (
    <div class="page min-h-screen">
      {/* Header */}
  <div class="kawaii-header border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center gap-3">

            <button

              onClick={() => navigate(`/projects/${params.projectName}`)}
              class="kawaii-ghost"
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
          <Show when={successMessage()}>
            <div class="mb-6">
              <div class="message success">{successMessage()}</div>
            </div>
          </Show>

          <Show when={errorMessage()}>
            <div class="mb-6">
              <div class="message error">{errorMessage()}</div>
            </div>
          </Show>

          {/* Access Control */}
          <div class="card mb-6">
            <h2 class="text-lg font-semibold mb-4">Access Control</h2>
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleAccessControlChange('whitelist')}
                class={`btn ${project()!.accessControl === 'whitelist' ? 'selected' : 'kawaii-ghost'}`}
              >
                <div class="font-medium">Whitelist</div>
                <div class="text-xs opacity-80">Approve users to join</div>
              </button>
              <button
                onClick={() => handleAccessControlChange('blacklist')}
                class={`btn ${project()!.accessControl === 'blacklist' ? 'selected' : 'kawaii-ghost'}`}
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
          <div class="card mb-6">
            <h2 class="text-lg font-semibold mb-4">Members</h2>

            <div class="flex gap-2 mb-4 border-b">
              <button
                onClick={() => setActiveTab('approved')}
                class={`px-4 py-2 text-sm transition ${activeTab() === 'approved'
                  ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 active:text-gray-800'
                  }`}
              >
                Approved ({(membersList() as Member[]).filter(m => m.status === 'approved').length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                class={`px-4 py-2 text-sm transition ${activeTab() === 'pending'
                  ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 active:text-gray-800'
                  }`}
              >
                Pending ({(membersList() as Member[]).filter(m => m.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                class={`px-4 py-2 text-sm transition ${activeTab() === 'rejected'
                  ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 active:text-gray-800'
                  }`}
              >
                Rejected ({(membersList() as Member[]).filter(m => m.status === 'rejected').length})
              </button>
            </div>

            <div class="space-y-2">
              <For each={filteredMembers()}>
                {(member) => (
                  <div class="card sm flex items-center justify-between hover-lift">
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
                          disabled={actionInProgress() !== null}
                          class="btn success"
                        >
                          {actionInProgress() === member.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleApprove(member.id, 'rejected')}
                          disabled={actionInProgress() !== null}
                          class="btn kawaii-ghost"
                        >
                          {actionInProgress() === member.id ? 'Processing...' : 'Reject'}
                        </button>
                      </Show>
                      <Show when={member.status === 'approved'}>
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={actionInProgress() !== null}
                          class="btn danger"
                        >
                          {actionInProgress() === member.id ? 'Removing...' : 'Remove'}
                        </button>
                      </Show>
                      <Show when={member.status === 'rejected'}>
                        <button
                          onClick={() => handleApprove(member.id, 'approved')}
                          disabled={actionInProgress() !== null}
                          class="btn kawaii-ghost"
                        >
                          {actionInProgress() === member.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={actionInProgress() !== null}
                          class="btn danger"
                        >
                          {actionInProgress() === member.id ? 'Removing...' : 'Remove'}
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
          <div class="card">
            <h2 class="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium text-gray-900">Delete Project</div>
                <div class="text-sm text-gray-500">This action cannot be undone</div>
              </div>
              <button
                onClick={handleDeleteProject}
                class="btn danger"
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
