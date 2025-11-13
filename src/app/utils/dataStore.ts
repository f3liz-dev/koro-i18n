/**
 * Centralized data store for caching API responses using SolidJS createStore.
 * 
 * This provides instant data access when cached, avoiding loading states and skeleton loaders.
 * Data is fetched in the background and the store is updated when fresh data arrives.
 * 
 * Pattern:
 * 1. Access store data - returns immediately with cached data or undefined
 * 2. Call fetch function - updates store in background without blocking
 * 3. Component renders with cached data instantly, re-renders when fresh data arrives
 */

import { createStore } from 'solid-js/store';
import { authFetch } from './authFetch';

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
}

const [projectsStore, setProjectsStore] = createStore<ProjectsState>({
  projects: [],
  lastFetch: null,
});

export const projectsCache = {
  get: () => projectsStore,
  
  async fetch() {
    // Fetch in background, don't block
    authFetch('/api/projects', { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as { projects: Project[] };
          setProjectsStore({
            projects: data.projects,
            lastFetch: Date.now(),
          });
        }
      })
      .catch((error) => {
        console.error('Failed to fetch projects:', error);
      });
  },
  
  clear() {
    setProjectsStore({ projects: [], lastFetch: null });
  },
};

// Files store - keyed by projectId and language
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
  };
}

const [filesStore, setFilesStore] = createStore<FilesState>({});

export const filesCache = {
  get: (projectId: string, language?: string) => {
    const key = language ? `${projectId}:${language}` : projectId;
    return filesStore[key];
  },
  
  async fetch(projectId: string, language?: string, filename?: string) {
    const key = language ? `${projectId}:${language}` : projectId;
    
    let url = `/api/projects/${projectId}/files`;
    const params = new URLSearchParams();
    if (language) params.append('lang', language);
    if (filename) params.append('filename', filename);
    if (params.toString()) url += `?${params.toString()}`;
    
    // Fetch in background, don't block
    authFetch(url, { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as { files: FileData[] };
          setFilesStore(key, {
            files: data.files,
            lastFetch: Date.now(),
          });
        }
      })
      .catch((error) => {
        console.error(`Failed to fetch files for ${key}:`, error);
      });
  },
  
  clear(projectId?: string) {
    if (projectId) {
      // Clear all entries for this project
      const keysToDelete = Object.keys(filesStore).filter(k => k.startsWith(projectId));
      keysToDelete.forEach(key => {
        setFilesStore(key, undefined as any);
      });
    } else {
      // Clear all
      Object.keys(filesStore).forEach(key => {
        setFilesStore(key, undefined as any);
      });
    }
  },
};

// Files summary store - for file selection pages
interface FileSummaryData {
  files: Array<{
    filename: string;
    lang: string;
    translationStatus?: Record<string, string>;
  }>;
}

interface FilesSummaryState {
  [key: string]: {
    data: FileSummaryData;
    lastFetch: number;
  };
}

const [filesSummaryStore, setFilesSummaryStore] = createStore<FilesSummaryState>({});

export const filesSummaryCache = {
  get: (projectId: string, language?: string) => {
    const key = language ? `${projectId}:${language}` : projectId;
    return filesSummaryStore[key];
  },
  
  async fetch(projectId: string, language?: string) {
    const key = language ? `${projectId}:${language}` : projectId;
    
    let url = `/api/projects/${projectId}/files/summary`;
    if (language) url += `?lang=${language}`;
    
    // Fetch in background, don't block
    authFetch(url, { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as FileSummaryData;
          setFilesSummaryStore(key, {
            data,
            lastFetch: Date.now(),
          });
        }
      })
      .catch((error) => {
        console.error(`Failed to fetch file summary for ${key}:`, error);
      });
  },
  
  clear(projectId?: string) {
    if (projectId) {
      const keysToDelete = Object.keys(filesSummaryStore).filter(k => k.startsWith(projectId));
      keysToDelete.forEach(key => {
        setFilesSummaryStore(key, undefined as any);
      });
    } else {
      Object.keys(filesSummaryStore).forEach(key => {
        setFilesSummaryStore(key, undefined as any);
      });
    }
  },
};

