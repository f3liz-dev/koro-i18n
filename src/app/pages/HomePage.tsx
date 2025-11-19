import { useNavigate } from '@solidjs/router';
import { useAuth } from '../auth';
import { useI18n } from '../utils/i18n';
import { LanguageSelector } from '../components';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <div class="flex flex-col items-center justify-center min-h-[80vh] relative">
      <div class="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div class="text-center max-w-2xl mx-auto animate-fade-in-up">
        <div class="mb-8 flex justify-center">
          <div class="p-8 bg-white rounded-full shadow-lg border-4 border-primary-100 transform hover:scale-105 transition-transform duration-300">
            <div class="text-8xl filter drop-shadow-md">🐱</div>
          </div>
        </div>

        <h1 class="text-5xl md:text-6xl font-serif font-bold mb-6 text-neutral-800 tracking-tight">
          <span class="text-primary-500">Koro</span> i18n
        </h1>

        <p class="text-xl text-neutral-600 mb-10 leading-relaxed max-w-lg mx-auto">
          {t('home.subtitle') || 'The cutest way to manage your translations. Simple, fast, and purr-fectly organized.'}
        </p>

        <div class="flex flex-col items-center gap-4">
          {user() ? (
            <button
              onClick={() => navigate('/dashboard')}
              class="btn-primary text-lg px-8 py-4 shadow-xl shadow-primary-200 hover:shadow-primary-300 transform hover:-translate-y-1"
            >
              <span>{t('home.goToDashboard')}</span>
              <div class="i-carbon-arrow-right" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              class="btn-primary text-lg px-8 py-4 shadow-xl shadow-primary-200 hover:shadow-primary-300 transform hover:-translate-y-1"
            >
              <div class="i-carbon-logo-github text-xl" />
              <span>{t('home.signInWithGitHub')}</span>
            </button>
          )}

          <div class="mt-8 flex gap-8 text-neutral-400">
            <div class="flex flex-col items-center gap-2">
              <div class="i-carbon-flash text-2xl text-primary-300" />
              <span class="text-xs font-medium">Fast</span>
            </div>
            <div class="flex flex-col items-center gap-2">
              <div class="i-carbon-cloud text-2xl text-primary-300" />
              <span class="text-xs font-medium">Cloudflare</span>
            </div>
            <div class="flex flex-col items-center gap-2">
              <div class="i-carbon-favorite text-2xl text-primary-300" />
              <span class="text-xs font-medium">Free</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}