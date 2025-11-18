import { useNavigate } from '@solidjs/router';
import { user } from '../auth';
import { useI18n } from '../utils/i18n';
import { LanguageSelector } from '../components';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div class="kawaii-page flex items-center justify-center px-6">
      <div style="position: absolute; top: 16px; right: 16px;">
        <LanguageSelector />
      </div>
      <div class="text-center max-w-2xl mx-auto animate-slide-up">
        <div style="margin-bottom: 48px; display: flex; justify-content: center;">
          <div style="position: relative;">
            <div style="position: absolute; inset: 0; background: var(--kawaii-accent); border-radius: 50%; filter: blur(60px); opacity: 0.2; animation: pulse 3s ease-in-out infinite;"></div>
            <img 
              src="/logo.png" 
              alt="Koro i18n - Kawaii hermit crab mascot" 
              style="position: relative; width: 160px; height: 160px; object-fit: contain; filter: drop-shadow(0 8px 24px rgba(243, 139, 175, 0.2));"
            />
          </div>
        </div>
        
        <h1 class="kawaii-text-gradient" style="font-size: 56px; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.02em;">
          {t('home.title')}
        </h1>
        <p style="font-size: 20px; color: var(--kawaii-muted); margin-bottom: 48px; font-weight: 500;">
          {t('home.subtitle')}
        </p>
        
        {user() ? (
          <button
            onClick={() => navigate('/dashboard')}
            class="kawaii-btn primary"
            style="padding: 14px 32px; font-size: 16px;"
          >
            {t('home.goToDashboard')}
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            class="kawaii-btn primary"
            style="padding: 14px 32px; font-size: 16px;"
          >
            {t('home.signInWithGitHub')}
          </button>
        )}
      </div>
    </div>
  );
}