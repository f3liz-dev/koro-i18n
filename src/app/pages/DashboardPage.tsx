import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal, For } from 'solid-js';
import { user } from '../auth';

interface Project {
  id: string;
  name: string;
  repository: string;
  languages: string[];
  progress: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  // Mock projects (in real app, fetch from API)
  const [projects] = createSignal<Project[]>([
    {
      id: 'owner/repo',
      name: 'My Awesome App',
      repository: 'owner/repo',
      languages: ['ja', 'es', 'fr', 'de'],
      progress: 65,
    },
    {
      id: 'owner/another-repo',
      name: 'Another Project',
      repository: 'owner/another-repo',
      languages: ['ja', 'zh', 'ko'],
      progress: 30,
    },
  ]);

  createEffect(() => {
    if (!user()) navigate('/login', { replace: true });
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p class="text-sm text-gray-600">Welcome back, {user()?.username}!</p>
            </div>
            <div class="flex items-center gap-4">
              <button
                onClick={() => navigate('/history')}
                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                View History
              </button>
              <button
                onClick={handleLogout}
                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-sm text-gray-600 mb-1">Total Projects</div>
            <div class="text-3xl font-bold text-gray-900">{projects().length}</div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-sm text-gray-600 mb-1">Languages</div>
            <div class="text-3xl font-bold text-blue-600">
              {[...new Set(projects().flatMap(p => p.languages))].length}
            </div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-sm text-gray-600 mb-1">Avg Progress</div>
            <div class="text-3xl font-bold text-green-600">
              {Math.round(projects().reduce((sum, p) => sum + p.progress, 0) / projects().length)}%
            </div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-sm text-gray-600 mb-1">Pending Reviews</div>
            <div class="text-3xl font-bold text-yellow-600">12</div>
          </div>
        </div>

        {/* Projects */}
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold">Your Projects</h2>
              <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                + New Project
              </button>
            </div>
          </div>
          <div class="divide-y">
            <For each={projects()}>
              {(project) => (
                <div class="p-6 hover:bg-gray-50 transition">
                  <div class="flex items-start justify-between mb-4">
                    <div>
                      <h3 class="text-lg font-semibold text-gray-900 mb-1">
                        {project.name}
                      </h3>
                      <p class="text-sm text-gray-600">
                        <code class="bg-gray-100 px-2 py-1 rounded">{project.repository}</code>
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        onClick={() => navigate(`/projects/${project.id}/translate/ja`)}
                        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Translate
                      </button>
                      <button class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                        Settings
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div class="mb-3">
                    <div class="flex items-center justify-between text-sm mb-1">
                      <span class="text-gray-600">Translation Progress</span>
                      <span class="font-medium text-gray-900">{project.progress}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div
                        class="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Languages */}
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600">Languages:</span>
                    <div class="flex gap-2">
                      <For each={project.languages}>
                        {(lang) => (
                          <button
                            onClick={() => navigate(`/projects/${project.id}/translate/${lang}`)}
                            class="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                          >
                            {lang.toUpperCase()}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Quick Actions */}
        <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/history')}
            class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition text-left"
          >
            <div class="text-3xl mb-3">📜</div>
            <h3 class="text-lg font-semibold mb-2">Translation History</h3>
            <p class="text-sm text-gray-600">
              View complete audit trail of all translation actions
            </p>
          </button>

          <button class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition text-left">
            <div class="text-3xl mb-3">👥</div>
            <h3 class="text-lg font-semibold mb-2">Contributors</h3>
            <p class="text-sm text-gray-600">
              Manage team members and their permissions
            </p>
          </button>

          <button class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition text-left">
            <div class="text-3xl mb-3">⚙️</div>
            <h3 class="text-lg font-semibold mb-2">Settings</h3>
            <p class="text-sm text-gray-600">
              Configure projects, languages, and integrations
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}