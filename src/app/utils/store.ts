import { createSignal, createResource } from 'solid-js';
import { query } from '@solidjs/router';
import { authFetch } from './authFetch';

export interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
  sourceLanguage: string;
  accessControl?: 'whitelist' | 'blacklist';
  languages?: string[];
}

const [projectsKey, refetchProjects] = createSignal(0);

const projectsQuery = query(async () => {
  const res = await authFetch('/api/projects?includeLanguages=true');
  if (!res.ok) return [];
  const data = await res.json() as { projects: Project[] };
  return data.projects;
}, 'projects');

export const [projects] = createResource(projectsKey, () => projectsQuery());

export function refreshProjects() {
  refetchProjects(k => k + 1);
}

export async function fetchProject(id: string): Promise<Project | null> {
  const res = await authFetch('/api/projects');
  if (!res.ok) return null;
  const data = await res.json() as { projects: Project[] };
  return data.projects.find(p => p.id === id) || null;
}

export async function fetchFiles(projectId: string, language?: string, filename?: string) {
  let url = `/api/projects/${projectId}/files`;
  const params = new URLSearchParams();
  if (language) params.append('lang', language);
  if (filename) params.append('filename', filename);
  if (params.toString()) url += `?${params}`;
  
  const res = await authFetch(url);
  if (!res.ok) throw new Error('Failed to fetch files');
  return res.json();
}

export async function fetchFilesSummary(projectId: string, language?: string) {
  let url = `/api/projects/${projectId}/files/summary`;
  if (language && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)) {
    url += `?lang=${language}`;
  }
  
  const res = await authFetch(url);
  if (!res.ok) throw new Error('Failed to fetch files summary');
  return res.json();
}

export const fetchFilesSummaryQuery = query(async (projectId: string, language?: string) => {
  let url = `/api/projects/${projectId}/files/summary`;
  if (language && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)) {
    url += `?lang=${language}`;
  }
  const res = await authFetch(url);
  if (!res.ok) throw new Error('Failed to fetch files summary');
  return res.json();
}, 'fetchFilesSummary');

export async function fetchTranslations(projectId: string, language: string, status?: string) {
  const params = new URLSearchParams({ projectId, language });
  if (status) params.append('status', status);
  
  const res = await authFetch(`/api/translations?${params}`);
  if (!res.ok) throw new Error('Failed to fetch translations');
  return res.json();
}

export async function fetchSuggestions(projectId: string, language: string, key?: string) {
  const params = new URLSearchParams({ projectId, language });
  if (key) params.append('key', key);
  
  const res = await authFetch(`/api/translations/suggestions?${params}`);
  if (!res.ok) throw new Error('Failed to fetch suggestions');
  return res.json();
}

export const fetchSuggestionsQuery = query(async (projectId: string, language: string) => {
  const params = new URLSearchParams({ projectId, language });
  const res = await authFetch(`/api/translations/suggestions?${params}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch suggestions');
  const data = await res.json() as { suggestions?: any[] };
  return data;
}, 'fetchSuggestions');

export const fetchAllProjectsQuery = query(async () => {
  const res = await authFetch('/api/projects/all', { credentials: 'include' });
  if (!res.ok) return [];
  const data = await res.json() as { projects?: Project[] };
  return data.projects || [];
}, 'fetchAllProjects');

export async function fetchMembers(projectId: string) {
  const res = await authFetch(`/api/projects/${projectId}/members`);
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
}

export const fetchMembersQuery = query(async (projectId: string) => {
  const res = await authFetch(`/api/projects/${projectId}/members`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch members');
  const data = await res.json();
  return data;
}, 'fetchMembers');
