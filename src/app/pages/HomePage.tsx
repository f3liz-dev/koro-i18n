import { useNavigate } from '@solidjs/router';
import { user } from '../auth';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div class="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6">
      <div class="text-center max-w-2xl mx-auto">
        <div class="mb-8 flex justify-center">
          <img 
            src="/logo.png" 
            alt="Koro i18n - Kawaii hermit crab mascot" 
            class="w-32 h-32 object-contain"
          />
        </div>
        <h1 class="text-5xl font-bold text-gray-900 mb-4">koro-i18n</h1>
        <p class="text-lg text-gray-600 mb-12">Modern translation management platform</p>
        {user() ? (
          <button
            onClick={() => navigate('/dashboard')}
            class="px-8 py-3 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Go to Dashboard
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            class="px-8 py-3 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Sign in with GitHub
          </button>
        )}
      </div>
    </div>
  );
}