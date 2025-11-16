import { authFetch } from './authFetch';
import type { 
  R2FileData, 
  GitBlameInfo, 
  CharRange,
  WebTranslation as SharedWebTranslation,
  MergedTranslation as SharedMergedTranslation 
} from '../../../shared/types';

// Re-export shared types for convenience
export type WebTranslation = SharedWebTranslation;
export type MergedTranslation = SharedMergedTranslation;
export type { R2FileData, GitBlameInfo, CharRange };

/**
 * Fetch file from R2 (GitHub import)
 * Uses the file metadata endpoint to get the r2Key, then fetches by key
 * This avoids issues with nested filenames in URL paths
 */
export async function fetchR2File(
  projectId: string,
  lang: string,
  filename: string
): Promise<R2FileData | null> {
  try {
    // First, get the file metadata to retrieve the r2Key
    const params = new URLSearchParams({
      lang,
      filename,
    });
    
    const metadataResponse = await authFetch(
      `/api/projects/${projectId}/files?${params}`,
      { credentials: 'include' }
    );
    
    if (!metadataResponse.ok) {
      if (metadataResponse.status === 404) return null;
      throw new Error('Failed to fetch file metadata');
    }
    
    const metadata = await metadataResponse.json() as { files?: Array<{ r2Key: string }> };
    const fileInfo = metadata.files?.[0];
    
    if (!fileInfo?.r2Key) {
      return null;
    }
    
    // Now fetch the actual file data using the r2Key
    const response = await authFetch(
      `/api/r2/by-key/${encodeURIComponent(fileInfo.r2Key)}`,
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
    
    const data = await response.json() as { translations?: WebTranslation[] };
    return data.translations || [];
  } catch (error) {
    console.error('[D1] Fetch error:', error);
    return [];
  }
}

/**
 * Merge R2 and D1 data (legacy - for backward compatibility)
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

  for (const [key, sourceValue] of Object.entries(r2Data.raw)) {
    const webTrans = webTransMap.get(key);
    
    merged.push({
      key,
      sourceValue: String(sourceValue),
      currentValue: webTrans?.value || String(sourceValue),
      gitTranslation: undefined, // Legacy function doesn't have separate git translation
      gitBlame: r2Data.metadata.gitBlame?.[key],
      charRange: r2Data.metadata.charRanges?.[key],
      webTranslation: webTrans,
      isValid: webTrans?.isValid ?? true,
    });
  }

  return merged;
}

/**
 * Merge source R2, target R2, and D1 web translations
 * This properly handles the case where source and target are different files
 */
export function mergeTranslationsWithSource(
  sourceR2Data: R2FileData | null,
  targetR2Data: R2FileData | null,
  webTranslations: WebTranslation[]
): MergedTranslation[] {
  if (!sourceR2Data) return [];

  const webTransMap = new Map<string, WebTranslation>();
  for (const trans of webTranslations) {
    webTransMap.set(trans.key, trans);
  }

  const targetMap = new Map<string, any>();
  if (targetR2Data) {
    for (const [key, value] of Object.entries(targetR2Data.raw)) {
      targetMap.set(key, value);
    }
  }

  const merged: MergedTranslation[] = [];

  for (const [key, sourceValue] of Object.entries(sourceR2Data.raw)) {
    const webTrans = webTransMap.get(key);
    const targetValue = targetMap.get(key);
    
    // Git translations are now treated as suggestions, not direct values
    // currentValue only comes from web translations (D1)
    const currentValue = webTrans?.value || '';
    
    // Store git translation separately as a suggestion
    const gitTranslation = targetValue ? String(targetValue) : undefined;
    
    // isValid flag:
    // - Web translations use their isValid flag (can be invalidated if source changed)
    // - Empty translations (no translation yet) are still "valid" (just not translated)
    const isValid = webTrans ? webTrans.isValid : true;
    
    merged.push({
      key,
      sourceValue: String(sourceValue),
      currentValue,
      gitTranslation,
      gitBlame: sourceR2Data.metadata.gitBlame?.[key],
      charRange: sourceR2Data.metadata.charRanges?.[key],
      webTranslation: webTrans,
      isValid,
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

  const data = await response.json() as { suggestions?: WebTranslation[] };
  return data.suggestions || [];
}
