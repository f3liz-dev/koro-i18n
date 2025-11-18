import { useNavigate } from '@solidjs/router';
import { useI18n } from '../utils/i18n';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div class="page" style="display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
      <div class="animate-slide-up" style="text-align: center; max-width: 28rem;">
        <div style="margin-bottom: 2rem; display: flex; justify-content: center;">
          <div style="
            width: 9rem;
            height: 9rem;
            background: linear-gradient(135deg, var(--color-peach-soft) 0%, var(--color-lavender-soft) 50%, var(--color-gray-blue) 100%);
            border: var(--border);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--shadow-medium);
          ">
            <span style="font-size: 3rem; font-weight: 700; color: var(--color-bg-surface);">404</span>
          </div>
        </div>
        <h2 style="font-size: 1.75rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.75rem;">{t('notFound.title')}</h2>
        <p style="color: var(--color-text-secondary); margin-bottom: 2rem; font-size: 0.875rem; line-height: 1.6;">
          {t('notFound.description')}
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; justify-content: center;">
          <button
            onClick={() => navigate('/')}
            class="btn primary"
            style="justify-content: center; border-radius: var(--radius);"
          >
            {t('common.goHome')}
          </button>
          <button
            onClick={() => window.history.back()}
            class="btn"
            style="justify-content: center; border-radius: var(--radius);"
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}
