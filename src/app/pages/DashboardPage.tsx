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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'var(--success)';
    if (percentage >= 40) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div class="animate-fade-in">
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        'align-items': 'flex-start', 
        'justify-content': 'space-between', 
        'flex-wrap': 'wrap',
        gap: '1.5rem',
        'margin-bottom': '2.5rem'
      }}>
        <div>
          <h1 style={{ 
            'font-size': '2rem', 
            'font-weight': '700', 
            'margin-bottom': '0.5rem',
            'letter-spacing': '-0.02em'
          }}>
            {t('dashboard.title') || 'Your Projects'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', 'font-size': '1rem' }}>
            {t('dashboard.subtitle') || 'Manage and track your translation projects'}
          </p>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
          <LanguageSelector />
          <button onClick={() => navigate('/projects/join')} class="btn">
            {t('dashboard.joinProject') || 'Join Project'}
          </button>
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
        <div class="card" style={{ 
          'text-align': 'center', 
          padding: '4rem 2rem',
          'border-style': 'dashed',
          'border-width': '2px'
        }}>
          <div style={{
            width: '5rem',
            height: '5rem',
            margin: '0 auto 1.5rem',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            background: 'var(--accent-light)',
            'border-radius': '50%'
          }}>
            <svg width="32" height="32" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 style={{ 'font-size': '1.375rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
            {t('dashboard.noProjectsYet') || 'No projects yet'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', 'margin-bottom': '1.5rem', 'max-width': '24rem', margin: '0 auto 1.5rem' }}>
            {t('dashboard.noProjectsDescription') || 'Create your first project to start managing translations'}
          </p>
          <div style={{ display: 'flex', 'justify-content': 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate('/projects/join')} class="btn">
              Join a Project
            </button>
            <button onClick={() => navigate('/projects/create')} class="btn primary">
              Create Project
            </button>
          </div>
        </div>
      </Show>

      {/* Projects Grid */}
      <Show when={!projects.loading && (projects() || []).length > 0}>
        <div class="grid grid-auto">
          <For each={projects()}>
            {(project) => {
              const isOwner = () => project.userId === user()?.id;
              const languageCount = () => (project.languages || []).length;

              return (
                <div
                  class="card interactive"
                  onClick={() => navigate(`/projects/${project.name}`)}
                >
                  {/* Project Header */}
                  <div style={{ 
                    display: 'flex', 
                    'align-items': 'flex-start', 
                    'justify-content': 'space-between', 
                    'margin-bottom': '1rem' 
                  }}>
                    <div style={{ flex: '1', 'min-width': '0' }}>
                      <h3 style={{ 
                        'font-size': '1.125rem', 
                        'font-weight': '600', 
                        'margin-bottom': '0.375rem',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'white-space': 'nowrap'
                      }}>
                        {project.name}
                      </h3>
                      <code class="code-chip" style={{ 'font-size': '0.75rem' }}>
                        {project.repository}
                      </code>
                    </div>
                    <Show when={isOwner()}>
                      <span class="badge neutral" style={{ 'flex-shrink': '0' }}>Owner</span>
                    </Show>
                  </div>

                  {/* Languages */}
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <Show when={languageCount() > 0} fallback={
                      <span style={{ 
                        'font-size': '0.875rem', 
                        color: 'var(--text-muted)', 
                        'font-style': 'italic' 
                      }}>
                        {t('dashboard.noFilesUploaded') || 'No files uploaded yet'}
                      </span>
                    }>
                      <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.375rem' }}>
                        <For each={(project.languages || []).slice(0, 5)}>
                          {(lang) => (
                            <span class="badge">{lang.toUpperCase()}</span>
                          )}
                        </For>
                        <Show when={languageCount() > 5}>
                          <span class="badge neutral">
                            +{languageCount() - 5}
                          </span>
                        </Show>
                      </div>
                    </Show>
                  </div>

                  {/* Actions */}
                  <div style={{ 
                    display: 'flex', 
                    'align-items': 'center', 
                    'justify-content': 'space-between',
                    'padding-top': '0.75rem',
                    'border-top': '1px solid var(--border-light)'
                  }}>
                    <span style={{ 
                      'font-size': '0.8125rem', 
                      color: 'var(--text-secondary)' 
                    }}>
                      {languageCount()} {languageCount() === 1 ? 'language' : 'languages'}
                    </span>
                    <Show when={isOwner()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project.name}/settings`);
                        }}
                        class="btn ghost sm"
                      >
                        ⚙️ Settings
                      </button>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
