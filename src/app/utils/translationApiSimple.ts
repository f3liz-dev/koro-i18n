/**
 * Simplified Translation API
 * 
 * Uses a single unified endpoint to fetch all translation data for a file.
 * This replaces the complex multi-endpoint approach with a simpler API.
 */

import { authFetch } from './authFetch';

// ============================================================================
// Types
// ============================================================================

export interface TranslationEntry {
  key: string;
  sourceValue: string;
  targetValue: string;
  webTranslation?: WebTranslation;
  status: 'untranslated' | 'translated' | 'pending' | 'approved';
}

export interface WebTranslation {
  id: string;
  projectName: string;
  language: string;
  filename: string;
  key: string;
  value: string;
  userId: string;
  username?: string;
  avatarUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface FileTranslationData {
  source: Record<string, string>;
  target: Record<string, string>;
  pending: WebTranslation[];
  approved: WebTranslation[];
  sourceLanguage: string;
  targetLanguage: string;
  filename: string;
  commitSha: string;
}

export interface MergedTranslation {
  key: string;
  sourceValue: string;
  currentValue: string;
  status: 'untranslated' | 'translated' | 'pending' | 'approved';
  webTranslation?: WebTranslation;
  pendingSuggestions: WebTranslation[];
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all translation data for a file in one call
 */
export async function fetchFileTranslations(
  projectName: string,
  language: string,
  filename: string
): Promise<FileTranslationData | null> {
  try {
    const response = await authFetch(
      `/api/projects/${encodeURIComponent(projectName)}/translations/file/${encodeURIComponent(language)}/${encodeURIComponent(filename)}`,
      { credentials: 'include' }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch translations: ${response.status}`);
    }

    return await response.json() as FileTranslationData;
  } catch (error) {
    console.error('[API] Error fetching file translations:', error);
    return null;
  }
}

/**
 * Merge source, target, and web translations into a unified list
 */
export function mergeTranslations(data: FileTranslationData): MergedTranslation[] {
  const result: MergedTranslation[] = [];
  
  // Build maps for quick lookup
  const approvedMap = new Map<string, WebTranslation>();
  const pendingMap = new Map<string, WebTranslation[]>();
  
  for (const t of data.approved) {
    approvedMap.set(t.key, t);
  }
  
  for (const t of data.pending) {
    const existing = pendingMap.get(t.key) || [];
    existing.push(t);
    pendingMap.set(t.key, existing);
  }

  // Process all source keys
  for (const [key, sourceValue] of Object.entries(data.source)) {
    const targetValue = data.target[key] || '';
    const approved = approvedMap.get(key);
    const pending = pendingMap.get(key) || [];

    // Determine current value and status
    let currentValue = '';
    let status: MergedTranslation['status'] = 'untranslated';

    if (approved) {
      currentValue = approved.value;
      status = 'approved';
    } else if (pending.length > 0) {
      currentValue = pending[0].value;
      status = 'pending';
    } else if (targetValue) {
      currentValue = targetValue;
      status = 'translated';
    }

    result.push({
      key,
      sourceValue,
      currentValue,
      status,
      webTranslation: approved,
      pendingSuggestions: pending,
    });
  }

  return result;
}

/**
 * Submit a new translation
 */
export async function submitTranslation(
  projectName: string,
  language: string,
  filename: string,
  key: string,
  value: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await authFetch(
      `/api/projects/${encodeURIComponent(projectName)}/translations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language, filename, key, value }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Failed to submit translation' };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[API] Error submitting translation:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Approve a translation
 */
export async function approveTranslation(
  projectName: string,
  translationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetch(
      `/api/projects/${encodeURIComponent(projectName)}/translations/${translationId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Failed to approve translation' };
    }

    return { success: true };
  } catch (error) {
    console.error('[API] Error approving translation:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Reject a translation
 */
export async function rejectTranslation(
  projectName: string,
  translationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetch(
      `/api/projects/${encodeURIComponent(projectName)}/translations/${translationId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Failed to reject translation' };
    }

    return { success: true };
  } catch (error) {
    console.error('[API] Error rejecting translation:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Get suggestions for a specific key
 */
export async function fetchSuggestions(
  projectName: string,
  language: string,
  filename: string,
  key: string
): Promise<WebTranslation[]> {
  try {
    const params = new URLSearchParams({ language, filename, key });
    const response = await authFetch(
      `/api/projects/${encodeURIComponent(projectName)}/translations/suggestions?${params}`,
      { credentials: 'include' }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { suggestions?: WebTranslation[] };
    return data.suggestions || [];
  } catch (error) {
    console.error('[API] Error fetching suggestions:', error);
    return [];
  }
}
