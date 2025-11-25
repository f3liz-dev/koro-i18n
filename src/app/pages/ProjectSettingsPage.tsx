import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, For, Show, createResource } from 'solid-js';
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

export default function ProjectSettingsPage() {
  const navigate = useNavigate();
  const params = useParams();

  const project = () => (projects() || []).find((p: any) => p.name === params.projectName) || null;
  const projectName = () => project()?.name || params.projectName || '';

  const fetchMembersQuery = createFetchMembersQuery();
  const [membersKey, setMembersKey] = createSignal(0);
  const [members] = createResource(
    () => ({ projectName: projectName(), key: membersKey() }),
    async ({ projectName }) => {
      if (!projectName) return { members: [] };
      return fetchMembersQuery(projectName);
    }
  );

  const membersList = () => (members() as any)?.members || [];

  const [activeTab, setActiveTab] = createSignal<'approved' | 'pending' | 'rejected'>('approved');
  const [successMessage, setSuccessMessage] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal('');
  const [actionInProgress, setActionInProgress] = createSignal<string | null>(null);

  const handleApprove = async (memberId: string, status: 'approved' | 'rejected') => {
    const pid = projectName();
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
    const pid = projectName();
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
    const pid = projectName();
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
    const pid = projectName();
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

  const filteredMembers = () => (membersList() as Member[]).filter(m => m.status === activeTab());

  return (
    <div class="page animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '0.75rem',
        'margin-bottom': '2rem'
      }}>
        <button onClick={() => navigate(`/projects/${params.projectName}`)} class="btn ghost">
          ←
        </button>
        <div>
          <h1 style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>Project Settings</h1>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>{project()?.name}</div>
        </div>
      </div>

      <div style={{ 'max-width': '48rem' }}>
        <Show when={project()}>
          <Show when={successMessage()}>
            <div class="message success mb-4">{successMessage()}</div>
          </Show>

          <Show when={errorMessage()}>
            <div class="message error mb-4">{errorMessage()}</div>
          </Show>

          {/* Access Control */}
          <div class="card mb-4">
            <h2 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>Access Control</h2>
            <div style={{ display: 'flex', gap: '0.75rem', 'flex-wrap': 'wrap' }}>
              <button
                onClick={() => handleAccessControlChange('whitelist')}
                class={`btn ${project()!.accessControl === 'whitelist' ? 'selected' : ''}`}
              >
                <div>
                  <div style={{ 'font-weight': '500' }}>Whitelist</div>
                  <div style={{ 'font-size': '0.75rem', opacity: '0.8' }}>Approve users to join</div>
                </div>
              </button>
              <button
                onClick={() => handleAccessControlChange('blacklist')}
                class={`btn ${project()!.accessControl === 'blacklist' ? 'selected' : ''}`}
              >
                <div>
                  <div style={{ 'font-weight': '500' }}>Blacklist</div>
                  <div style={{ 'font-size': '0.75rem', opacity: '0.8' }}>Block specific users</div>
                </div>
              </button>
            </div>
            <p style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.75rem' }}>
              {project()!.accessControl === 'whitelist'
                ? 'Only approved users can access this project'
                : 'All users can access except blocked ones'}
            </p>
          </div>

          {/* Members */}
          <div class="card mb-4">
            <h2 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>Members</h2>

            <div style={{ display: 'flex', gap: '0.5rem', 'margin-bottom': '1rem', 'border-bottom': '1px solid var(--border)' }}>
              <button
                onClick={() => setActiveTab('approved')}
                style={{
                  padding: '0.5rem 1rem',
                  'font-size': '0.875rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  'border-bottom': activeTab() === 'approved' ? '2px solid var(--accent)' : '2px solid transparent',
                  color: activeTab() === 'approved' ? 'var(--text)' : 'var(--text-secondary)'
                }}
              >
                Approved ({(membersList() as Member[]).filter(m => m.status === 'approved').length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                style={{
                  padding: '0.5rem 1rem',
                  'font-size': '0.875rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  'border-bottom': activeTab() === 'pending' ? '2px solid var(--accent)' : '2px solid transparent',
                  color: activeTab() === 'pending' ? 'var(--text)' : 'var(--text-secondary)'
                }}
              >
                Pending ({(membersList() as Member[]).filter(m => m.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                style={{
                  padding: '0.5rem 1rem',
                  'font-size': '0.875rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  'border-bottom': activeTab() === 'rejected' ? '2px solid var(--accent)' : '2px solid transparent',
                  color: activeTab() === 'rejected' ? 'var(--text)' : 'var(--text-secondary)'
                }}
              >
                Rejected ({(membersList() as Member[]).filter(m => m.status === 'rejected').length})
              </button>
            </div>

            <div class="space-y-2">
              <For each={filteredMembers()}>
                {(member) => (
                  <div class="panel" style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                      <img src={member.avatarUrl} alt={member.username} style={{ width: '2.5rem', height: '2.5rem', 'border-radius': '50%' }} />
                      <div>
                        <div style={{ 'font-weight': '500' }}>{member.username}</div>
                        <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>{member.role}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Show when={member.status === 'pending'}>
                        <button
                          onClick={() => handleApprove(member.id, 'approved')}
                          disabled={actionInProgress() !== null}
                          class="btn success"
                        >
                          {actionInProgress() === member.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleApprove(member.id, 'rejected')}
                          disabled={actionInProgress() !== null}
                          class="btn ghost"
                        >
                          {actionInProgress() === member.id ? '...' : 'Reject'}
                        </button>
                      </Show>
                      <Show when={member.status === 'approved'}>
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={actionInProgress() !== null}
                          class="btn danger"
                        >
                          {actionInProgress() === member.id ? '...' : 'Remove'}
                        </button>
                      </Show>
                      <Show when={member.status === 'rejected'}>
                        <button
                          onClick={() => handleApprove(member.id, 'approved')}
                          disabled={actionInProgress() !== null}
                          class="btn ghost"
                        >
                          {actionInProgress() === member.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={actionInProgress() !== null}
                          class="btn danger"
                        >
                          {actionInProgress() === member.id ? '...' : 'Remove'}
                        </button>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
              <Show when={filteredMembers().length === 0}>
                <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                  No {activeTab()} members
                </div>
              </Show>
            </div>
          </div>

          {/* Danger Zone */}
          <div class="card" style={{ 'border-color': 'var(--danger-light)' }}>
            <h2 style={{ 'font-size': '1.125rem', 'font-weight': '600', color: 'var(--danger)', 'margin-bottom': '1rem' }}>Danger Zone</h2>
            <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
              <div>
                <div style={{ 'font-weight': '500' }}>Delete Project</div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>This action cannot be undone</div>
              </div>
              <button onClick={handleDeleteProject} class="btn danger">
                Delete Project
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
