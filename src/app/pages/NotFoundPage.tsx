import { useNavigate } from '@solidjs/router';
import { useI18n } from '../utils/i18n';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30 flex items-center justify-center px-6">
      <div class="text-center max-w-md animate-slide-up">
        <div class="mb-8 flex justify-center">
          <div class="w-32 h-32 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full flex items-center justify-center">
            <span class="text-6xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">404</span>
          </div>
        </div>
        <h2 class="text-3xl font-bold text-gray-900 mb-3">{t('notFound.title')}</h2>
        <p class="text-gray-600 mb-8">
          {t('notFound.description')}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            class="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {t('common.goHome')}
          </button>
          <button
            onClick={() => window.history.back()}
            class="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}
