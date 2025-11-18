/**
 * Centralized data store for caching API responses using SolidJS createStore.
 * 
 * This provides instant data access when cached, avoiding loading states and skeleton loaders.
 * Data is fetched in the background and the store is updated when fresh data arrives.
 * 
 * On page reload, data is fetched with cache bypass to ensure freshness.
 * During SPA navigation, cached data is used when still fresh.
 * 
 * Pattern:
 * 1. Access store data - returns immediately with cached data or undefined
 * 2. Call fetch function - updates store in background without blocking
 * 3. Component renders with cached data instantly, re-renders when fresh data arrives
 */

import { createStore } from 'solid-js/store';
import { authFetch } from './authFetch';

/**
 * Generic cache store factory for SolidJS.
 * Handles store creation, fetch with ETag, get, and clear logic.
 */
function createCacheStore<
  State extends object,
  Data,
  KeyArgs extends any[] = any[],
  FetchArgs extends any[] = any[]
>({
  initialState,
  makeKey,
  makeUrl,
  extractData,
  extractEtag,
  fetchParams,
}: {
  initialState: State;
  makeKey: (...args: KeyArgs) => string;
  makeUrl: (...args: FetchArgs) => string;
  extractData: (result: any) => Data;
  extractEtag?: (result: any) => string | undefined;
  fetchParams?: (...args: FetchArgs) => RequestInit;
}) {
  const [store, setStore] = createStore<State>(initialState);

  function get(...args: KeyArgs) {
    const key = makeKey(...args);
    return (store as any)[key];
  }

  async function fetch(...args: KeyArgs) {
    let force = false as boolean;
    const last = args[args.length - 1] as any;
    // Support passing a boolean as final arg to force revalidation
    if (typeof last === 'boolean') {
      force = last as boolean;
      // remove the last element from args
      args = args.slice(0, -1) as KeyArgs;
    }

    const key = makeKey(...args);
    const url = makeUrl(...args as any);
    const existing = (store as any)[key];
    const etag = force ? undefined : existing?.etag;
  let params: RequestInit = fetchParams ? fetchParams(...args as any) : {};
    if (!params.credentials) params.credentials = 'include' as RequestCredentials;

    revalidateAndUpdate<any, any>(
      url,
      params,
      existing,
      etag,
      (res) => {
        if ('data' in res) {
          setStore(key as any, {
            ...extractData(res.data),
            lastFetch: Date.now(),
            etag: extractEtag ? extractEtag(res) : res.etag,
          });
        } else {
          setStore(key as any, {
            ...existing,
            lastFetch: Date.now(),
            etag: existing?.etag,
          });
        }
      }
    ).catch((err) => console.error(`[DataStore] Failed to revalidate for ${key}:`, err));
  }

  function clear(prefix?: string) {
    clearKeyedStore(store as Record<string, unknown>, setStore as any, prefix);
  }

  return { get, fetch, clear, _store: store };
}

// Helper: perform conditional fetch using ETag and authFetch.
// Uses cache: 'no-cache' so the browser revalidates with the origin.
// Returns an object describing the result or null on network error.
async function fetchWithETag<T>(
  url: string,
  options: RequestInit,
  existingEtag?: string,
): Promise<
  | { status: 'not-modified' }
  | { status: 'ok'; data: T; etag?: string }
  | { status: 'error'; code: number }
  | null
> {
  try {
    const headers = new Headers(options.headers || {});
    if (existingEtag) headers.set('If-None-Match', existingEtag);

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      cache: 'no-cache', // ask browser to revalidate
      credentials: options.credentials ?? 'include',
    };

    const res = await authFetch(url, fetchOptions);

    if (res.status === 304) {
      return { status: 'not-modified' };
    }

    if (!res.ok) {
      return { status: 'error', code: res.status };
    }

    const etag = res.headers.get('ETag') ?? undefined;
    const data = (await res.json()) as T;
    return { status: 'ok', data, etag };
  } catch (err) {
    console.error('[DataStore] fetchWithETag error', err);
    return null;
  }
}

