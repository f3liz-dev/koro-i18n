import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal } from 'solid-js';
import { useAuth } from '../auth';
import { useI18n } from '../utils/i18n';
import { LanguageSelector } from '../components';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [isVerifying, setIsVerifying] = createSignal(false);

  createEffect(() => {
    const currentUser = user();
    if (currentUser && !isVerifying()) {
      setIsVerifying(true);

      fetch('/api/auth/me', { credentials: 'include' })
        .then(async (res) => {
          if (res.ok) {
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
              sessionStorage.removeItem('redirectAfterLogin');
              navigate(redirectUrl, { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } else {
            setIsVerifying(false);
          }
        })
        .catch(() => {
          setIsVerifying(false);
        });
    }
  });

  const handleLogin = () => {
    window.location.href = '/api/auth/github';
  };

  return (
    <div class="flex flex-col items-center justify-center min-h-[80vh] relative">
      <div class="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div class="w-full max-w-md animate-fade-in-up">
        <div class="card bg-white/80 backdrop-blur-sm border border-white shadow-xl rounded-3xl p-8 md:p-12">
          <div class="mb-8 flex justify-center">
            <div class="p-4 bg-primary-50 rounded-full">
              <div class="text-5xl">🐱</div>
            </div>
          </div>

          <h1 class="text-2xl font-bold text-center mb-8 text-neutral-800">
            {t('login.title')}
          </h1>

          <button
            onClick={handleLogin}
            class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <div class="i-carbon-logo-github text-xl" />
            <span>{t('login.continueWithGitHub')}</span>
          </button>

          <div class="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              class="text-sm text-neutral-500 hover:text-primary-500 transition-colors"
            >
              {t('login.backToHome')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}