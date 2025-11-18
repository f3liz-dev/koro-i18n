import { useNavigate } from '@solidjs/router';
import { useI18n } from '../utils/i18n';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div class="kawaii-page flex items-center justify-center px-6">
      <div class="text-center max-w-md animate-slide-up">
        <div style="margin-bottom: 32px; display: flex; justify-content: center;">
          <div style="width: 128px; height: 128px; background: linear-gradient(135deg, var(--kawaii-pink), var(--kawaii-peach)); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: var(--kawaii-hover-shadow);">
            <span class="kawaii-text-gradient" style="font-size: 56px; font-weight: 900;">404</span>
          </div>
        </div>
        <h2 style="font-size: 28px; font-weight: 800; color: var(--kawaii-ink); margin-bottom: 12px;">{t('notFound.title')}</h2>
        <p style="color: var(--kawaii-muted); margin-bottom: 32px; font-size: 14px;">
          {t('notFound.description')}
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px; justify-content: center;">
          <button
            onClick={() => navigate('/')}
            class="kawaii-btn primary"
            style="justify-content: center;"
          >
            {t('common.goHome')}
          </button>
          <button
            onClick={() => window.history.back()}
            class="kawaii-btn secondary"
            style="justify-content: center;"
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}
