import { useNavigate } from '@solidjs/router';
import { createSignal, onMount } from 'solid-js';
import { user } from '../auth';
import { useForesight } from '../utils/useForesight';
import { authFetch } from '../utils/authFetch';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = createSignal('');
  const [projectRepo, setProjectRepo] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  const backButtonRef = useForesight({
    prefetchUrls: ['/api/projects'],
    debugName: 'back-to-dashboard',
  });

  onMount(() => {
    if (!user()) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      navigate('/login', { replace: true });
    }
  });

  const handleCreateProject = async (e: Event) => {
    e.preventDefault();
    if (isSubmitting()) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName(),
          repository: projectRepo(),
        }),
      });

      if (res.ok) {
        await res.json();
        navigate(`/projects/${projectName()}`);
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      setError('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30">
      <div class="bg-white border-b border-gray-200 backdrop-blur-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center gap-3">
            <button
              ref={backButtonRef}
              onClick={() => navigate('/dashboard')}
              class="text-gray-400 hover:text-primary-600 transition-colors p-2 -ml-2 rounded-lg hover:bg-primary-50"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900">Create New Project</h1>
          </div>
        </div>
      </div>

      <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-slide-up">
        <div class="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Start a New Translation Project</h2>
            <p class="text-gray-600">Connect your GitHub repository to manage translations</p>
          </div>
          
          <form onSubmit={handleCreateProject} class="space-y-6">
            <div>
              <label class="block text-sm font-semibold text-gray-900 mb-2">
                GitHub Repository
              </label>
              <input
                type="text"
                value={projectRepo()}
                onInput={(e) => setProjectRepo(e.currentTarget.value)}
                placeholder="owner/repo"
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
              />
              <p class="text-xs text-gray-500 mt-2">
                Format: owner/repo (e.g., facebook/react)
              </p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-900 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName()}
                onInput={(e) => setProjectName(e.currentTarget.value)}
                placeholder="My Project"
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
              />
              <p class="text-xs text-gray-500 mt-2">
                A friendly name for your project
              </p>
            </div>

            {error() && (
              <div class="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-sm text-red-700 animate-slide-down">
                {error()}
              </div>
            )}

            <div class="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={!projectRepo() || !projectName() || isSubmitting()}
                class="flex-1 px-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
              >
                {isSubmitting() ? 'Creating...' : 'Create Project'}
              </button>
              <button
                type="button"
                ref={backButtonRef}
                onClick={() => navigate('/dashboard')}
                class="px-6 py-3.5 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
