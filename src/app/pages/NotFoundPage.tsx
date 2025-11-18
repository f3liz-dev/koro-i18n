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
            width: 8rem;
            height: 8rem;
            background: var(--color-gray-100);
            border: 2px solid var(--color-gray-300);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="font-size: 3.5rem; font-weight: 800; color: var(--color-gray-600);">404</span>
          </div>
        </div>
        <h2 style="font-size: 1.75rem; font-weight: 700; color: var(--color-black); margin-bottom: 0.75rem;">{t('notFound.title')}</h2>
        <p style="color: var(--color-gray-600); margin-bottom: 2rem; font-size: 0.875rem;">
          {t('notFound.description')}
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; justify-content: center;">
          <button
            onClick={() => navigate('/')}
            class="btn primary"
            style="justify-content: center;"
          >
            {t('common.goHome')}
          </button>
          <button
            onClick={() => window.history.back()}
            class="btn"
            style="justify-content: center;"
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}
