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
    <div class="page animate-fade-in">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        'align-items': 'center', 
        gap: '0.75rem',
        'margin-bottom': '2rem'
      }}>
        <button onClick={() => navigate('/dashboard')} class="btn ghost">
          ←
        </button>
        <h1 style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
          {t('createProject.title') || 'Create Project'}
        </h1>
      </div>

      {/* Form */}
      <div style={{ 'max-width': '32rem' }}>
        <div class="card">
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <h2 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              {t('createProject.heading') || 'New Project'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', 'font-size': '0.875rem' }}>
              {t('createProject.description') || 'Connect a GitHub repository to start managing translations.'}
            </p>
          </div>

          <form onSubmit={handleCreateProject}>
            <div style={{ 'margin-bottom': '1.25rem' }}>
              <label class="label">
                {t('createProject.githubRepository') || 'GitHub Repository'}
              </label>
              <input
                type="text"
                value={projectRepo()}
                onInput={(e) => setProjectRepo(e.currentTarget.value)}
                placeholder={t('createProject.repositoryPlaceholder') || 'owner/repository'}
                required
                class="input"
              />
              <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.375rem' }}>
                {t('createProject.repositoryHelp') || 'Format: owner/repository (e.g., github/docs)'}
              </p>
            </div>

            <div style={{ 'margin-bottom': '1.25rem' }}>
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
              <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.375rem' }}>
                {t('createProject.projectNameHelp') || 'A unique name for your project'}
              </p>
            </div>

            <Show when={error()}>
              <div class="message error" style={{ 'margin-bottom': '1rem' }}>
                {error()}
              </div>
            </Show>

            <div style={{ display: 'flex', gap: '0.75rem', 'padding-top': '0.5rem' }}>
              <button
                type="submit"
                disabled={!projectRepo() || !projectName() || isSubmitting()}
                class="btn primary"
                style={{ flex: '1' }}
              >
                {isSubmitting() ? (t('createProject.creating') || 'Creating...') : (t('createProject.createProject') || 'Create Project')}
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
