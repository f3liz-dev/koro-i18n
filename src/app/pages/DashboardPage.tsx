import { useNavigate } from '@solidjs/router';
import { createEffect, For, Show } from 'solid-js';
import { useAuth } from '../auth';
import { SkeletonCard, LanguageSelector } from '../components';
import { projects, refreshProjects } from '../utils/store';
import { useI18n } from '../utils/i18n';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  createEffect(() => {
    if (!user()) navigate('/login', { replace: true });
  });

  refreshProjects();

  return (
    <div class="flex flex-col gap-8">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 class="text-3xl font-serif font-bold text-neutral-800 mb-2">
            {t('dashboard.title')}
          </h2>
          <p class="text-neutral-500">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <LanguageSelector />
          <button
            onClick={() => navigate('/projects/create')}
            class="btn-primary"
          >
            <div class="i-carbon-add text-lg" />
            <span>{t('dashboard.newProject')}</span>
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
        <div class="card flex flex-col items-center justify-center py-16 text-center">
          <div class="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
            <div class="i-carbon-folder text-4xl text-neutral-300" />
          </div>
          <h3 class="text-xl font-bold text-neutral-800 mb-2">{t('dashboard.noProjectsYet')}</h3>
          <p class="text-neutral-500 mb-8 max-w-md">{t('dashboard.noProjectsDescription')}</p>
          <button
            onClick={() => navigate('/projects/create')}
            class="btn-primary"
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
                <div
                  class="card hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(`/projects/${project.name}`)}
                >
                  <div class="flex items-start justify-between mb-4">
                    <div>
                      <h3 class="text-lg font-bold text-neutral-800 group-hover:text-primary-500 transition-colors mb-1">
                        {project.name}
                      </h3>
                      <code class="text-xs bg-neutral-100 text-neutral-500 px-2 py-1 rounded border border-neutral-200">
                        {project.repository}
                      </code>
                    </div>
                    <div class="i-carbon-arrow-right text-neutral-300 group-hover:text-primary-400 transition-colors" />
                  </div>

                  <div class="mb-6">
                    <Show when={(project.languages || []).length > 0} fallback={
                      <div class="text-sm text-neutral-400 italic">{t('dashboard.noFilesUploaded')}</div>
                    }>
                      <div class="flex flex-wrap gap-2">
                        <For each={(project.languages || []).slice(0, 4)}>
                          {(lang) => (
                            <span class="px-2 py-1 text-xs font-bold rounded-md bg-primary-50 text-primary-600 border border-primary-100">
                              {lang.toUpperCase()}
                            </span>
                          )}
                        </For>
                        <Show when={(project.languages || []).length > 4}>
                          <span class="px-2 py-1 text-xs font-medium rounded-md bg-neutral-100 text-neutral-500">
                            +{(project.languages || []).length - 4}
                          </span>
                        </Show>
                      </div>
                    </Show>
                  </div>

                  <Show when={isOwner()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.name}/settings`);
                      }}
                      class="w-full py-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-primary-500 hover:border-primary-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <div class="i-carbon-settings" />
                      <span>{t('dashboard.manageProject')}</span>
                    </button>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
