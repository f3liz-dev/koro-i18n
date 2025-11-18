import { useNavigate } from '@solidjs/router';
import { createEffect, For, Show } from 'solid-js';
import { user, auth } from '../auth';
import { SkeletonCard, LanguageSelector } from '../components';
import { projects, refreshProjects } from '../utils/store';
import { authFetch } from '../utils/authFetch';
import { PageHeader } from '../components';
import type { MenuItem } from '../components';
import { useI18n } from '../utils/i18n';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  createEffect(() => {
    if (!user()) navigate('/login', { replace: true });
  });

  refreshProjects();

  const handleLogout = async () => {
    await auth.logout();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm(t('dashboard.deleteConfirm'))) return;

    try {
      const res = await authFetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        refreshProjects();
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const menuItems: MenuItem[] = [
    {
      label: t('dashboard.createProject'),
      onClick: () => navigate('/projects/create'),
    },
    {
      label: t('dashboard.joinProject'),
      onClick: () => navigate('/projects/join'),
    },
    {
      label: t('dashboard.history'),
      onClick: () => navigate('/history'),
    },
    {
      label: t('common.logout'),
      onClick: handleLogout,
    },
  ];

  return (
    <div class="kawaii-page" style="min-height: 100vh;">
      <PageHeader
        title={t('common.appName')}
        subtitle={`<span style="color: var(--kawaii-muted);">/</span> <span style="font-size: 13px; color: var(--kawaii-muted);">${user()?.username}</span>`}
        logo={true}
        menuItems={menuItems}
      />

      <div class="kawaii-container animate-fade-in">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px;">
          <div>
            <h2 style="font-size: 32px; font-weight: 800; color: var(--kawaii-ink); margin-bottom: 4px;">{t('dashboard.title')}</h2>
            <p style="color: var(--kawaii-muted); font-size: 14px;">{t('dashboard.subtitle')}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <LanguageSelector />
            <button
              onClick={() => navigate('/projects/create')}
              class="kawaii-btn primary"
            >
              {t('dashboard.newProject')}
            </button>
          </div>
        </div>
        
        <Show when={projects.loading}>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </Show>

        <Show when={!projects.loading && (projects() || []).length === 0}>
          <div class="kawaii-card kawaii-empty-state">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="title">{t('dashboard.noProjectsYet')}</div>
            <div class="description">{t('dashboard.noProjectsDescription')}</div>
            <button
              onClick={() => navigate('/projects/create')}
              class="kawaii-btn primary"
            >
              {t('dashboard.createProject')}
            </button>
          </div>
        </Show>

        <Show when={!projects.loading && (projects() || []).length > 0}>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
            <For each={projects()}>
              {(project) => {
                const isOwner = () => project.userId === user()?.id;

                return (
                  <div class="kawaii-card hover-lift transition-all" style="cursor: pointer;">
                    <button
                      onClick={() => navigate(`/projects/${project.id}`)}
                      style="width: 100%; text-align: left; background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 16px;"
                    >
                      <div style="margin-bottom: 16px;">
                        <h3 style="font-size: 18px; font-weight: 700; color: var(--kawaii-ink); margin-bottom: 8px; transition: var(--kawaii-transition);" class="project-title">{project.name}</h3>
                        <code style="font-size: 11px; color: var(--kawaii-muted); background: var(--kawaii-surface); padding: 4px 8px; border-radius: 6px; display: inline-block;">{project.repository}</code>
                      </div>
                      <Show when={(project.languages || []).length > 0} fallback={
                        <div style="font-size: 12px; color: var(--kawaii-muted); font-style: italic; padding: 8px 0;">{t('dashboard.noFilesUploaded')}</div>
                      }>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                          <For each={(project.languages || []).slice(0, 4)}>
                            {(lang) => (
                              <span style="padding: 6px 12px; font-size: 11px; font-weight: 700; background: var(--kawaii-pink-light); border: 2px solid var(--kawaii-pink); color: var(--kawaii-ink); border-radius: 999px;">
                                {lang.toUpperCase()}
                              </span>
                            )}
                          </For>
                          <Show when={(project.languages || []).length > 4}>
                            <span style="padding: 6px 12px; font-size: 11px; font-weight: 700; color: var(--kawaii-muted); background: #fff; border: 2px solid var(--kawaii-border-color); border-radius: 999px;">
                              +{(project.languages || []).length - 4}
                            </span>
                          </Show>
                        </div>
                      </Show>
                    </button>
                    <Show when={isOwner()}>
                      <button
                        onClick={() => navigate(`/projects/${project.id}/settings`)}
                        class="kawaii-btn secondary"
                        style="width: 100%; justify-content: center;"
                      >
                        {t('dashboard.manageProject')}
                      </button>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
      
      <style>{`
        .project-title {
          transition: var(--kawaii-transition);
        }
        .kawaii-card:hover .project-title {
          color: var(--kawaii-pink);
        }
      `}</style>
    </div>
  );
}
