/**
 * Koro i18n API Client
 * 
 * Handles communication with the koro-i18n platform API.
 * Used by the CLI for push/pull operations.
 */

// ============================================================================
// Types
// ============================================================================

export interface SourceKeyOperation {
  op: 'add' | 'update' | 'delete';
  filename: string;
  key: string;
  value?: string;
  hash?: string;
}

export interface SyncResult {
  success: boolean;
  results?: {
    added: number;
    updated: number;
    deleted: number;
    errors: string[];
  };
  error?: string;
}

export interface ImportTranslation {
  language: string;
  filename: string;
  key: string;
  value: string;
  hash?: string;
}

export interface ImportResult {
  success: boolean;
  results?: {
    imported: number;
    skipped: number;
    errors: string[];
  };
  error?: string;
}

export interface HashManifest {
  success: boolean;
  manifest: Record<string, Record<string, string>>; // filename -> key -> hash
  totalKeys: number;
}

export interface Translation {
  language: string;
  filename: string;
  key: string;
  value: string;
  status: 'draft' | 'approved';
  sourceHash?: string;
}

export interface PullResult {
  success: boolean;
  translations: Translation[];
  error?: string;
}

// ============================================================================
// API Client
// ============================================================================

export class KoroApiClient {
  private baseUrl: string;
  private projectName: string;
  private token: string | null;

  constructor(options: {
    baseUrl?: string;
    projectName: string;
    token?: string;
  }) {
    this.baseUrl = options.baseUrl || process.env.KORO_API_URL || 'https://koro.f3liz.workers.dev';
    this.projectName = options.projectName;
    this.token = options.token || this.getToken();
  }

  /**
   * Get authentication token from environment
   * Supports GitHub Actions OIDC and JWT token
   */
  private getToken(): string | null {
    // GitHub Actions OIDC - fetch token from OIDC provider
    if (process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN && process.env.ACTIONS_ID_TOKEN_REQUEST_URL) {
      // Token will be fetched dynamically in getHeaders()
      return null;
    }
    
    // Environment variable
    return process.env.KORO_TOKEN || null;
  }

  /**
   * Get authorization headers
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // GitHub Actions OIDC
    if (process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN && process.env.ACTIONS_ID_TOKEN_REQUEST_URL) {
      try {
        const response = await fetch(
          `${process.env.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${this.baseUrl}`,
          {
            headers: {
              Authorization: `bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`,
            },
          }
        );
        const data = await response.json() as { value: string };
        headers['Authorization'] = `Bearer ${data.value}`;
      } catch (e) {
        console.error('Failed to fetch OIDC token:', e);
      }
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Get hash manifest for client-side diffing
   */
  async getHashManifest(): Promise<HashManifest> {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${this.baseUrl}/api/projects/${this.projectName}/source-keys/hash`,
      { headers }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get hash manifest: ${error}`);
    }
    
    return response.json() as Promise<HashManifest>;
  }

  /**
   * Sync source keys (push)
   */
  async syncSourceKeys(
    operations: SourceKeyOperation[],
    commitSha?: string
  ): Promise<SyncResult> {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${this.baseUrl}/api/projects/${this.projectName}/source-keys/sync`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ commitSha, operations }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return response.json() as Promise<SyncResult>;
  }

  /**
   * Import existing translations
   */
  async importTranslations(
    translations: ImportTranslation[],
    autoApprove: boolean = false
  ): Promise<ImportResult> {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${this.baseUrl}/api/projects/${this.projectName}/source-keys/import-translations`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ translations, autoApprove }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return response.json() as Promise<ImportResult>;
  }

  /**
   * Pull approved translations
   */
  async pullTranslations(options?: {
    language?: string;
    status?: 'draft' | 'approved';
  }): Promise<PullResult> {
    const headers = await this.getHeaders();
    const params = new URLSearchParams();
    
    if (options?.language) params.set('language', options.language);
    if (options?.status) params.set('status', options.status);
    
    const url = `${this.baseUrl}/api/projects/${this.projectName}/apply/export${
      params.toString() ? `?${params}` : ''
    }`;
    
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, translations: [], error };
    }

    const data = await response.json() as { translations: Translation[] };
    return { success: true, translations: data.translations };
  }
}

// ============================================================================
// Diff Utilities
// ============================================================================

export interface LocalKey {
  filename: string;
  key: string;
  value: string;
  hash: string;
}

/**
 * Compute diff between server and local keys
 */
export function computeDiff(
  serverManifest: Record<string, Record<string, string>>,
  localKeys: LocalKey[]
): SourceKeyOperation[] {
  const operations: SourceKeyOperation[] = [];
  const localMap = new Map<string, LocalKey>();

  // Build local map: "filename:key" -> LocalKey
  for (const key of localKeys) {
    localMap.set(`${key.filename}:${key.key}`, key);
  }

  // Build server set
  const serverSet = new Set<string>();
  for (const [filename, keys] of Object.entries(serverManifest)) {
    for (const key of Object.keys(keys)) {
      serverSet.add(`${filename}:${key}`);
    }
  }

  // Find adds and updates
  for (const local of localKeys) {
    const id = `${local.filename}:${local.key}`;
    const serverHash = serverManifest[local.filename]?.[local.key];

    if (!serverHash) {
      // New key
      operations.push({
        op: 'add',
        filename: local.filename,
        key: local.key,
        value: local.value,
        hash: local.hash,
      });
    } else if (serverHash !== local.hash) {
      // Updated key
      operations.push({
        op: 'update',
        filename: local.filename,
        key: local.key,
        value: local.value,
        hash: local.hash,
      });
    }
  }

  // Find deletes
  for (const serverId of serverSet) {
    if (!localMap.has(serverId)) {
      const [filename, key] = serverId.split(':');
      operations.push({
        op: 'delete',
        filename,
        key,
      });
    }
  }

  return operations;
}
