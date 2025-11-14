import { authFetch } from './authFetch';

export interface R2FileData {
  contents: Record<string, string>;
  metadata: {
    gitBlame: Record<string, {
      commit: string;
      author: string;
      email: string;
      date: string;
    }>;
    sourceHashes: Record<string, string>;
  };
  sourceHash: string;
  commitSha: string;
  uploadedAt: string;
}

export interface WebTranslation {
  id: string;
  projectId: string;
  language: string;
  filename: string;
  key: string;
  value: string;
  userId: string;
  username?: string;
  avatarUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  sourceHash?: string;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MergedTranslation {
  key: string;
  sourceValue: string;
  currentValue: string;
  gitBlame?: {
    commit: string;
    author: string;
    email: string;
    date: string;
  };
  webTranslation?: WebTranslation;
  isValid: boolean;
}

/**
 * Fetch file from R2 (GitHub import)
 */
export async function fetchR2File(
  projectId: string,
  lang: string,
  filename: string
): Promise<R2FileData | null> {
  try {
    const response = await authFetch(
      `/api/r2/${projectId}/${lang}/${filename}`,
      { credentials: 'include' }
    );
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch R2 file');
    }
    
    return response.json();
  } catch (error) {
    console.error('[R2] Fetch error:', error);
    return null;
  }
}

/**
 * Fetch web translations from D1
 */
export async function fetchWebTranslations(
  projectId: string,
  language: string,
  filename: string
): Promise<WebTranslation[]> {
  try {
    const params = new URLSearchParams({
      projectId,
      language,
      filename,
      status: 'approved',
    });
    
    const response = await authFetch(
      `/api/translations?${params}`,
      { credentials: 'include' }
    );
    
    if (!response.ok) throw new Error('Failed to fetch web translations');
    
    const data = await response.json();
    return data.translations || [];
  } catch (error) {
    console.error('[D1] Fetch error:', error);
    return [];
  }
}

/**
 * Merge R2 and D1 data
 */
export function mergeTranslations(
  r2Data: R2FileData | null,
  webTranslations: WebTranslation[]
): MergedTranslation[] {
  if (!r2Data) return [];

  const webTransMap = new Map<string, WebTranslation>();
  for (const trans of webTranslations) {
    webTransMap.set(trans.key, trans);
  }

  const merged: MergedTranslation[] = [];

  for (const [key, sourceValue] of Object.entries(r2Data.contents)) {
    const webTrans = webTransMap.get(key);
    
    merged.push({
      key,
      sourceValue,
      currentValue: webTrans?.value || sourceValue,
      gitBlame: r2Data.metadata.gitBlame?.[key],
      webTranslation: webTrans,
      isValid: webTrans?.isValid ?? true,
    });
  }

  return merged;
}

/**
 * Submit web translation
 */
export async function submitTranslation(
  projectId: string,
  language: string,
  filename: string,
  key: string,
  value: string
): Promise<void> {
  const response = await authFetch('/api/translations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ projectId, language, filename, key, value }),
  });

  if (!response.ok) throw new Error('Failed to submit translation');
}

/**
 * Approve suggestion
 */
export async function approveSuggestion(id: string): Promise<void> {
  const response = await authFetch(`/api/translations/${id}/approve`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to approve suggestion');
}

/**
 * Reject suggestion
 */
export async function rejectSuggestion(id: string): Promise<void> {
  const response = await authFetch(`/api/translations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to reject suggestion');
}

/**
 * Fetch suggestions for a key
 */
export async function fetchSuggestions(
  projectId: string,
  language: string,
  filename: string,
  key?: string
): Promise<WebTranslation[]> {
  const params = new URLSearchParams({ projectId, language, filename });
  if (key) params.append('key', key);

  const response = await authFetch(
    `/api/translations/suggestions?${params}`,
    { credentials: 'include' }
  );

  if (!response.ok) throw new Error('Failed to fetch suggestions');

  const data = await response.json();
  return data.suggestions || [];
}
