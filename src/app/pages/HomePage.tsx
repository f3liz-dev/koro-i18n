import { useNavigate } from '@solidjs/router';
import { user } from '../auth';
import { useI18n } from '../utils/i18n';
import { LanguageSelector } from '../components';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div class="page" style="display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
      <div style="position: absolute; top: 1.5rem; right: 1.5rem;">
        <LanguageSelector />
      </div>
      <div class="animate-slide-up" style="text-align: center; max-width: 42rem; margin: 0 auto;">
        <div style="margin-bottom: 2.5rem; display: flex; justify-content: center;">
          <div style="
            padding: 1.25rem;
            background: var(--color-bg-surface);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-soft);
            border: var(--border);
          ">
            <img 
              src="/logo.png" 
              alt="Koro i18n" 
              style="width: 8rem; height: 8rem; object-fit: contain; display: block;"
            />
          </div>
        </div>
        
        <h1 style="
          font-size: 3rem;
          font-weight: 600;
          margin-bottom: 1rem;
          letter-spacing: -0.01em;
          color: var(--color-text-primary);
        ">
          {t('home.title')}
        </h1>
        <p style="
          font-size: 1.125rem;
          color: var(--color-text-secondary);
          margin-bottom: 2.5rem;
          font-weight: 400;
          line-height: 1.7;
        ">
          {t('home.subtitle')}
        </p>
        
        {user() ? (
          <button
            onClick={() => navigate('/dashboard')}
            class="btn primary"
            style="padding: 1rem 2.5rem; font-size: 1rem; border-radius: var(--radius-lg);"
          >
            {t('home.goToDashboard')}
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            class="btn primary"
            style="padding: 1rem 2.5rem; font-size: 1rem; border-radius: var(--radius-lg);"
          >
            {t('home.signInWithGitHub')}
          </button>
        )}
      </div>
    </div>
  );
}