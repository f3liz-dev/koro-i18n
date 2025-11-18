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
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30">
      <PageHeader
        title={t('common.appName')}
        subtitle={`<span class="text-gray-300">/</span> <span class="text-sm text-gray-600">${user()?.username}</span>`}
        logo={true}
        menuItems={menuItems}
      />

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h2 class="text-3xl font-bold text-gray-900 mb-1">{t('dashboard.title')}</h2>
            <p class="text-gray-600">{t('dashboard.subtitle')}</p>
          </div>
          <div class="flex items-center gap-3">
            <LanguageSelector />
            <button
              onClick={() => navigate('/projects/create')}
              class="px-6 py-3 text-sm font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
            >
              {t('dashboard.newProject')}
            </button>
          </div>
        </div>
        
        <Show when={projects.loading}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </Show>

        <Show when={!projects.loading && (projects() || []).length === 0}>
          <div class="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="text-xl font-semibold text-gray-900 mb-2">{t('dashboard.noProjectsYet')}</div>
            <div class="text-gray-500 mb-6">{t('dashboard.noProjectsDescription')}</div>
            <button
              onClick={() => navigate('/projects/create')}
              class="px-6 py-3 text-sm font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
            >
              {t('dashboard.createProject')}
            </button>
          </div>
        </Show>

        <Show when={!projects.loading && (projects() || []).length > 0}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <For each={projects()}>
              {(project) => {
                const isOwner = () => project.userId === user()?.id;

                return (
                  <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 group">
                    <button
                      onClick={() => navigate(`/projects/${project.id}`)}
                      class="w-full text-left mb-4"
                    >
                      <div class="mb-4">
                        <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{project.name}</h3>
                        <code class="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">{project.repository}</code>
                      </div>
                      <Show when={(project.languages || []).length > 0} fallback={
                        <div class="text-xs text-gray-400 italic py-2">{t('dashboard.noFilesUploaded')}</div>
                      }>
                        <div class="flex flex-wrap gap-2">
                          <For each={(project.languages || []).slice(0, 4)}>
                            {(lang) => (
                              <span class="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-primary-100 to-accent-100 text-primary-700 rounded-lg">
                                {lang.toUpperCase()}
                              </span>
                            )}
                          </For>
                          <Show when={(project.languages || []).length > 4}>
                            <span class="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 rounded-lg">
                              +{(project.languages || []).length - 4}
                            </span>
                          </Show>
                        </div>
                      </Show>
                    </button>
                    <Show when={isOwner()}>
                      <button
                        onClick={() => navigate(`/projects/${project.id}/settings`)}
                        class="w-full px-4 py-2.5 text-sm font-medium border-2 border-gray-200 text-gray-700 rounded-xl hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-all"
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
    </div>
  );
}
