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
      'min-height': '75vh',
      'text-align': 'center',
      padding: '3rem 1.5rem'
    }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <LanguageSelector />
      </div>

      <div class="animate-fade-in" style={{ 'max-width': '36rem' }}>
        {/* Logo */}
        <div style={{ 
          'font-size': '4.5rem', 
          'margin-bottom': '1.5rem',
          filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.15))'
        }}>
          🌐
        </div>

        {/* Title */}
        <h1 style={{ 
          'font-size': '3rem', 
          'font-weight': '800', 
          'margin-bottom': '1rem',
          color: 'var(--text)',
          'letter-spacing': '-0.03em',
          'line-height': '1.1'
        }}>
          Koro i18n
        </h1>

        {/* Subtitle */}
        <p style={{ 
          'font-size': '1.25rem', 
          color: 'var(--text-secondary)', 
          'margin-bottom': '2.5rem',
          'line-height': '1.6',
          'max-width': '28rem',
          margin: '0 auto 2.5rem'
        }}>
          {t('home.subtitle') || 'Streamlined translation management for modern development teams.'}
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', gap: '1rem' }}>
          {user() ? (
            <button
              onClick={() => navigate('/dashboard')}
              class="btn primary lg"
              style={{ 
                padding: '1rem 2.5rem', 
                'font-size': '1.0625rem',
                'border-radius': 'var(--radius-lg)'
              }}
            >
              {t('home.goToDashboard') || 'Go to Dashboard'} →
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              class="btn primary lg"
              style={{ 
                padding: '1rem 2.5rem', 
                'font-size': '1.0625rem',
                'border-radius': 'var(--radius-lg)'
              }}
            >
              {t('home.signInWithGitHub') || 'Get Started with GitHub'}
            </button>
          )}
        </div>

        {/* Feature Pills */}
        <div style={{ 
          'margin-top': '4rem', 
          display: 'flex', 
          'justify-content': 'center', 
          'flex-wrap': 'wrap',
          gap: '0.75rem'
        }}>
          <span style={{ 
            display: 'inline-flex', 
            'align-items': 'center', 
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            'border-radius': '999px',
            'font-size': '0.9375rem',
            color: 'var(--text-secondary)',
            'box-shadow': 'var(--shadow-xs)'
          }}>
            <span>⚡</span> Fast & Real-time
          </span>
          <span style={{ 
            display: 'inline-flex', 
            'align-items': 'center', 
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            'border-radius': '999px',
            'font-size': '0.9375rem',
            color: 'var(--text-secondary)',
            'box-shadow': 'var(--shadow-xs)'
          }}>
            <span>🔗</span> GitHub Integration
          </span>
          <span style={{ 
            display: 'inline-flex', 
            'align-items': 'center', 
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            'border-radius': '999px',
            'font-size': '0.9375rem',
            color: 'var(--text-secondary)',
            'box-shadow': 'var(--shadow-xs)'
          }}>
            <span>🆓</span> Free & Open Source
          </span>
        </div>
      </div>
    </div>
  );
}