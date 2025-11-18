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
  
  // New flow: main object contains only the packed file data.
  // Metadata lives in a separate R2 object named "{r2Key}-misc-git".
  let data: R2FileData;

  const miscKey = `${r2Key}-misc-git`;
  let metadataObj: any = {};

  try {
    const miscObject = await bucket.get(miscKey);
    if (miscObject) {
      const mBuf = await miscObject.arrayBuffer();
      metadataObj = decode(new Uint8Array(mBuf));
    } else {
      // No misc object found — metadata stays empty (migration pending)
      metadataObj = {};
    }
  } catch (err) {
    // If fetching misc key fails, proceed without metadata
    console.warn(`[r2-storage] failed to fetch misc metadata for ${miscKey}:`, (err as any)?.message || err);
    metadataObj = {};
  }

  data = {
    raw: rawData.raw,
    metadata: metadataObj as any,
    sourceHash: rawData.sourceHash,
    commitSha: rawData.commitSha,
    uploadedAt: rawData.uploadedAt,
  };

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

    // If file is not in source, perform coordinated deletion:
    // 1) mark D1 record as deleting = true
    // 2) delete main R2 object and misc metadata (best-effort)
    // 3) remove D1 record only if deleting is still true (deleteMany guard)
    // If step 3 fails, reset deleting flag to false so other workers may retry.
    if (!sourceFileKeys.has(fileKey)) {
      // Step 1: mark record as deleting
      try {
        await prisma.r2File.update({
          where: { id: file.id },
          data: { deleting: true },
        });
      } catch (err) {
        console.warn(`[cleanup] failed to mark D1 record deleting for ${fileKey} (id=${file.id}):`, (err as any)?.message || err);
        // If we can't mark it, skip this file to avoid racing with other processes
        continue;
      }

      // Step 2: delete R2 objects (best-effort)
      try {
        await bucket.delete(file.r2Key);
      } catch (err) {
        console.warn(`[cleanup] failed to delete main R2 object ${file.r2Key}:`, (err as any)?.message || err);
      }

      const miscKey = `${file.r2Key}-misc-git`;
      try {
        await bucket.delete(miscKey);
      } catch (err) {
        console.warn(`[cleanup] failed to delete misc metadata ${miscKey}:`, (err as any)?.message || err);
      }

      // Step 3: delete D1 record only if deleting flag was set by us (guarded delete)
      try {
        const result = await prisma.r2File.deleteMany({
          where: { id: file.id, deleting: true },
        });

        if (result.count === 1) {
          // Successfully removed
          deletedFiles.push(fileKey);
          console.log(`[cleanup] Deleted orphaned file: ${fileKey} (${file.r2Key})`);
        } else {
          // Deletion did not occur; reset deleting flag to false to allow retries
          console.warn(`[cleanup] conditional delete did not remove D1 record for ${fileKey} (id=${file.id}), resetting deleting flag`);
          try {
            await prisma.r2File.update({
              where: { id: file.id },
              data: { deleting: false },
            });
          } catch (err) {
            console.warn(`[cleanup] failed to reset deleting flag for ${fileKey} (id=${file.id}):`, (err as any)?.message || err);
          }
        }
      } catch (err) {
        console.warn(`[cleanup] failed during D1 transactional delete for ${fileKey} (id=${file.id}):`, (err as any)?.message || err);
        // Attempt to reset deleting flag to false
        try {
          await prisma.r2File.update({
            where: { id: file.id },
            data: { deleting: false },
          });
        } catch (e) {
          console.warn(`[cleanup] failed to reset deleting flag after transaction error for ${fileKey} (id=${file.id}):`, (e as any)?.message || e);
        }
      }
    }
  }

  return {
    deleted: deletedFiles.length,
    files: deletedFiles,
  };
}
