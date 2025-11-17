import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal } from 'solid-js';
import { user } from '../auth';
import { useForesight } from '../utils/useForesight';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = createSignal(false);

  const backButtonRef = useForesight({
    prefetchUrls: [],
    debugName: 'back-to-home',
  });

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
    <div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center px-6">
      <div class="w-full max-w-md animate-slide-up">
        <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div class="mb-8 flex justify-center">
            <div class="relative">
              <div class="absolute inset-0 bg-primary-200 rounded-full blur-2xl opacity-30"></div>
              <img 
                src="/logo.png" 
                alt="Koro i18n - Kawaii hermit crab mascot" 
                class="relative w-24 h-24 object-contain drop-shadow-md"
              />
            </div>
          </div>
          
          <h1 class="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          
          <button
            onClick={handleLogin}
            class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
          
          <div class="mt-8 text-center">
            <button
              ref={backButtonRef}
              onClick={() => navigate('/')}
              class="text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}