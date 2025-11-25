import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal } from 'solid-js';
import { useAuth } from '../auth';
import { useI18n } from '../utils/i18n';
import { LanguageSelector } from '../components';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    <div style={{ 
      display: 'flex', 
      'flex-direction': 'column', 
      'align-items': 'center', 
      'justify-content': 'center', 
      'min-height': '70vh',
      padding: '2rem 1rem'
    }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <LanguageSelector />
      </div>

      <div class="card animate-fade-in" style={{ 
        'max-width': '24rem', 
        width: '100%',
        'text-align': 'center',
        padding: '2.5rem'
      }}>
        <div style={{ 'font-size': '3rem', 'margin-bottom': '1.5rem' }}>
          🌐
        </div>

        <h1 style={{ 
          'font-size': '1.5rem', 
          'font-weight': '600', 
          'margin-bottom': '2rem',
          color: 'var(--text)'
        }}>
          {t('login.title') || 'Sign in to Koro i18n'}
        </h1>

        <button
          onClick={handleLogin}
          class="btn"
          style={{ 
            width: '100%', 
            padding: '0.875rem 1.5rem',
            background: '#24292e',
            color: 'white',
            border: 'none',
            'font-size': '1rem'
          }}
        >
          {t('login.continueWithGitHub') || 'Continue with GitHub'}
        </button>

        <div style={{ 'margin-top': '1.5rem' }}>
          <button
            onClick={() => navigate('/')}
            class="btn ghost"
            style={{ 'font-size': '0.875rem' }}
          >
            {t('login.backToHome') || '← Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
}