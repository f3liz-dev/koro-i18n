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

  // ForesightJS refs
  const backButtonRef = useForesight({
    prefetchUrls: ['/api/projects'],
    debugName: 'back-to-dashboard',
  });

  onMount(() => {
    if (!user()) {
      // Save the current URL to sessionStorage before redirecting to login
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
        // Navigate to the project page
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
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center gap-3">
            <button
              ref={backButtonRef}
              onClick={() => navigate('/dashboard')}
              class="text-gray-400 hover:text-gray-600 active:text-gray-700 transition"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 class="text-xl font-semibold text-gray-900">Create New Project</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white rounded-lg border p-6 sm:p-8">
          <form onSubmit={handleCreateProject} class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                Repository
              </label>
              <input
                type="text"
                value={projectRepo()}
                onInput={(e) => setProjectRepo(e.currentTarget.value)}
                placeholder="owner/repo"
                required
                class="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p class="text-xs text-gray-500 mt-1.5">
                Format: owner/repo (e.g., facebook/react)
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName()}
                onInput={(e) => setProjectName(e.currentTarget.value)}
                placeholder="My Project"
                required
                class="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p class="text-xs text-gray-500 mt-1.5">
                A friendly name for your project
              </p>
            </div>

            {error() && (
              <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error()}
              </div>
            )}

            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!projectRepo() || !projectName() || isSubmitting()}
                class="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:bg-gray-950 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
              >
                {isSubmitting() ? 'Creating...' : 'Create Project'}
              </button>
              <button
                type="button"
                ref={backButtonRef}
                onClick={() => navigate('/dashboard')}
                class="px-4 py-2.5 border rounded-lg hover:bg-gray-50 active:bg-gray-100 text-sm font-medium transition"
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
