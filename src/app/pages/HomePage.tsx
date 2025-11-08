import { useNavigate } from '@solidjs/router';
import { user } from '../auth';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div class="max-w-4xl mx-auto px-4 py-16">
        <div class="text-center mb-12">
          <h1 class="text-6xl font-bold text-gray-900 mb-4">
            🌍 I18n Platform
          </h1>
          <p class="text-xl text-gray-600 mb-8">
            Lightweight internationalization platform with GitHub integration
          </p>
          <div class="flex justify-center gap-4">
            {user() ? (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => navigate('/history')}
                  class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  View History
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                class="px-8 py-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium text-lg"
              >
                Get Started →
              </button>
            )}
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-4xl mb-4">🔐</div>
            <h3 class="text-lg font-semibold mb-2">GitHub OAuth</h3>
            <p class="text-gray-600 text-sm">
              Secure authentication with your GitHub account. No passwords to remember.
            </p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-4xl mb-4">⚡</div>
            <h3 class="text-lg font-semibold mb-2">Stateless JWT</h3>
            <p class="text-gray-600 text-sm">
              No session storage. Pure JWT-based auth that scales horizontally.
            </p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-4xl mb-4">📦</div>
            <h3 class="text-lg font-semibold mb-2">Batch Commits</h3>
            <p class="text-gray-600 text-sm">
              Translations are batched and committed automatically with co-author attribution.
            </p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-4xl mb-4">📝</div>
            <h3 class="text-lg font-semibold mb-2">Complete History</h3>
            <p class="text-gray-600 text-sm">
              Every action is logged. See who submitted, approved, or deleted translations.
            </p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-4xl mb-4">🚀</div>
            <h3 class="text-lg font-semibold mb-2">Edge Deployment</h3>
            <p class="text-gray-600 text-sm">
              Deploy on Cloudflare Workers for global edge performance.
            </p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-4xl mb-4">💰</div>
            <h3 class="text-lg font-semibold mb-2">Free Tier</h3>
            <p class="text-gray-600 text-sm">
              Completely free for 1000+ daily users with D1 and Workers free tier.
            </p>
          </div>
        </div>

        <div class="bg-white p-8 rounded-lg shadow text-center">
          <h2 class="text-2xl font-bold mb-4">How It Works</h2>
          <div class="flex flex-col lg:flex-row items-center justify-center gap-4 text-left">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
                <span class="font-medium">Submit Translation</span>
              </div>
              <p class="text-sm text-gray-600 ml-11">
                Users submit translations through the editor
              </p>
            </div>
            <div class="text-2xl text-gray-300">→</div>
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span class="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</span>
                <span class="font-medium">Review & Approve</span>
              </div>
              <p class="text-sm text-gray-600 ml-11">
                Reviewers approve translations for commit
              </p>
            </div>
            <div class="text-2xl text-gray-300">→</div>
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span class="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">3</span>
                <span class="font-medium">Auto Commit</span>
              </div>
              <p class="text-sm text-gray-600 ml-11">
                Cron job commits to GitHub every 5 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}