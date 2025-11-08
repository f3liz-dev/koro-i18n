import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal, For, onMount } from 'solid-js';
import { user, auth } from '../auth';

interface Project {
  id: string;
  name: string;
  repository: string;
  languages: string[];
  progress: number;
}

interface ApiKey {
  id: string;
  projectId: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  revoked: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [projects] = createSignal<Project[]>([]);
  const [apiKeys, setApiKeys] = createSignal<ApiKey[]>([]);
  const [showNewKeyModal, setShowNewKeyModal] = createSignal(false);
  const [newKeyProject, setNewKeyProject] = createSignal('');
  const [newKeyName, setNewKeyName] = createSignal('');
  const [generatedKey, setGeneratedKey] = createSignal<string | null>(null);

  const loadApiKeys = async () => {
    try {
      const res = await fetch('/api/keys', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const handleGenerateKey = async () => {
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: newKeyProject(),
          name: newKeyName(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
        setNewKeyProject('');
        setNewKeyName('');
      } else {
        alert('Failed to generate key');
      }
    } catch (error) {
      console.error('Failed to generate key:', error);
      alert('Failed to generate key');
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this key? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        loadApiKeys();
      } else {
        alert('Failed to revoke key');
      }
    } catch (error) {
      console.error('Failed to revoke key:', error);
      alert('Failed to revoke key');
    }
  };

  onMount(() => {
    auth.refresh();
    loadApiKeys();
  });

  createEffect(() => {
    if (!user()) navigate('/login', { replace: true });
  });

  const handleLogout = async () => {
    await auth.logout();
  };

  return (
    <div class="min-h-screen bg-white">
      <div class="border-b">
        <div class="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button onClick={() => navigate('/')} class="text-lg font-semibold hover:text-gray-600">i18n</button>
            <span class="text-gray-300">/</span>
            <span class="text-sm text-gray-600">{user()?.username}</span>
          </div>
          <div class="flex items-center gap-1">
            <button
              onClick={() => navigate('/history')}
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded hover:bg-gray-50"
            >
              History
            </button>
            <button
              onClick={handleLogout}
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-8 py-16">
        <div class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold">API Keys</h2>
            <button
              onClick={() => setShowNewKeyModal(true)}
              class="px-4 py-2 text-sm border rounded hover:bg-gray-50"
            >
              Generate Key
            </button>
          </div>
          
          {apiKeys().length === 0 ? (
            <div class="border rounded-lg p-8 text-center">
              <p class="text-sm text-gray-400">No API keys yet</p>
            </div>
          ) : (
            <div class="border rounded-lg divide-y">
              <For each={apiKeys()}>
                {(key) => (
                  <div class="p-4 flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-1">
                        <span class="font-medium text-sm">{key.name}</span>
                        {key.revoked ? (
                          <span class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">Revoked</span>
                        ) : (
                          <span class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Active</span>
                        )}
                      </div>
                      <code class="text-xs text-gray-500">{key.projectId}</code>
                      <div class="text-xs text-gray-400 mt-1">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt && ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    {!key.revoked && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        class="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                )}
              </For>
            </div>
          )}
        </div>

        <div>
          <h2 class="text-lg font-semibold mb-6">Projects</h2>
          {projects().length === 0 ? (
            <div class="border rounded-lg p-8 text-center">
              <p class="text-sm text-gray-400 mb-2">No projects yet</p>
              <p class="text-xs text-gray-400">Upload translation files to get started</p>
            </div>
          ) : (
            <div class="space-y-3">
              <For each={projects()}>
                {(project) => (
                  <div class="border rounded-lg p-6 hover:border-gray-400 transition">
                    <div class="flex items-start justify-between mb-4">
                      <div>
                        <h3 class="font-medium text-gray-900 mb-1.5">{project.name}</h3>
                        <code class="text-xs text-gray-500">{project.repository}</code>
                      </div>
                      <button
                        onClick={() => navigate(`/projects/${project.id}/translate/ja`)}
                        class="px-4 py-2 text-sm border rounded hover:bg-gray-50"
                      >
                        Translate
                      </button>
                    </div>
                    <div class="flex gap-2">
                      <For each={project.languages}>
                        {(lang) => (
                          <button
                            onClick={() => navigate(`/projects/${project.id}/translate/${lang}`)}
                            class="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                          >
                            {lang}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </div>
      </div>

      {/* New Key Modal */}
      {showNewKeyModal() && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowNewKeyModal(false)}>
          <div class="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-semibold mb-4">Generate API Key</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Project ID</label>
                <input
                  type="text"
                  value={newKeyProject()}
                  onInput={(e) => setNewKeyProject(e.currentTarget.value)}
                  placeholder="owner/repo"
                  class="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newKeyName()}
                  onInput={(e) => setNewKeyName(e.currentTarget.value)}
                  placeholder="GitHub Actions"
                  class="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div class="flex gap-2">
                <button
                  onClick={handleGenerateKey}
                  disabled={!newKeyProject() || !newKeyName()}
                  class="flex-1 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Generate
                </button>
                <button
                  onClick={() => setShowNewKeyModal(false)}
                  class="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Key Modal */}
      {generatedKey() && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6">
          <div class="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 class="text-lg font-semibold mb-4">API Key Generated</h3>
            <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p class="text-sm text-yellow-800 mb-2">⚠️ Save this key securely. It will not be shown again.</p>
            </div>
            <div class="bg-gray-50 rounded p-4 mb-4">
              <code class="text-xs break-all">{generatedKey()}</code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedKey()!);
                setGeneratedKey(null);
                setShowNewKeyModal(false);
                loadApiKeys();
              }}
              class="w-full px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm"
            >
              Copy & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}