// Generic helper to revalidate a resource and update a store using a provided setter.
// updateFn is responsible for writing to the store. It receives an object:
// - if notModified: { notModified: true, existing }
// - if ok: { notModified: false, data, etag }
async function revalidateAndUpdate<T, E>(
  url: string,
  options: RequestInit,
  existing: E | undefined,
  existingEtag: string | undefined,
  updateFn: (result: { notModified: true; existing?: E } | { notModified: false; data: T; etag?: string }) => void,
) {
  const result = await fetchWithETag<T>(url, options, existingEtag);
  if (!result) return;

  if (result.status === 'not-modified') {
    updateFn({ notModified: true, existing });
  } else if (result.status === 'ok') {
    updateFn({ notModified: false, data: result.data, etag: result.etag });
  }
}

// Helper to clear keyed stores (calls setFn(key, undefined))
function clearKeyedStore(storeObj: Record<string, unknown>, setFn: (key: string, val: any) => void, projectId?: string) {
  if (projectId) {
    const keysToDelete = Object.keys(storeObj).filter(k => k.startsWith(projectId));
    keysToDelete.forEach(key => setFn(key, undefined as any));
  } else {
    Object.keys(storeObj).forEach(key => setFn(key, undefined as any));
  }
}

// Projects store
interface Project {
  id: string;
  name: string;
  repository: string;
  userId: string;
  sourceLanguage: string;
  accessControl?: 'whitelist' | 'blacklist';
  languages?: string[];
}

interface ProjectsState {
  projects: Project[];
  lastFetch: number | null;
  etag?: string | null;
}

const [projectsStore, setProjectsStore] = createStore<ProjectsState>({
  projects: [],
  lastFetch: null,
});

export const projectsCache = {
  get: () => projectsStore,
  
  async fetch(includeLanguages = true, force = false) {
    // Fetch in background, don't block — server controls freshness via ETag
    // includeLanguages: whether to include language list (more expensive)
    const url = includeLanguages 
      ? '/api/projects?includeLanguages=true' 
      : '/api/projects';
    
    // On page reload, revalidate with the server using ETag
    const existing = projectsStore;
    // Fire-and-forget revalidation so UI is not blocked
    revalidateAndUpdate<{ projects: Project[] }, ProjectsState>(
      url,
      { credentials: 'include' },
      existing,
      force ? undefined : existing.etag ?? undefined,
      (res) => {
        if ('data' in res) {
          setProjectsStore({
            projects: res.data.projects,
            lastFetch: Date.now(),
            etag: res.etag ?? null,
          });
          console.log(`[DataStore] Updated projects cache (${res.data.projects.length} projects)`);
        } else {
          setProjectsStore({ lastFetch: Date.now(), etag: existing.etag ?? null });
        }
      },
    ).catch((err) => console.error('Failed to revalidate projects:', err));
  },
  
  clear() {
    setProjectsStore({ projects: [], lastFetch: null });
  },
};

/**
 * Files store - keyed by projectId and language
 */
interface FileData {
  filename: string;
  lang: string;
  contents: Record<string, unknown>;
  translationStatus?: Record<string, string>;
}

interface FilesState {
  [key: string]: {
    files: FileData[];
    lastFetch: number;
    etag?: string;
  };
}

export const filesCache = createCacheStore<FilesState, { files: FileData[] }, [string, string?], [string, string?, string?]>({
  initialState: {},
  makeKey: (projectId: string, language?: string) =>
    language ? `${projectId}:${language}` : projectId,
  makeUrl: (projectId: string, language?: string, filename?: string) => {
    let url = `/api/projects/${projectId}/files`;
    const params = new URLSearchParams();
    if (language) params.append('lang', language);
    if (filename) params.append('filename', filename);
    if (params.toString()) url += `?${params.toString()}`;
    return url;
  },
  extractData: (data: any) => ({ files: data.files }),
  extractEtag: (res: any) => res.etag,
  fetchParams: () => ({ credentials: 'include' }),
});

/**
 * Files summary store - for file selection pages
 */
