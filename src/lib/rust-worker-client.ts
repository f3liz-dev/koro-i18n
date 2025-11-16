/// <reference types="@cloudflare/workers-types" />

/**
 * Client for calling the Rust compute worker
 * This offloads CPU-intensive operations to a separate worker
 */

export interface HashRequest {
  values: string[];
}

export interface HashResponse {
  hashes: string[];
}

export interface ValidationRequest {
  translations: TranslationToValidate[];
  source_hashes: Record<string, string>;
}

export interface TranslationToValidate {
  id: string;
  key: string;
  source_hash?: string | null;
}

export interface ValidationResponse {
  results: ValidationResult[];
}

export interface ValidationResult {
  id: string;
  is_valid: boolean;
  reason?: string;
}

export interface UploadRequest {
  project_id: string;
  branch: string;
  commit_sha: string;
  files: FileToUpload[];
}

export interface FileToUpload {
  lang: string;
  filename: string;
  contents: Record<string, any>;
  metadata: string;
  source_hash: string;
  packed_data?: string;
}

export interface UploadResponse {
  success: boolean;
  uploaded_files: string[];
  r2_keys: string[];
}

export interface SortRequest {
  items: any[];
  sort_by: string;
  order?: 'asc' | 'desc';
}

export interface SortResponse {
  sorted: any[];
}

/**
 * Rust compute worker client
 * Calls the auxiliary Rust worker for CPU-intensive operations
 */
export class RustComputeWorker {
  private workerUrl: string;
  private fallbackEnabled: boolean;

  constructor(workerUrl: string, fallbackEnabled = true) {
    this.workerUrl = workerUrl;
    this.fallbackEnabled = fallbackEnabled;
  }

  /**
   * Batch hash multiple values using Rust worker
   * Falls back to local computation if worker is unavailable
   */
  async batchHash(values: string[]): Promise<string[]> {
    try {
      const response = await fetch(`${this.workerUrl}/hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values } as HashRequest),
      });

      if (!response.ok) {
        throw new Error(`Rust worker returned ${response.status}`);
      }

      const data: HashResponse = await response.json();
      return data.hashes;
    } catch (error) {
      if (!this.fallbackEnabled) {
        throw error;
      }

      console.warn('[RustWorker] Failed to call Rust worker, falling back to local computation:', error);
      return this.localBatchHash(values);
    }
  }

  /**
   * Batch validate translations using Rust worker
   * Falls back to local computation if worker is unavailable
   */
  async batchValidate(
    translations: TranslationToValidate[],
    sourceHashes: Record<string, string>
  ): Promise<ValidationResult[]> {
    try {
      const response = await fetch(`${this.workerUrl}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translations,
          source_hashes: sourceHashes,
        } as ValidationRequest),
      });

      if (!response.ok) {
        throw new Error(`Rust worker returned ${response.status}`);
      }

      const data: ValidationResponse = await response.json();
      return data.results;
    } catch (error) {
      if (!this.fallbackEnabled) {
        throw error;
      }

      console.warn('[RustWorker] Failed to call Rust worker, falling back to local computation:', error);
      return this.localBatchValidate(translations, sourceHashes);
    }
  }

  /**
   * Upload files to R2 and D1 using Rust worker
   * This offloads the entire upload operation to Rust
   */
  async upload(uploadRequest: UploadRequest): Promise<UploadResponse> {
    try {
      const response = await fetch(`${this.workerUrl}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Rust worker upload failed ${response.status}: ${errorText}`);
      }

      const data: UploadResponse = await response.json();
      return data;
    } catch (error) {
      console.error('[RustWorker] Upload to Rust worker failed:', error);
      throw error; // No fallback for upload - this is a critical operation
    }
  }

  /**
   * Sort large datasets using Rust worker
   * Use this for >100 items to avoid frontend performance issues
   */
  async sort(items: any[], sortBy: string, order: 'asc' | 'desc' = 'asc'): Promise<any[]> {
    try {
      const response = await fetch(`${this.workerUrl}/sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          sort_by: sortBy,
          order,
        } as SortRequest),
      });

      if (!response.ok) {
        throw new Error(`Rust worker returned ${response.status}`);
      }

      const data: SortResponse = await response.json();
      return data.sorted;
    } catch (error) {
      if (!this.fallbackEnabled) {
        throw error;
      }

      console.warn('[RustWorker] Failed to call Rust worker for sorting, falling back to local sort:', error);
      return this.localSort(items, sortBy, order);
    }
  }

  /**
   * Fallback: Local hash computation (TypeScript implementation)
   */
  private async localBatchHash(values: string[]): Promise<string[]> {
    const crypto = await import('crypto');
    return values.map(value => {
      const hash = crypto.createHash('sha256').update(value).digest('hex');
      return hash.substring(0, 16);
    });
  }

  /**
   * Fallback: Local validation (TypeScript implementation)
   */
  private localBatchValidate(
    translations: TranslationToValidate[],
    sourceHashes: Record<string, string>
  ): ValidationResult[] {
    return translations.map(translation => {
      const currentHash = sourceHashes[translation.key];

      if (!currentHash) {
        return {
          id: translation.id,
          is_valid: false,
          reason: 'Key no longer exists in source',
        };
      }

      if (!translation.source_hash) {
        return {
          id: translation.id,
          is_valid: false,
          reason: 'Translation missing source tracking',
        };
      }

      if (translation.source_hash !== currentHash) {
        return {
          id: translation.id,
          is_valid: false,
          reason: 'Source value changed',
        };
      }

      return {
        id: translation.id,
        is_valid: true,
      };
    });
  }

  /**
   * Fallback: Local sort (TypeScript implementation)
   */
  private localSort(items: any[], sortBy: string, order: 'asc' | 'desc' = 'asc'): any[] {
    const sorted = [...items].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return order === 'desc' ? -comparison : comparison;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'desc' ? bVal - aVal : aVal - bVal;
      }

      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        const comparison = Number(aVal) - Number(bVal);
        return order === 'desc' ? -comparison : comparison;
      }

      return 0;
    });

    return sorted;
  }

  /**
   * Check if Rust worker is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.workerUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Create a Rust compute worker client
 */
export function createRustWorker(env: { COMPUTE_WORKER_URL?: string }): RustComputeWorker | null {
  const workerUrl = env.COMPUTE_WORKER_URL;
  
  if (!workerUrl) {
    console.warn('[RustWorker] COMPUTE_WORKER_URL not configured, Rust worker will not be used');
    return null;
  }

  return new RustComputeWorker(workerUrl);
}
