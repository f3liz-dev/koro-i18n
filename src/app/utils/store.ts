import { createSignal, createResource } from 'solid-js';
import { query } from '@solidjs/router';
import { authFetch } from './authFetch';

// Simple in-memory caches keyed by request URL to respect ETag/304 semantics.
// These allow callers to receive the previous successful response when the
// server replies with 304 Not Modified.
const projectsCache: any[] = [];
const filesCache = new Map<string, any>();
const filesSummaryCache = new Map<string, any>();
const translationsCache = new Map<string, any>();
const suggestionsCache = new Map<string, any>();

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

async function projectsQueryFn() {
  const res = await authFetch('/api/projects?includeLanguages=true', { credentials: 'include' });
  // When the server returns 304, reuse our in-memory cache
  if (!res.ok) {
    if (res.status === 304) return projectsCache;
    return [];
  }
  const data = await res.json() as { projects: Project[] };
  // Update cache
  projectsCache.length = 0;
  projectsCache.push(...(data.projects || []));
  return data.projects;
}

export const [projects] = createResource(projectsKey, () => projectsQueryFn());

export function refreshProjects() {
  refetchProjects(k => k + 1);
}

export async function fetchProject(id: string): Promise<Project | null> {
  const res = await authFetch('/api/projects', { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 304) return projectsCache.find((p: Project) => p.id === id) || null;
    return null;
  }
  const data = await res.json() as { projects: Project[] };
  projectsCache.length = 0;
  projectsCache.push(...(data.projects || []));
  return data.projects.find(p => p.id === id) || null;
}

export async function fetchFiles(projectId: string, language?: string, filename?: string) {
  let url = `/api/projects/${projectId}/files`;
  const params = new URLSearchParams();
  if (language) params.append('lang', language);
  if (filename) params.append('filename', filename);
  if (params.toString()) url += `?${params}`;

  const res = await authFetch(url, { credentials: 'include' });

  if (!res.ok) {
    if (res.status === 304) {
      return filesCache.get(url) || { files: [] };
    }
    throw new Error('Failed to fetch files');
  }

  const data = await res.json();
  filesCache.set(url, data);
  return data;
}

export async function fetchFilesSummary(projectId: string, language?: string) {
  let url = `/api/projects/${projectId}/files/summary`;
  if (language && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)) {
    url += `?lang=${language}`;
  }

  const res = await authFetch(url, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 304) return filesSummaryCache.get(url) || { files: [] };
    throw new Error('Failed to fetch files summary');
  }
  const data = await res.json();
  filesSummaryCache.set(url, data);
  return data;
}

export async function fetchTranslations(projectId: string, language: string, status?: string) {
  const params = new URLSearchParams({ projectId, language });
  if (status) params.append('status', status);

  const url = `/api/translations?${params}`;
  const res = await authFetch(url, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 304) return translationsCache.get(url) || { translations: [] };
    throw new Error('Failed to fetch translations');
  }
  const data = await res.json();
  translationsCache.set(url, data);
  return data;
}

export async function fetchSuggestions(projectId: string, language: string, key?: string) {
  const params = new URLSearchParams({ projectId, language });
  if (key) params.append('key', key);

  const url = `/api/translations/suggestions?${params}`;
  const res = await authFetch(url, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 304) return suggestionsCache.get(url) || { suggestions: [] };
    throw new Error('Failed to fetch suggestions');
  }
  const data = await res.json();
  suggestionsCache.set(url, data);
  return data;
}

// Expose "Query" suffixed async functions for existing callers (they no longer rely on @solidjs/router's query primitive)
export const fetchFilesSummaryQuery = async (projectId: string, language?: string) => {
  return fetchFilesSummary(projectId, language);
};

export const fetchSuggestionsQuery = async (projectId: string, language: string) => {
  const params = new URLSearchParams({ projectId, language });
  const url = `/api/translations/suggestions?${params}`;
  const res = await authFetch(url, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 304) return suggestionsCache.get(url) || { suggestions: [] };
    throw new Error('Failed to fetch suggestions');
  }
  const data = await res.json() as { suggestions?: any[] };
  suggestionsCache.set(url, data);
  return data;
};

export const fetchAllProjectsQuery = async () => {
  const res = await authFetch('/api/projects/all', { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 304) return projectsCache;
    return [];
  }
  const data = await res.json() as { projects?: Project[] };
  // update the canonical projects cache
  projectsCache.length = 0;
  projectsCache.push(...(data.projects || []));
  return data.projects || [];
};

export async function fetchMembers(projectId: string) {
  const res = await authFetch(`/api/projects/${projectId}/members`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
}

export const fetchMembersQuery = async (projectId: string) => {
  const res = await authFetch(`/api/projects/${projectId}/members`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch members');
  const data = await res.json();
  return data;
};

// Factory helpers that must be called inside a Route/component so `query` (which relies on router context)
// runs in the appropriate scope and can provide its cache/invalidations.
export function createProjectsQuery() {
  return query(async () => {
    const res = await authFetch('/api/projects?includeLanguages=true', { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 304) return projectsCache;
      return [];
    }
    const data = await res.json() as { projects: Project[] };
    projectsCache.length = 0;
    projectsCache.push(...(data.projects || []));
    return data.projects;
  }, 'projects');
}

export function createFetchFilesSummaryQuery() {
  return query(async (projectId: string, language?: string) => {
    let url = `/api/projects/${projectId}/files/summary`;
    if (language && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)) {
      url += `?lang=${language}`;
    }
    const res = await authFetch(url, { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 304) return filesSummaryCache.get(url) || { files: [] };
      throw new Error('Failed to fetch files summary');
    }
    const data = await res.json();
    filesSummaryCache.set(url, data);
    return data;
  }, 'fetchFilesSummary');
}

export function createFetchSuggestionsQuery() {
  return query(async (projectId: string, language: string) => {
    const params = new URLSearchParams({ projectId, language });
    const url = `/api/translations/suggestions?${params}`;
    const res = await authFetch(url, { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 304) return suggestionsCache.get(url) || { suggestions: [] };
      throw new Error('Failed to fetch suggestions');
    }
    const data = await res.json() as { suggestions?: any[] };
    suggestionsCache.set(url, data);
    return data;
  }, 'fetchSuggestions');
}

export function createFetchAllProjectsQuery() {
  return query(async () => {
    const res = await authFetch('/api/projects/all', { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 304) return projectsCache;
      return [];
    }
    const data = await res.json() as { projects?: Project[] };
    projectsCache.length = 0;
    projectsCache.push(...(data.projects || []));
    return data.projects || [];
  }, 'fetchAllProjects');
}

export function createFetchMembersQuery() {
  return query(async (projectId: string) => {
    const res = await authFetch(`/api/projects/${projectId}/members`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch members');
    const data = await res.json();
    return data;
  }, 'fetchMembers');
}
