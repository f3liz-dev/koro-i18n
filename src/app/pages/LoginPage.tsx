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
      'min-height': '75vh',
      padding: '2rem 1.5rem'
    }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <LanguageSelector />
      </div>

      <div class="card animate-slide-up" style={{ 
        'max-width': '26rem', 
        width: '100%',
        'text-align': 'center',
        padding: '3rem 2.5rem',
        'border-radius': 'var(--radius-xl)'
      }}>
        <div style={{ 
          'font-size': '3.5rem', 
          'margin-bottom': '1.5rem',
          filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.15))'
        }}>
          🌐
        </div>

        <h1 style={{ 
          'font-size': '1.75rem', 
          'font-weight': '700', 
          'margin-bottom': '0.75rem',
          color: 'var(--text)',
          'letter-spacing': '-0.02em'
        }}>
          {t('login.title') || 'Welcome to Koro i18n'}
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          'font-size': '0.9375rem',
          'margin-bottom': '2rem'
        }}>
          Sign in to manage your translation projects
        </p>

        <button
          onClick={handleLogin}
          class="btn"
          style={{ 
            width: '100%', 
            padding: '0.9375rem 1.5rem',
            background: '#24292f',
            color: 'white',
            border: 'none',
            'font-size': '1rem',
            'font-weight': '600',
            'border-radius': 'var(--radius-lg)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            gap: '0.75rem'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          {t('login.continueWithGitHub') || 'Continue with GitHub'}
        </button>

        <div style={{ 'margin-top': '2rem' }}>
          <button
            onClick={() => navigate('/')}
            class="btn ghost"
            style={{ 'font-size': '0.9375rem' }}
          >
            {t('login.backToHome') || '← Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
}