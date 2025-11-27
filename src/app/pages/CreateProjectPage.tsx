import { useNavigate } from '@solidjs/router';
import { createSignal, onMount, Show } from 'solid-js';
import { user } from '../auth';
import { authFetch } from '../utils/authFetch';
import { useI18n } from '../utils/i18n';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [projectName, setProjectName] = createSignal('');
  const [projectRepo, setProjectRepo] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  onMount(() => {
    if (!user()) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      navigate('/login', { replace: true });
    }
  });

  const handleCreateProject = async (e: Event) => {
    e.preventDefault();
    if (isSubmitting()) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName(),
          repository: projectRepo(),
        }),
      });

      if (res.ok) {
        await res.json();
        navigate(`/projects/${projectName()}`);
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      setError('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="animate-fade-in">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        'align-items': 'center', 
        gap: '0.875rem',
        'margin-bottom': '2rem'
      }}>
        <button onClick={() => navigate('/dashboard')} class="btn ghost" style={{ padding: '0.625rem' }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 style={{ 
            'font-size': '1.75rem', 
            'font-weight': '700',
            'letter-spacing': '-0.02em'
          }}>
            {t('createProject.title') || 'Create Project'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', 'font-size': '0.9375rem', 'margin-top': '0.25rem' }}>
            Connect a GitHub repository to manage translations
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div style={{ 'max-width': '36rem' }}>
        <div class="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleCreateProject}>
            {/* Repository Input */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label class="label">
                {t('createProject.githubRepository') || 'GitHub Repository'}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}>
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </span>
                <input
                  type="text"
                  value={projectRepo()}
                  onInput={(e) => setProjectRepo(e.currentTarget.value)}
                  placeholder={t('createProject.repositoryPlaceholder') || 'owner/repository'}
                  required
                  class="input"
                  style={{ 'padding-left': '2.75rem' }}
                />
              </div>
              <p class="label-hint">
                {t('createProject.repositoryHelp') || 'Format: owner/repository (e.g., github/docs)'}
              </p>
            </div>

            {/* Project Name Input */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label class="label">
                {t('createProject.projectName') || 'Project Name'}
              </label>
              <input
                type="text"
                value={projectName()}
                onInput={(e) => setProjectName(e.currentTarget.value)}
                placeholder={t('createProject.projectNamePlaceholder') || 'my-project'}
                required
                class="input"
              />
              <p class="label-hint">
                {t('createProject.projectNameHelp') || 'A unique name for your project'}
              </p>
            </div>

            {/* Error Message */}
            <Show when={error()}>
              <div class="message error" style={{ 'margin-bottom': '1.5rem' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error()}
              </div>
            </Show>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', 'padding-top': '0.5rem' }}>
              <button
                type="submit"
                disabled={!projectRepo() || !projectName() || isSubmitting()}
                class="btn primary"
                style={{ flex: '1' }}
              >
                {isSubmitting() ? (
                  <>
                    <span class="animate-spin" style={{ 
                      width: '1rem', 
                      height: '1rem', 
                      border: '2px solid rgba(255,255,255,0.3)',
                      'border-top-color': 'white',
                      'border-radius': '50%'
                    }} />
                    {t('createProject.creating') || 'Creating...'}
                  </>
                ) : (
                  t('createProject.createProject') || 'Create Project'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                class="btn"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
