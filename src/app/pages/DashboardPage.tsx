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
    <div class="animate-fade-in">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        'align-items': 'center', 
        'justify-content': 'space-between', 
        'flex-wrap': 'wrap',
        gap: '1rem',
        'margin-bottom': '2rem'
      }}>
        <div>
          <h2 style={{ 'font-size': '1.75rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
            {t('dashboard.title') || 'Projects'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {t('dashboard.subtitle') || 'Manage your translation projects'}
          </p>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
          <LanguageSelector />
          <button onClick={() => navigate('/projects/create')} class="btn primary">
            + {t('dashboard.newProject') || 'New Project'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      <Show when={projects.loading}>
        <div class="grid grid-auto">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!projects.loading && (projects() || []).length === 0}>
        <div class="card empty-state">
          <div class="icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div class="title">{t('dashboard.noProjectsYet') || 'No projects yet'}</div>
          <div class="description">{t('dashboard.noProjectsDescription') || 'Create your first project to get started'}</div>
          <button 
            onClick={() => navigate('/projects/create')} 
            class="btn primary"
            style={{ 'margin-top': '1.5rem' }}
          >
            {t('dashboard.createProject') || 'Create Project'}
          </button>
        </div>
      </Show>

      {/* Projects List */}
      <Show when={!projects.loading && (projects() || []).length > 0}>
        <div class="grid grid-auto">
          <For each={projects()}>
            {(project) => {
              const isOwner = () => project.userId === user()?.id;

              return (
                <div
                  class="card hover-lift transition-all"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${project.name}`)}
                >
                  <div style={{ 
                    display: 'flex', 
                    'align-items': 'flex-start', 
                    'justify-content': 'space-between', 
                    'margin-bottom': '1rem' 
                  }}>
                    <div>
                      <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '0.375rem' }}>
                        {project.name}
                      </h3>
                      <code class="code-chip" style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>
                        {project.repository}
                      </code>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                  </div>

                  <div style={{ 'margin-bottom': '1rem' }}>
                    <Show when={(project.languages || []).length > 0} fallback={
                      <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'font-style': 'italic' }}>
                        {t('dashboard.noFilesUploaded') || 'No files uploaded'}
                      </span>
                    }>
                      <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.375rem' }}>
                        <For each={(project.languages || []).slice(0, 4)}>
                          {(lang) => (
                            <span class="badge">{lang.toUpperCase()}</span>
                          )}
                        </For>
                        <Show when={(project.languages || []).length > 4}>
                          <span class="badge" style={{ background: 'var(--surface)' }}>
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
                      class="btn ghost w-full"
                      style={{ 'font-size': '0.875rem' }}
                    >
                      ⚙️ {t('dashboard.manageProject') || 'Manage'}
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