interface FileSummaryData {
  files: Array<{
    filename: string;
    lang: string;
    totalKeys: number;
    translatedKeys: number;
    translationPercentage: number;
  }>;
}

interface FilesSummaryState {
  [key: string]: {
    data: FileSummaryData;
    lastFetch: number;
    etag?: string;
  };
}

export const filesSummaryCache = createCacheStore<FilesSummaryState, { data: FileSummaryData }, [string, string?], [string, string?]>({
  initialState: {},
  makeKey: (projectId: string, language?: string) =>
    language ? `${projectId}:${language}` : projectId,
  makeUrl: (projectId: string, language?: string) => {
    let url = `/api/projects/${projectId}/files/summary`;
    // Only append lang if it's a valid language code (e.g. "en", "es", "ja", "en-US")
    if (language && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)) {
      url += `?lang=${language}`;
    }
    return url;
  },
  extractData: (data: any) => ({ data }),
  extractEtag: (res: any) => res.etag,
  fetchParams: () => ({ credentials: 'include' }),
});

/**
 * Translations store
 */
interface Translation {
  id: string;
  key: string;
  value: string;
  sourceValue?: string;
  status: 'pending' | 'approved' | 'committed' | 'rejected' | 'deleted';
  userId: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

interface TranslationsState {
  [key: string]: {
    translations: Translation[];
    lastFetch: number;
    etag?: string;
  };
}

export const translationsCache = createCacheStore<TranslationsState, { translations: Translation[] }, [string, string, string?], [string, string, string?]>({
  initialState: {},
  makeKey: (projectId: string, language: string, status?: string) =>
    `${projectId}:${language}${status ? `:${status}` : ''}`,
  makeUrl: (projectId: string, language: string, status?: string) => {
    const params = new URLSearchParams({ projectName: projectId, language });
    if (status) params.append('status', status);
    return `/api/translations?${params}`;
  },
  extractData: (data: any) => ({ translations: data.translations }),
  extractEtag: (res: any) => res.etag,
  fetchParams: () => ({ credentials: 'include' }),
});

/**
 * Translation suggestions store
 */
interface Suggestion {
  id: string;
  projectId: string;
  language: string;
  key: string;
  value: string;
  status: 'pending' | 'approved' | 'rejected';
  userId: string;
  username: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface SuggestionsState {
  [key: string]: {
    suggestions: Suggestion[];
    lastFetch: number;
    etag?: string;
  };
}

export const suggestionsCache = createCacheStore<SuggestionsState, { suggestions: Suggestion[] }, [string, string, string?], [string, string, string?]>({
  initialState: {},
  makeKey: (projectId: string, language: string, key?: string) =>
    key ? `${projectId}:${language}:${key}` : `${projectId}:${language}`,
  makeUrl: (projectId: string, language: string, key?: string) => {
    const params = new URLSearchParams({ projectName: projectId, language });
    if (key) params.append('key', key);
    return `/api/translations/suggestions?${params}`;
  },
  extractData: (data: any) => ({ suggestions: data.suggestions }),
  extractEtag: (res: any) => res.etag,
  fetchParams: () => ({ credentials: 'include' }),
});

/**
 * Members store
 */
interface Member {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  role: string;
  createdAt: string;
}

interface MembersState {
  [projectId: string]: {
    members: Member[];
    lastFetch: number;
    etag?: string;
  };
}

export const membersCache = createCacheStore<MembersState, { members: Member[] }, [string], [string]>({
  initialState: {},
  makeKey: (projectId: string) => projectId,
  makeUrl: (projectId: string) => `/api/projects/${projectId}/members`,
  extractData: (data: any) => ({ members: data.members }),
  extractEtag: (res: any) => res.etag,
  fetchParams: () => ({ credentials: 'include' }),
});

// Clear all caches
export function clearAllCaches() {
  projectsCache.clear();
  filesCache.clear();
  filesSummaryCache.clear();
  translationsCache.clear();
  suggestionsCache.clear();
  membersCache.clear();
}
