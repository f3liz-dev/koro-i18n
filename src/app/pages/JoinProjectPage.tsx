import { useNavigate } from '@solidjs/router';
import { createSignal, For, Show, createResource } from 'solid-js';
import { user } from '../auth';
import { projects, createFetchAllProjectsQuery } from '../utils/store';
import { authFetch } from '../utils/authFetch';
import { useI18n } from '../utils/i18n';

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
  const { t } = useI18n();
  const [requestedProjects, setRequestedProjects] = createSignal<Set<string>>(new Set());

  const fetchAllProjectsQuery = createFetchAllProjectsQuery();

  const [allProjects] = createResource(async () => fetchAllProjectsQuery());

  const myProjectNames = () => (projects() || []).map(p => p.name);

  const availableProjects = () => (allProjects() || []).filter(p =>
    !myProjectNames().includes(p.name) && p.userId !== user()?.id
  );

  const handleJoin = async (projectName: string) => {
    try {
      const res = await authFetch(`/api/projects/${projectName}/join`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        setRequestedProjects(prev => new Set([...prev, projectName]));
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || 'Failed to join project');
      }
    } catch (error) {
      console.error('Failed to join project:', error);
      alert('Failed to join project');
    }
  };

  return (
    <div class="page animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '0.75rem',
        'margin-bottom': '2rem'
      }}>
        <button onClick={() => navigate('/dashboard')} class="btn ghost">
          ←
        </button>
        <h1 style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
          {t('joinProject.title') || 'Join Project'}
        </h1>
      </div>

      <div style={{ 'max-width': '48rem' }}>
        <div style={{ 'margin-bottom': '2rem' }}>
          <h2 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
            {t('joinProject.heading') || 'Available Projects'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', 'font-size': '0.875rem' }}>
            {t('joinProject.description') || 'Request to join a project to contribute translations.'}
          </p>
        </div>

        <Show when={!allProjects.loading && availableProjects().length === 0}>
          <div class="card empty-state">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div class="title">{t('joinProject.noProjectsAvailable') || 'No projects available'}</div>
            <div class="description">{t('joinProject.noProjectsDescription') || 'There are no projects available to join at the moment.'}</div>
          </div>
        </Show>

        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
          <For each={availableProjects()}>
            {(project) => (
              <div class="card hover-lift transition-all">
                <div style={{ display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '1rem' }}>
                  <div style={{ flex: '1' }}>
                    <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '0.375rem' }}>
                      {project.name}
                    </h3>
                    <code class="code-chip" style={{ 'font-size': '0.75rem' }}>
                      {project.repository}
                    </code>
                  </div>
                  <button
                    onClick={() => handleJoin(project.name)}
                    disabled={requestedProjects().has(project.name) || !!project.membershipStatus}
                    class={`btn ${!requestedProjects().has(project.name) && !project.membershipStatus ? 'primary' : ''}`}
                  >
                    {requestedProjects().has(project.id) || (project as any).membershipStatus === 'pending' 
                      ? (t('joinProject.requestSent') || 'Request Sent')
                      : (project as any).membershipStatus === 'approved' 
                        ? (t('joinProject.alreadyMember') || 'Already Member')
                        : (project as any).membershipStatus === 'rejected' 
                          ? (t('joinProject.requestRejected') || 'Request Rejected')
                          : (t('joinProject.requestToJoin') || 'Request to Join')}
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
