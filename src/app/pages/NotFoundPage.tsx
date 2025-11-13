import { useNavigate } from '@solidjs/router';
import { useForesight } from '../utils/useForesight';

export default function NotFoundPage() {
  const navigate = useNavigate();

  const homeButtonRef = useForesight({
    prefetchUrls: ['/api/user'],
    debugName: 'home-button',
  });

  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div class="text-center max-w-md">
        <h1 class="text-9xl font-bold text-gray-900 mb-4">404</h1>
        <h2 class="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
        <p class="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            ref={homeButtonRef}
            onClick={() => navigate('/')}
            class="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Go to Home
          </button>
          <button
            onClick={() => window.history.back()}
            class="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
