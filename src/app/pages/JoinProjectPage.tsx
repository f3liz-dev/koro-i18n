import { useNavigate } from '@solidjs/router';
import { createSignal, onMount, For, Show, createResource } from 'solid-js';
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
    <div class="page" style="min-height: 100vh;">
      <div class="card" style="
        position: sticky;
        top: 0;
        z-index: 50;
        border-radius: 0;
        border-left: none;
        border-right: none;
        border-top: none;
        padding: 1rem 1.5rem;
        margin: 0;
      ">
        <div class="container" style="display: flex; align-items: center; gap: 0.75rem; padding: 0;">
          <button
            onClick={() => navigate('/dashboard')}
            class="btn"
            style="padding: 0.625rem; margin-left: -0.625rem; background: none; border: none; box-shadow: none;"
          >
            <svg style="width: 1.25rem; height: 1.25rem; color: var(--color-text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 style="font-size: 1.25rem; font-weight: 600; color: var(--color-text-primary); margin: 0;">{t('joinProject.title')}</h1>
        </div>
      </div>

      <div class="container animate-fade-in" style="max-width: 60rem; padding-top: 3rem;">
        <div style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.875rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.625rem;">{t('joinProject.heading')}</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.875rem; line-height: 1.6;">{t('joinProject.description')}</p>
        </div>

        <Show when={!allProjects.loading && availableProjects().length === 0}>
          <div class="card empty-state">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div class="title">{t('joinProject.noProjectsAvailable')}</div>
            <div class="description">{t('joinProject.noProjectsDescription')}</div>
          </div>
        </Show>

        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <For each={availableProjects()}>
            {(project) => (
              <div class="card hover-lift transition-all">
                <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start; justify-content: space-between;">
                  <div style="flex: 1; width: 100%;">
                    <h3 class="project-title" style="
                      font-size: 1.125rem;
                      font-weight: 600;
                      color: var(--color-text-primary);
                      margin-bottom: 0.625rem;
                      transition: var(--transition);
                    ">{project.name}</h3>
                    <code style="
                      font-size: 0.75rem;
                      color: var(--color-text-secondary);
                      background: var(--color-cream);
                      padding: 0.375rem 0.625rem;
                      border-radius: var(--radius);
                      display: inline-block;
                      border: var(--border);
                    ">{project.repository}</code>
                  </div>
                  <button
                    onClick={() => handleJoin(project.name)}
                    disabled={requestedProjects().has(project.name) || !!project.membershipStatus}
                    class="btn"
                    style="width: 100%; justify-content: center; border-radius: var(--radius);"
                    classList={{
                      primary: !requestedProjects().has(project.name) && !(project as any).membershipStatus
                    }}
                  >
                    {requestedProjects().has(project.id) || (project as any).membershipStatus === 'pending' ? t('joinProject.requestSent') :
                      (project as any).membershipStatus === 'approved' ? t('joinProject.alreadyMember') :
                        (project as any).membershipStatus === 'rejected' ? t('joinProject.requestRejected') :
                          t('joinProject.requestToJoin')}
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
      
      <style>{`
        .project-title {
          transition: var(--transition);
        }
        .card:hover .project-title {
          color: var(--color-accent-peach);
        }
      `}</style>
    </div>
  );
}