// Translations store
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
  };
}

const [translationsStore, setTranslationsStore] = createStore<TranslationsState>({});

export const translationsCache = {
  get: (projectId: string, language: string, status?: string) => {
    const key = `${projectId}:${language}${status ? `:${status}` : ''}`;
    return translationsStore[key];
  },
  
  async fetch(projectId: string, language: string, status?: string) {
    const key = `${projectId}:${language}${status ? `:${status}` : ''}`;
    
    const params = new URLSearchParams({ projectId, language });
    if (status) params.append('status', status);
    const url = `/api/translations?${params}`;
    
    // Fetch in background, don't block
    authFetch(url, { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as { translations: Translation[] };
          setTranslationsStore(key, {
            translations: data.translations,
            lastFetch: Date.now(),
          });
        }
      })
      .catch((error) => {
        console.error(`Failed to fetch translations for ${key}:`, error);
      });
  },
  
  clear(projectId?: string) {
    if (projectId) {
      const keysToDelete = Object.keys(translationsStore).filter(k => k.startsWith(projectId));
      keysToDelete.forEach(key => {
        setTranslationsStore(key, undefined as any);
      });
    } else {
      Object.keys(translationsStore).forEach(key => {
        setTranslationsStore(key, undefined as any);
      });
    }
  },
};

// Translation suggestions store
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
  };
}

const [suggestionsStore, setSuggestionsStore] = createStore<SuggestionsState>({});

export const suggestionsCache = {
  get: (projectId: string, language: string, key?: string) => {
    const cacheKey = key ? `${projectId}:${language}:${key}` : `${projectId}:${language}`;
    return suggestionsStore[cacheKey];
  },
  
  async fetch(projectId: string, language: string, key?: string) {
    const cacheKey = key ? `${projectId}:${language}:${key}` : `${projectId}:${language}`;
    
    const params = new URLSearchParams({ projectId, language });
    if (key) params.append('key', key);
    const url = `/api/translations/suggestions?${params}`;
    
    // Fetch in background, don't block
    authFetch(url, { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as { suggestions: Suggestion[] };
          setSuggestionsStore(cacheKey, {
            suggestions: data.suggestions,
            lastFetch: Date.now(),
          });
        }
      })
      .catch((error) => {
        console.error(`Failed to fetch suggestions for ${cacheKey}:`, error);
      });
  },
  
  clear(projectId?: string) {
    if (projectId) {
      const keysToDelete = Object.keys(suggestionsStore).filter(k => k.startsWith(projectId));
      keysToDelete.forEach(key => {
        setSuggestionsStore(key, undefined as any);
      });
    } else {
      Object.keys(suggestionsStore).forEach(key => {
        setSuggestionsStore(key, undefined as any);
      });
    }
  },
};

// Members store
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
  };
}

const [membersStore, setMembersStore] = createStore<MembersState>({});

export const membersCache = {
  get: (projectId: string) => {
    return membersStore[projectId];
  },
  
  async fetch(projectId: string) {
    // Fetch in background, don't block
    authFetch(`/api/projects/${projectId}/members`, { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as { members: Member[] };
          setMembersStore(projectId, {
            members: data.members,
            lastFetch: Date.now(),
          });
        }
      })
      .catch((error) => {
        console.error(`Failed to fetch members for ${projectId}:`, error);
      });
  },
  
  clear(projectId?: string) {
    if (projectId) {
      setMembersStore(projectId, undefined as any);
    } else {
      Object.keys(membersStore).forEach(key => {
        setMembersStore(key, undefined as any);
      });
    }
  },
};

// Clear all caches
export function clearAllCaches() {
  projectsCache.clear();
  filesCache.clear();
  filesSummaryCache.clear();
  translationsCache.clear();
  suggestionsCache.clear();
  membersCache.clear();
}
