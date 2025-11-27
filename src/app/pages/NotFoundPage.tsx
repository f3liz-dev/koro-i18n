import { useNavigate } from '@solidjs/router';
import { useI18n } from '../utils/i18n';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div class="animate-fade-in" style={{
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'min-height': '65vh',
      'text-align': 'center',
      padding: '2rem'
    }}>
      <div style={{ 'max-width': '28rem' }}>
        <div style={{
          width: '7rem',
          height: '7rem',
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          'border-radius': '50%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          margin: '0 auto 2rem',
          'font-size': '2.5rem',
          'font-weight': '800',
          color: 'var(--text-muted)'
        }}>
          404
        </div>
        <h2 style={{ 
          'font-size': '1.75rem', 
          'font-weight': '700', 
          'margin-bottom': '0.75rem',
          'letter-spacing': '-0.02em'
        }}>
          {t('notFound.title') || 'Page Not Found'}
        </h2>
        <p style={{ 
          color: 'var(--text-secondary)', 
          'margin-bottom': '2.5rem', 
          'font-size': '1rem',
          'line-height': '1.6'
        }}>
          {t('notFound.description') || "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem', 'max-width': '16rem', margin: '0 auto' }}>
          <button onClick={() => navigate('/')} class="btn primary">
            {t('common.goHome') || 'Go Home'}
          </button>
          <button onClick={() => window.history.back()} class="btn ghost">
            {t('common.goBack') || '← Go Back'}
          </button>
        </div>
      </div>
    </div>
  );
}
