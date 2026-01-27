export interface Project {
  name: string;
  description?: string;
  repository?: string;
  role?: string;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch projects');
  const data = await res.json();
  return data.projects || [];
}

export async function fetchProject(name: string): Promise<Project | null> {
  const res = await fetch(`/api/projects/${encodeURIComponent(name)}`, { credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.project || null;
}

export interface FileEntry {
  lang: string;
  filename: string;
  commitSha?: string;
  sourceFilename?: string;
  lastUpdated?: string;
}

export async function fetchProjectFiles(projectName: string, language?: string): Promise<FileEntry[]> {
  const qs = language ? `?language=${encodeURIComponent(language)}` : '';
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/files${qs}`, { 
    credentials: 'include',
    headers: {
      'Cache-Control': 'max-age=60'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch files');
  const data = await res.json();
  return data.files || [];
}

export interface SummaryEntry {
  filename: string;
  lang: string;
  totalKeys: number;
  translatedKeys: number;
  gitTranslatedKeys?: number;
  gitTranslationPercentage?: number;
  translationPercentage: number;
  lastUpdated?: string;
  commitHash?: string;
}

export async function fetchFilesSummary(projectName: string, language?: string): Promise<{ files: SummaryEntry[]; sourceLanguage?: string }> {
  const qs = language ? `?lang=${encodeURIComponent(language)}` : '';
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/files/summary${qs}`, { 
    credentials: 'include',
    headers: {
      'Cache-Control': 'max-age=60'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return await res.json();
}

export interface TranslationFileData {
  source: Record<string, string>;
  target: Record<string, string>;
  pending: any[];
  approved: any[];
  reconciliation: Record<string, any>;
  virtualSuggestions: Array<{ key: string; value: string; source: string }>;
  sourceLanguage?: string;
  targetLanguage?: string;
  filename?: string;
  commitSha?: string;
}

export async function fetchTranslationFile(projectName: string, language: string, filename: string): Promise<TranslationFileData> {
  const encoded = encodeURIComponent(filename);
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/translations/file/${encodeURIComponent(language)}/${encoded}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch translation file');
  return await res.json();
}

export async function refreshProjectFiles(projectName: string, branch?: string): Promise<any> {
  const body = branch ? { branch } : {};
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/files/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to refresh project files');
  return await res.json();
}

export async function submitTranslation(projectName: string, language: string, filename: string, key: string, value: string): Promise<any> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/translations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, filename, key, value }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Failed to submit translation');
  }
  return await res.json();
}

export async function approveTranslation(projectName: string, id: string, status: 'approved' | 'rejected'): Promise<any> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/translations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Failed to update translation status');
  }
  return await res.json();
}

export async function deleteTranslation(projectName: string, id: string): Promise<any> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/translations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Failed to delete translation');
  }
  return await res.json();
}
