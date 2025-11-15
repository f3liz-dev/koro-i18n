/// <reference types="@cloudflare/workers-types" />
import { encode, decode } from '@msgpack/msgpack';
import type { R2FileData } from '../../shared/types';

export interface R2StorageEnv {
  TRANSLATION_BUCKET: R2Bucket;
}

export type { R2FileData };

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
 * 
 * ULTRA-OPTIMIZED: Zero encoding - client sends pre-packed data
 */
export async function storeFile(
  bucket: R2Bucket,
  projectId: string,
  lang: string,
  filename: string,
  commitSha: string,
  contents: Record<string, any>,
  metadataBase64: string, // Base64-encoded MessagePack from client
  sourceHash: string,
  packedData?: string // Optional: pre-packed base64 data from client
): Promise<string> {
  const r2Key = generateR2Key(projectId, lang, filename);
  const uploadedAt = new Date().toISOString();
  
  let dataToStore: Uint8Array;
  
  if (packedData) {
    // ZERO CPU: Client sent pre-packed data, just decode base64 and store
    dataToStore = Buffer.from(packedData, 'base64');
  } else {
    // Fallback: Pack on server (for backward compatibility)
    const fileData = {
      raw: contents,
      metadataBase64,
      sourceHash,
      commitSha,
      uploadedAt,
    };
    dataToStore = encode(fileData);
  }
  
  // Store to R2 (overwrites previous version)
  await bucket.put(r2Key, dataToStore, {
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
      uploadedAt,
    },
  });
  
  return r2Key;
}

/**
 * Get file from R2 with caching
 * Handles both old format (metadata object) and new format (metadataBase64 string)
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
  const rawData = decode(new Uint8Array(buffer)) as any;
  
  // Handle new format with metadataBase64
  let data: R2FileData;
  if (rawData.metadataBase64) {
    // New optimized format - decode metadata from base64
    const metadataBuffer = Buffer.from(rawData.metadataBase64, 'base64');
    const metadata = decode(new Uint8Array(metadataBuffer));
    
    data = {
      raw: rawData.raw,
      metadata: metadata as any,
      sourceHash: rawData.sourceHash,
      commitSha: rawData.commitSha,
      uploadedAt: rawData.uploadedAt,
    };
  } else {
    // Old format - metadata already decoded
    data = rawData as R2FileData;
  }
  
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

/**
 * Clean up R2 files that are no longer in source
 * Deletes files from R2 and D1 that don't exist in the provided source file list
 */
export async function cleanupOrphanedFiles(
  bucket: R2Bucket,
  prisma: any,
  projectId: string,
  branch: string,
  sourceFileKeys: Set<string> // Set of "lang/filename" keys
): Promise<{ deleted: number; files: string[] }> {
  // Get all files from D1 for this project/branch
  const existingFiles = await prisma.r2File.findMany({
    where: { projectId, branch },
    select: { id: true, lang: true, filename: true, r2Key: true },
  });

  const deletedFiles: string[] = [];
  
  for (const file of existingFiles) {
    const fileKey = `${file.lang}/${file.filename}`;
    
    // If file is not in source, delete it
    if (!sourceFileKeys.has(fileKey)) {
      // Delete from R2
      await bucket.delete(file.r2Key);
      
      // Delete from D1
      await prisma.r2File.delete({
        where: { id: file.id },
      });
      
      deletedFiles.push(fileKey);
      console.log(`[cleanup] Deleted orphaned file: ${fileKey} (${file.r2Key})`);
    }
  }
  
  return {
    deleted: deletedFiles.length,
    files: deletedFiles,
  };
}
