import { useNavigate } from '@solidjs/router';
import { useAuth } from '../auth';
import { useI18n } from '../utils/i18n';
import { LanguageSelector } from '../components';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <div style={{ 
      display: 'flex', 
      'flex-direction': 'column', 
      'align-items': 'center', 
      'justify-content': 'center', 
      'min-height': '70vh',
      'text-align': 'center',
      padding: '2rem 1rem'
    }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <LanguageSelector />
      </div>

      <div class="animate-fade-in" style={{ 'max-width': '32rem' }}>
        <div style={{ 
          'font-size': '4rem', 
          'margin-bottom': '1.5rem',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
        }}>
          🌐
        </div>

        <h1 style={{ 
          'font-size': '2.5rem', 
          'font-weight': '700', 
          'margin-bottom': '1rem',
          color: 'var(--text)'
        }}>
          Koro i18n
        </h1>

        <p style={{ 
          'font-size': '1.125rem', 
          color: 'var(--text-secondary)', 
          'margin-bottom': '2rem',
          'line-height': '1.6'
        }}>
          {t('home.subtitle') || 'Simple and intuitive translation management for your projects.'}
        </p>

        <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', gap: '1rem' }}>
          {user() ? (
            <button
              onClick={() => navigate('/dashboard')}
              class="btn primary"
              style={{ padding: '0.75rem 2rem', 'font-size': '1rem' }}
            >
              {t('home.goToDashboard') || 'Go to Dashboard'} →
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              class="btn primary"
              style={{ padding: '0.75rem 2rem', 'font-size': '1rem' }}
            >
              {t('home.signInWithGitHub') || 'Sign in with GitHub'}
            </button>
          )}
        </div>

        <div style={{ 
          'margin-top': '3rem', 
          display: 'flex', 
          'justify-content': 'center', 
          gap: '2rem',
          color: 'var(--text-muted)',
          'font-size': '0.875rem'
        }}>
          <span>⚡ Fast</span>
          <span>☁️ Cloud-native</span>
          <span>🆓 Free</span>
        </div>
      </div>
    </div>
  );
}