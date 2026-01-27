/**
 * Reconciliation Service - Pure Functions
 * 
 * DOP Pattern: Data transformation for comparing GitHub vs D1 states
 * 
 * Purpose: Determine which translations should be shown in the UI
 * - GitHub is the source of truth
 * - D1 stores user-submitted diffs (suggestions)
 * - Reconciliation merges these to show current state + pending changes
 */

// ============================================================================
// Data Structures
// ============================================================================

export interface GitHubTranslation {
  key: string;
  value: string;
  sourceHash: string;
}

export interface D1Translation {
  id: string;
  key: string;
  value: string;
  userId: string;
  username: string;
  status: 'pending' | 'approved';
  sourceHash: string | null;
  isValid: boolean;
  createdAt: string;
}

export interface ReconciledTranslation {
  key: string;
  githubValue: string | null;
  d1Value: string | null;
  sourceHash: string | null;
  status: 'in_github' | 'pending_in_d1' | 'approved_in_d1' | 'both';
  translationId: string | null;
  userId: string | null;
  username: string | null;
  createdAt: string | null;
  isValid: boolean;
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Group D1 translations by key
 */
function groupByKey(translations: D1Translation[]): Map<string, D1Translation[]> {
  const groups = new Map<string, D1Translation[]>();
  
  for (const t of translations) {
    const existing = groups.get(t.key) || [];
    existing.push(t);
    groups.set(t.key, existing);
  }
  
  return groups;
}

/**
 * Select the best D1 translation for a key
 * Priority: approved > pending > oldest
 */
function selectBestD1Translation(translations: D1Translation[]): D1Translation {
  const approved = translations.find(t => t.status === 'approved');
  if (approved) return approved;
  
  const pending = translations.filter(t => t.status === 'pending');
  if (pending.length > 0) {
    // Return oldest pending (first submitted)
    return pending.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
  }
  
  return translations[0];
}

/**
 * Determine reconciliation status
 */
function determineStatus(
  hasGitHub: boolean,
  hasD1: boolean,
  d1Status: 'pending' | 'approved' | null
): ReconciledTranslation['status'] {
  if (!hasGitHub && !hasD1) throw new Error('Invalid state: no data');
  
  if (hasGitHub && !hasD1) return 'in_github';
  if (!hasGitHub && hasD1) {
    return d1Status === 'approved' ? 'approved_in_d1' : 'pending_in_d1';
  }
  return 'both';
}

/**
 * Reconcile a single key
 */
function reconcileKey(
  key: string,
  githubTranslation: GitHubTranslation | null,
  d1Translations: D1Translation[]
): ReconciledTranslation {
  const hasGitHub = githubTranslation !== null;
  const hasD1 = d1Translations.length > 0;
  
  if (!hasGitHub && !hasD1) {
    throw new Error(`No data for key: ${key}`);
  }
  
  const bestD1 = hasD1 ? selectBestD1Translation(d1Translations) : null;
  const status = determineStatus(hasGitHub, hasD1, bestD1?.status || null);
  
  return {
    key,
    githubValue: githubTranslation?.value || null,
    d1Value: bestD1?.value || null,
    sourceHash: githubTranslation?.sourceHash || bestD1?.sourceHash || null,
    status,
    translationId: bestD1?.id || null,
    userId: bestD1?.userId || null,
    username: bestD1?.username || null,
    createdAt: bestD1?.createdAt || null,
    isValid: bestD1?.isValid ?? true,
  };
}

/**
 * Reconcile all translations for a file
 */
export function reconcileTranslations(
  githubTranslations: GitHubTranslation[],
  d1Translations: D1Translation[]
): ReconciledTranslation[] {
  const githubMap = new Map(githubTranslations.map(t => [t.key, t]));
  const d1Map = groupByKey(d1Translations);
  
  // Get all unique keys
  const allKeys = new Set([
    ...githubMap.keys(),
    ...d1Map.keys(),
  ]);
  
  const results: ReconciledTranslation[] = [];
  
  for (const key of allKeys) {
    const github = githubMap.get(key) || null;
    const d1List = d1Map.get(key) || [];
    
    try {
      const reconciled = reconcileKey(key, github, d1List);
      results.push(reconciled);
    } catch (error) {
      console.warn(`Failed to reconcile key ${key}:`, error);
    }
  }
  
  // Sort by key for consistent ordering
  return results.sort((a, b) => a.key.localeCompare(b.key));
}

// ============================================================================
// Filtering (Pure Functions)
// ============================================================================

export type StatusFilter = 'all' | 'pending' | 'approved' | 'in_github';

/**
 * Filter reconciled translations by status
 */
export function filterByStatus(
  translations: ReconciledTranslation[],
  filter: StatusFilter
): ReconciledTranslation[] {
  if (filter === 'all') return translations;
  
  return translations.filter(t => {
    switch (filter) {
      case 'pending':
        return t.status === 'pending_in_d1';
      case 'approved':
        return t.status === 'approved_in_d1';
      case 'in_github':
        return t.status === 'in_github' || t.status === 'both';
      default:
        return true;
    }
  });
}

/**
 * Count translations by status
 */
export function countByStatus(translations: ReconciledTranslation[]): {
  total: number;
  inGitHub: number;
  pending: number;
  approved: number;
  both: number;
} {
  return {
    total: translations.length,
    inGitHub: translations.filter(t => t.status === 'in_github').length,
    pending: translations.filter(t => t.status === 'pending_in_d1').length,
    approved: translations.filter(t => t.status === 'approved_in_d1').length,
    both: translations.filter(t => t.status === 'both').length,
  };
}
