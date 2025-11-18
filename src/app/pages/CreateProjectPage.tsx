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
          <h1 style="font-size: 20px; font-weight: 700; color: var(--kawaii-ink); margin: 0;">{t('createProject.title')}</h1>
        </div>
      </div>

      <div style="max-width: 640px; margin: 0 auto; padding: 48px 24px;" class="animate-slide-up">
        <div class="kawaii-card">
          <div style="margin-bottom: 32px;">
            <h2 style="font-size: 24px; font-weight: 800; color: var(--kawaii-ink); margin-bottom: 8px;">{t('createProject.heading')}</h2>
            <p style="color: var(--kawaii-muted); font-size: 14px;">{t('createProject.description')}</p>
          </div>
          
          <form onSubmit={handleCreateProject}>
            <div class="kawaii-form-group">
              <label class="kawaii-label">
                {t('createProject.githubRepository')}
              </label>
              <input
                type="text"
                value={projectRepo()}
                onInput={(e) => setProjectRepo(e.currentTarget.value)}
                placeholder={t('createProject.repositoryPlaceholder')}
                required
                class="kawaii-input"
              />
              <p class="kawaii-hint">
                {t('createProject.repositoryHelp')}
              </p>
            </div>

            <div class="kawaii-form-group">
              <label class="kawaii-label">
                {t('createProject.projectName')}
              </label>
              <input
                type="text"
                value={projectName()}
                onInput={(e) => setProjectName(e.currentTarget.value)}
                placeholder={t('createProject.projectNamePlaceholder')}
                required
                class="kawaii-input"
              />
              <p class="kawaii-hint">
                {t('createProject.projectNameHelp')}
              </p>
            </div>

            <Show when={error()}>
              <div class="kawaii-error">
                {error()}
              </div>
            </Show>

            <div style="display: flex; gap: 12px; padding-top: 16px;">
              <button
                type="submit"
                disabled={!projectRepo() || !projectName() || isSubmitting()}
                class="kawaii-btn primary"
                style="flex: 1; justify-content: center;"
              >
                {isSubmitting() ? t('createProject.creating') : t('createProject.createProject')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                class="kawaii-btn secondary"
                style="justify-content: center;"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
