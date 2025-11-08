import { useNavigate } from '@solidjs/router';
import { user } from '../auth';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div class="min-h-screen bg-white flex items-center justify-center px-6">
      <div class="text-center">
        <h1 class="text-3xl font-semibold text-gray-900 mb-12">i18n Platform</h1>
        {user() ? (
          <button
            onClick={() => navigate('/dashboard')}
            class="px-6 py-2.5 border rounded hover:bg-gray-50"
          >
            Dashboard
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            class="px-6 py-2.5 border rounded hover:bg-gray-50"
          >
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}