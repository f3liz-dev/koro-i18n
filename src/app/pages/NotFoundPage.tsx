import { useNavigate } from '@solidjs/router';
import { useI18n } from '../utils/i18n';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div class="page animate-fade-in" style={{
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'min-height': '60vh',
      'text-align': 'center',
      padding: '2rem'
    }}>
      <div style={{ 'max-width': '24rem' }}>
        <div style={{
          width: '6rem',
          height: '6rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          'border-radius': '50%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          margin: '0 auto 1.5rem',
          'font-size': '2rem',
          'font-weight': '700',
          color: 'var(--text-secondary)'
        }}>
          404
        </div>
        <h2 style={{ 'font-size': '1.5rem', 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
          {t('notFound.title') || 'Page Not Found'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', 'margin-bottom': '2rem', 'font-size': '0.875rem' }}>
          {t('notFound.description') || 'The page you are looking for does not exist.'}
        </p>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
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
