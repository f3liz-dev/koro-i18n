import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal } from 'solid-js';
import { user } from '../auth';
import { useI18n } from '../utils/i18n';
import { LanguageSelector } from '../components';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isVerifying, setIsVerifying] = createSignal(false);

  createEffect(() => {
    const currentUser = user();
    if (currentUser && !isVerifying()) {
      setIsVerifying(true);
      
      fetch('/api/auth/me', { credentials: 'include' })
        .then(async (res) => {
          if (res.ok) {
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
              sessionStorage.removeItem('redirectAfterLogin');
              navigate(redirectUrl, { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } else {
            setIsVerifying(false);
          }
        })
        .catch(() => {
          setIsVerifying(false);
        });
    }
  });

  const handleLogin = () => {
    window.location.href = '/api/auth/github';
  };

  return (
    <div class="page" style="display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
      <div style="position: absolute; top: 1.5rem; right: 1.5rem;">
        <LanguageSelector />
      </div>
      <div class="animate-slide-up" style="width: 100%; max-width: 28rem;">
        <div class="card" style="padding: 2.5rem;">
          <div style="margin-bottom: 2rem; display: flex; justify-content: center;">
            <div style="
              padding: 1rem;
              background: var(--color-bg-elevated);
              border-radius: var(--radius-xl);
              box-shadow: var(--shadow-soft);
              border: var(--border);
            ">
              <img 
                src="/logo.png" 
                alt="Koro i18n" 
                style="width: 5rem; height: 5rem; object-fit: contain; display: block;"
              />
            </div>
          </div>
          
          <h1 style="
            font-size: 1.5rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 2rem;
            color: var(--color-text-primary);
          ">
            {t('login.title')}
          </h1>
          
          <button
            onClick={handleLogin}
            class="btn"
            style="
              width: 100%;
              padding: 1rem 1.5rem;
              background: var(--color-text-primary);
              border-color: var(--color-text-primary);
              color: var(--color-bg-surface);
              justify-content: center;
              border-radius: var(--radius);
            "
          >
            <svg style="width: 1.25rem; height: 1.25rem;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            {t('login.continueWithGitHub')}
          </button>
          
          <div style="margin-top: 1.5rem; text-align: center;">
            <button
              onClick={() => navigate('/')}
              class="btn"
              style="background: none; border: none; color: var(--color-text-secondary); box-shadow: none;"
            >
              {t('login.backToHome')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}