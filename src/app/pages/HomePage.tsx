import { useNavigate } from '@solidjs/router';
import { user } from '../auth';
import { useI18n } from '../utils/i18n';
import { LanguageSelector } from '../components';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center px-6">
      <div class="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <div class="text-center max-w-2xl mx-auto animate-slide-up">
        <div class="mb-12 flex justify-center">
          <div class="relative">
            <div class="absolute inset-0 bg-primary-200 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <img 
              src="/logo.png" 
              alt="Koro i18n - Kawaii hermit crab mascot" 
              class="relative w-40 h-40 object-contain drop-shadow-lg"
            />
          </div>
        </div>
        
        <h1 class="text-6xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-4">
          {t('home.title')}
        </h1>
        <p class="text-xl text-gray-700 mb-12 font-medium">
          {t('home.subtitle')}
        </p>
        
        {user() ? (
          <button
            onClick={() => navigate('/dashboard')}
            class="px-10 py-4 text-base font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {t('home.goToDashboard')}
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            class="px-10 py-4 text-base font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {t('home.signInWithGitHub')}
          </button>
        )}
      </div>
    </div>
  );
}