import { useNavigate } from '@solidjs/router';
import { user } from '../auth';
import { useI18n } from '../utils/i18n';
import { LanguageSelector } from '../components';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div class="page" style="display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
      <div style="position: absolute; top: 1rem; right: 1rem;">
        <LanguageSelector />
      </div>
      <div class="animate-slide-up" style="text-align: center; max-width: 42rem; margin: 0 auto;">
        <div style="margin-bottom: 3rem; display: flex; justify-content: center;">
          <img 
            src="/logo.png" 
            alt="Koro i18n" 
            style="width: 10rem; height: 10rem; object-fit: contain;"
          />
        </div>
        
        <h1 style="
          font-size: 3.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
          color: var(--color-black);
        ">
          {t('home.title')}
        </h1>
        <p style="
          font-size: 1.25rem;
          color: var(--color-gray-600);
          margin-bottom: 3rem;
          font-weight: 400;
        ">
          {t('home.subtitle')}
        </p>
        
        {user() ? (
          <button
            onClick={() => navigate('/dashboard')}
            class="btn primary"
            style="padding: 1rem 2rem; font-size: 1rem;"
          >
            {t('home.goToDashboard')}
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            class="btn primary"
            style="padding: 1rem 2rem; font-size: 1rem;"
          >
            {t('home.signInWithGitHub')}
          </button>
        )}
      </div>
    </div>
  );
}