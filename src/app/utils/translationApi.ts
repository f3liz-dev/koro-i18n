import { authFetch } from './authFetch';
import type {
  GitBlameInfo,
  CharRange,
  WebTranslation as SharedWebTranslation,
  MergedTranslation as SharedMergedTranslation
} from '../../../shared/types';

// Re-export shared types for convenience
export type WebTranslation = SharedWebTranslation;
export type MergedTranslation = SharedMergedTranslation;
export type { GitBlameInfo, CharRange };

/**
 * File data structure returned from the API (GitHub-based)
 */
export interface FileData {
  raw: Record<string, any>;
  metadata: {
    gitBlame: Record<string, GitBlameInfo>;
    charRanges: Record<string, CharRange>;
    sourceHashes: Record<string, string>;
  };
  sourceHash: string;
  commitSha: string;
  fetchedAt: string;
  totalKeys?: number;
}

/**
 * Fetch file from GitHub via the API
 * Uses the files endpoint which now fetches directly from GitHub
 */
export async function fetchFileFromGitHub(
  projectName: string,
  lang: string,
  filename: string
): Promise<FileData | null> {
  try {
    // Fetch file content directly from the API
    // The backend now fetches from GitHub instead of R2
    const response = await authFetch(
      `/api/projects/${encodeURIComponent(projectName)}/files/${encodeURIComponent(lang)}/${encodeURIComponent(filename)}`,
      { credentials: 'include' }
    );

    // Handle conditional response (ETag) and standard errors
    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 304) {
        // Not modified — caller should reuse cached data if available.
        return null;
      }
      throw new Error('Failed to fetch file');
    }

    const fileData = await response.json() as FileData;

    // Ensure metadata has the required shape when missing
    const emptyMetadata = { gitBlame: {}, charRanges: {}, sourceHashes: {} };
    fileData.metadata = {
      ...emptyMetadata,
      ...(fileData.metadata || {})
    };

    return fileData;
  } catch (error) {
    console.error('[GitHub] Fetch error:', error);
    return null;
  }
}



/**
 * Fetch web translations from D1
 */
export async function fetchWebTranslations(
  projectName: string,
  language: string,
  filename: string
): Promise<WebTranslation[]> {
  try {
    const params = new URLSearchParams({
      language,
      filename,
      status: 'approved',
    });

    const response = await authFetch(
      `/api/projects/${encodeURIComponent(projectName)}/translations?${params}`,
      { credentials: 'include' }
    );

    // Handle conditional requests (ETag)
    if (!response.ok) {
      if (response.status === 304) {
        // Not modified - return empty array to indicate no new translations.
        return [];
      }
      throw new Error('Failed to fetch web translations');
    }

    const data = await response.json() as { translations?: WebTranslation[] };
    return data.translations || [];
  } catch (error) {
    console.error('[D1] Fetch error:', error);
    return [];
  }
}

/**
 * Merge file data and D1 data (legacy - for backward compatibility)
 */
export function mergeTranslations(
  fileData: FileData | null,
  webTranslations: WebTranslation[]
): MergedTranslation[] {
  if (!fileData) return [];

  const webTransMap = new Map<string, WebTranslation>();
  for (const trans of webTranslations) {
    webTransMap.set(trans.key, trans);
  }

  const merged: MergedTranslation[] = [];

  for (const [key, sourceValue] of Object.entries(fileData.raw)) {
    const webTrans = webTransMap.get(key);

    merged.push({
      key,
      sourceValue: String(sourceValue),
      currentValue: webTrans?.value || String(sourceValue),
      gitBlame: fileData.metadata.gitBlame?.[key],
      charRange: fileData.metadata.charRanges?.[key],
      webTranslation: webTrans,
      isValid: webTrans?.isValid ?? true,
    });
  }

  return merged;
}

/**
 * Merge source file, target file, and D1 web translations
 * This properly handles the case where source and target are different files
 */
export function mergeTranslationsWithSource(
  sourceFileData: FileData | null,
  targetFileData: FileData | null,
  webTranslations: WebTranslation[]
): MergedTranslation[] {
  if (!sourceFileData) return [];

  const webTransMap = new Map<string, WebTranslation>();
  for (const trans of webTranslations) {
    webTransMap.set(trans.key, trans);
  }

  const targetMap = new Map<string, any>();
  if (targetFileData) {
    for (const [key, value] of Object.entries(targetFileData.raw)) {
      targetMap.set(key, value);
    }
  }

  const merged: MergedTranslation[] = [];

  for (const [key, sourceValue] of Object.entries(sourceFileData.raw)) {
    const webTrans = webTransMap.get(key);
    const targetValue = targetMap.get(key);

    // Priority: web translation > target file > empty (don't use source as fallback)
    // If there's no translation, leave it empty so users know to translate it
    const currentValue = webTrans?.value || (targetValue ? String(targetValue) : '');

    // isValid flag:
    // - Git-imported translations are always valid
    // - Web translations use their isValid flag (can be invalidated if source changed)
    // - Empty translations (no translation yet) are still "valid" (just not translated)
    const isValid = webTrans ? webTrans.isValid : true;

    merged.push({
      key,
      sourceValue: String(sourceValue),
      currentValue,
      gitBlame: sourceFileData.metadata.gitBlame?.[key],
      charRange: sourceFileData.metadata.charRanges?.[key],
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
  projectName: string,
  language: string,
  filename: string,
  key: string,
  value: string
): Promise<void> {
  const response = await authFetch(`/api/projects/${encodeURIComponent(projectName)}/translations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ language, filename, key, value }),
  });

  if (!response.ok) throw new Error('Failed to submit translation');
}

/**
 * Approve suggestion
 */
export async function approveSuggestion(id: string): Promise<void> {
  const response = await authFetch(`/api/translations/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status: 'approved' }),
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
  projectName: string,
  language: string,
  filename: string,
  key?: string,
  // If true, bypass browser cache and force revalidation
  force = false
): Promise<WebTranslation[]> {
  const params = new URLSearchParams({ language, filename });
  if (key) params.append('key', key);

  const response = await authFetch(
    `/api/projects/${encodeURIComponent(projectName)}/translations/suggestions?${params}`,
    // When force is true, instruct the browser to reload the resource from network
    // (this avoids max-age serving stale responses)
    { credentials: 'include', ...(force ? { cache: 'reload' } : {}) }
  );

  // Handle ETag 304 responses
  if (!response.ok) {
    if (response.status === 304) {
      return [];
    }
    throw new Error('Failed to fetch suggestions');
  }

  const data = await response.json() as { suggestions?: WebTranslation[] };
  return data.suggestions || [];
}
