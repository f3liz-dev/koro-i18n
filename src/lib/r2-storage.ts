/// <reference types="@cloudflare/workers-types" />
import { encode, decode } from '@msgpack/msgpack';

export interface R2StorageEnv {
  TRANSLATION_BUCKET: R2Bucket;
}

export interface R2FileData {
  raw: Record<string, any>; // Flattened key-value pairs
  metadata: {
    gitBlame: Record<string, {
      commit: string;
      author: string;
      email: string;
      date: string;
    }>;
    charRanges: Record<string, {
      start: [number, number];
      end: [number, number];
    }>;
    sourceHashes: Record<string, string>; // key -> hash of source value (for validation)
  };
  sourceHash: string; // Hash of entire source file
  commitSha: string;
  uploadedAt: string;
}

// In-memory cache for R2 data (per-worker instance)
const r2Cache = new Map<string, { data: R2FileData; expires: number }>();
const CACHE_TTL = 3600000; // 1 hour

/**
 * Generate R2 key for a file
 * Format: [project]-[lang]-[filename]
 * No commit hash - we overwrite on each upload and rely on git history
 */
export function generateR2Key(
  projectId: string,
  lang: string,
  filename: string
): string {
  // Sanitize filename (remove path separators)
  const sanitizedFilename = filename.replace(/[\/\\]/g, '-');
  return `${projectId}-${lang}-${sanitizedFilename}`;
}

/**
 * Store individual file to R2
 * Each file is stored separately and OVERWRITES previous version
 * Git history is preserved in the metadata
 */
export async function storeFile(
  bucket: R2Bucket,
  projectId: string,
  lang: string,
  filename: string,
  commitSha: string,
  contents: Record<string, any>,
  metadataBase64: string, // Base64-encoded MessagePack from client
  sourceHash: string
): Promise<string> {
  const r2Key = generateR2Key(projectId, lang, filename);
  
  // Decode metadata from base64 (already MessagePack compressed by client)
  const metadataBuffer = Buffer.from(metadataBase64, 'base64');
  const metadata = decode(new Uint8Array(metadataBuffer));
  
  const fileData: R2FileData = {
    raw: contents,
    metadata: metadata as any,
    sourceHash,
    commitSha,
    uploadedAt: new Date().toISOString(),
  };
  
  // Encode with MessagePack for compression
  const packed = encode(fileData);
  
  // Store to R2 (overwrites previous version)
  await bucket.put(r2Key, packed, {
    httpMetadata: {
      contentType: 'application/msgpack',
      cacheControl: 'public, max-age=3600', // Cache for 1 hour (mutable)
    },
    customMetadata: {
      project: projectId,
      lang,
      filename,
      commitSha,
      sourceHash,
      uploadedAt: fileData.uploadedAt,
    },
  });
  
  return r2Key;
}

/**
 * Get file from R2 with caching
 */
export async function getFile(
  bucket: R2Bucket,
  r2Key: string
): Promise<R2FileData | null> {
  // Check cache first
  const cached = r2Cache.get(r2Key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  // Fetch from R2
  const object = await bucket.get(r2Key);
  if (!object) {
    return null;
  }
  
  // Decode MessagePack
  const buffer = await object.arrayBuffer();
  const data = decode(new Uint8Array(buffer)) as R2FileData;
  
  // Cache for 1 hour
  r2Cache.set(r2Key, {
    data,
    expires: Date.now() + CACHE_TTL,
  });
  
  return data;
}

/**
 * Get file by components (convenience method)
 */
export async function getFileByComponents(
  bucket: R2Bucket,
  projectId: string,
  lang: string,
  filename: string
): Promise<R2FileData | null> {
  const r2Key = generateR2Key(projectId, lang, filename);
  return getFile(bucket, r2Key);
}

/**
 * Clear cache (useful for testing)
 */
export function clearR2Cache(): void {
  r2Cache.clear();
}
