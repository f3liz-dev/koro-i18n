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

  const _handleDeleteProject = async (projectName: string) => {
    if (!confirm(t('dashboard.deleteConfirm'))) return;

    try {
  const res = await authFetch(`/api/projects/${projectName}`, {
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
    <div class="page" style="min-height: 100vh;">
      <PageHeader
        title={t('common.appName')}
        subtitle={`<span style="color: var(--color-gray-500);">/</span> <span style="font-size: 0.813rem; color: var(--color-gray-500);">${user()?.username}</span>`}
        logo={true}
        menuItems={menuItems}
      />

      <div class="container animate-fade-in">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.875rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.375rem;">{t('dashboard.title')}</h2>
            <p style="color: var(--color-text-secondary); font-size: 0.875rem; line-height: 1.6;">{t('dashboard.subtitle')}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <LanguageSelector />
            <button
              onClick={() => navigate('/projects/create')}
              class="btn primary"
              style="border-radius: var(--radius);"
            >
              {t('dashboard.newProject')}
            </button>
          </div>
        </div>
        
        <Show when={projects.loading}>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); gap: 1.25rem;">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </Show>

        <Show when={!projects.loading && (projects() || []).length === 0}>
          <div class="card empty-state">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="title">{t('dashboard.noProjectsYet')}</div>
            <div class="description">{t('dashboard.noProjectsDescription')}</div>
            <button
              onClick={() => navigate('/projects/create')}
              class="btn primary"
            >
              {t('dashboard.createProject')}
            </button>
          </div>
        </Show>

        <Show when={!projects.loading && (projects() || []).length > 0}>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); gap: 1.5rem;">
            <For each={projects()}>
              {(project) => {
                const isOwner = () => project.userId === user()?.id;

                return (
                  <div class="card hover-lift transition-all" style="cursor: pointer;">
                    <button
                      onClick={() => navigate(`/projects/${project.name}`)}
                      style="
                        width: 100%;
                        text-align: left;
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 0;
                        margin-bottom: 1rem;
                      "
                    >
                      <div style="margin-bottom: 1rem;">
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
                      <Show when={(project.languages || []).length > 0} fallback={
                        <div style="font-size: 0.813rem; color: var(--color-text-muted); font-style: italic; padding: 0.5rem 0;">{t('dashboard.noFilesUploaded')}</div>
                      }>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                          <For each={(project.languages || []).slice(0, 4)}>
                            {(lang) => (
                              <span class="badge primary">
                                {lang.toUpperCase()}
                              </span>
                            )}
                          </For>
                          <Show when={(project.languages || []).length > 4}>
                            <span class="badge">
                              +{(project.languages || []).length - 4}
                            </span>
                          </Show>
                        </div>
                      </Show>
                    </button>
                    <Show when={isOwner()}>
                      <button
                        onClick={() => navigate(`/projects/${project.name}/settings`)}
                        class="btn"
                        style="width: 100%; justify-content: center; border-radius: var(--radius);"
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
          transition: var(--transition);
        }
        .card:hover .project-title {
          color: var(--color-accent-peach);
        }
      `}</style>
    </div>
  );
}
