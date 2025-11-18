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

  const myProjectIds = () => (projects() || []).map(p => p.id);

  const availableProjects = () => (allProjects() || []).filter(p =>
    !myProjectIds().includes(p.id) && p.userId !== user()?.id
  );

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

  return (
    <div class="kawaii-page" style="min-height: 100vh;">
      <div class="kawaii-card" style="position: sticky; top: 0; z-index: 50; border-radius: 0; border-left: none; border-right: none; border-top: none; padding: 16px 24px; margin: 0;">
        <div class="kawaii-container" style="display: flex; align-items: center; gap: 12px; padding: 0;">
          <button
            onClick={() => navigate('/dashboard')}
            class="kawaii-ghost"
            style="padding: 8px; margin-left: -8px; border-radius: 8px; background: transparent; border: 1px dashed transparent; cursor: pointer; transition: var(--kawaii-transition); display: flex; align-items: center; justify-content: center;"
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--kawaii-accent)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <svg style="width: 20px; height: 20px; color: var(--kawaii-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 style="font-size: 20px; font-weight: 700; color: var(--kawaii-ink); margin: 0;">{t('joinProject.title')}</h1>
        </div>
      </div>

      <div class="kawaii-container animate-fade-in" style="max-width: 960px; padding-top: 48px;">
        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 32px; font-weight: 800; color: var(--kawaii-ink); margin-bottom: 8px;">{t('joinProject.heading')}</h2>
          <p style="color: var(--kawaii-muted); font-size: 14px;">{t('joinProject.description')}</p>
        </div>

        <Show when={!allProjects.loading && availableProjects().length === 0}>
          <div class="kawaii-card kawaii-empty-state">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div class="title">{t('joinProject.noProjectsAvailable')}</div>
            <div class="description">{t('joinProject.noProjectsDescription')}</div>
          </div>
        </Show>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          <For each={availableProjects()}>
            {(project) => (
              <div class="kawaii-card hover-lift transition-all">
                <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start; justify-content: space-between;">
                  <div style="flex: 1; width: 100%;">
                    <h3 style="font-size: 18px; font-weight: 700; color: var(--kawaii-ink); margin-bottom: 8px; transition: var(--kawaii-transition);" class="project-title">{project.name}</h3>
                    <code style="font-size: 11px; color: var(--kawaii-muted); background: var(--kawaii-surface); padding: 4px 8px; border-radius: 6px; display: inline-block;">{project.repository}</code>
                  </div>
                  <button
                    onClick={() => handleJoin(project.id)}
                    disabled={requestedProjects().has(project.id) || !!project.membershipStatus}
                    class="kawaii-btn"
                    style="width: 100%; justify-content: center;"
                    classList={{
                      primary: !requestedProjects().has(project.id) && !(project as any).membershipStatus,
                      secondary: requestedProjects().has(project.id) || !!(project as any).membershipStatus
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
          transition: var(--kawaii-transition);
        }
        .kawaii-card:hover .project-title {
          color: var(--kawaii-accent);
        }
      `}</style>
    </div>
  );
}
