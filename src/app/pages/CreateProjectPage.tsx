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
          <h1 style="font-size: 1.25rem; font-weight: 600; color: var(--color-text-primary); margin: 0;">{t('createProject.title')}</h1>
        </div>
      </div>

      <div class="animate-slide-up" style="max-width: 40rem; margin: 0 auto; padding: 3rem 1.5rem;">
        <div class="card">
          <div style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.5rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.625rem;">{t('createProject.heading')}</h2>
            <p style="color: var(--color-text-secondary); font-size: 0.875rem; line-height: 1.6;">{t('createProject.description')}</p>
          </div>
          
          <form onSubmit={handleCreateProject}>
            <div style="margin-bottom: 1.5rem;">
              <label class="label">
                {t('createProject.githubRepository')}
              </label>
              <input
                type="text"
                value={projectRepo()}
                onInput={(e) => setProjectRepo(e.currentTarget.value)}
                placeholder={t('createProject.repositoryPlaceholder')}
                required
                class="input"
              />
              <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.5rem; line-height: 1.5;">
                {t('createProject.repositoryHelp')}
              </p>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <label class="label">
                {t('createProject.projectName')}
              </label>
              <input
                type="text"
                value={projectName()}
                onInput={(e) => setProjectName(e.currentTarget.value)}
                placeholder={t('createProject.projectNamePlaceholder')}
                required
                class="input"
              />
              <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.5rem; line-height: 1.5;">
                {t('createProject.projectNameHelp')}
              </p>
            </div>

            <Show when={error()}>
              <div class="message error" style="margin-bottom: 1rem;">
                {error()}
              </div>
            </Show>

            <div style="display: flex; gap: 0.75rem; padding-top: 1rem;">
              <button
                type="submit"
                disabled={!projectRepo() || !projectName() || isSubmitting()}
                class="btn primary"
                style="flex: 1; justify-content: center; border-radius: var(--radius);"
              >
                {isSubmitting() ? t('createProject.creating') : t('createProject.createProject')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                class="btn"
                style="border-radius: var(--radius);"
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
