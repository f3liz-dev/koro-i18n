import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as toml from 'toml';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
import { encode } from '@msgpack/msgpack';

export interface Config {
  project: {
    name: string;
    platform_url: string;
  };
  source: {
    language: string;
    files?: string[];
    include?: string[];
    exclude?: string[];
    lang_marker?: string;
  };
  target: {
    languages: string[];
  };
}

// Import shared types via path mapping
import type { GitBlameInfo, R2Metadata } from '@shared/types';

export interface TranslationFile {
  lang: string;
  filename: string;
  contents: Record<string, any>;
  metadata: string; // Base64-encoded MessagePack (uploaded separately via /upload-misc-git)
  sourceHash: string;
  packedData?: string; // Optional: pre-packed base64 data for R2 (zero server CPU)
}

/**
 * Hash a value for validation
 */
function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
}

/**
 * Flatten nested object to dot notation
 */
function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}

/**
 * Extract git blame for a file
 */
function getGitBlame(filePath: string): Map<number, GitBlameInfo> {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch {
    console.warn(`[git-blame] Not in a git repository, skipping for ${filePath}`);
    return new Map();
  }

  try {
    const blameOutput = execSync(`git blame --line-porcelain "${filePath}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    }).trim();

    const lines = blameOutput.split('\n');
    const lineToCommitMap = new Map<number, GitBlameInfo>();
    
    let currentCommit = '';
    let currentLineNumber = 0;
    let currentAuthor = '';
    let currentEmail = '';
    let currentDate = '';
    
    for (const line of lines) {
      if (line.match(/^[0-9a-f]{40}/)) {
        const parts = line.split(' ');
        currentCommit = parts[0];
        currentLineNumber = parseInt(parts[2], 10);
      } else if (line.startsWith('author ')) {
        currentAuthor = line.substring(7);
      } else if (line.startsWith('author-mail ')) {
        currentEmail = line.substring(12).replace(/[<>]/g, '');
      } else if (line.startsWith('author-time ')) {
        currentDate = new Date(parseInt(line.substring(12)) * 1000).toISOString();
        
        // Store complete info
        lineToCommitMap.set(currentLineNumber, {
          commit: currentCommit,
          author: currentAuthor,
          email: currentEmail,
          date: currentDate,
        });
      }
    }

    return lineToCommitMap;
  } catch (error: any) {
    console.warn(`[git-blame] Failed for ${filePath}:`, error.message);
    return new Map();
  }
}

/**
 * Build metadata for a file
 * Supports both single-line (JSON) and multi-line (Markdown) formats
 */
function buildMetadata(
  filePath: string,
  flattenedContents: Record<string, string>
): R2Metadata {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  const blameMap = getGitBlame(filePath);
  const fileExt = path.extname(filePath).toLowerCase();

  const metadata: R2Metadata = {
    gitBlame: {},
    charRanges: {},
    sourceHashes: {},
  };

  // For each flattened key, find its position in the file
  for (const [key, value] of Object.entries(flattenedContents)) {
    const keyParts = key.split('.');
    const leafKey = keyParts[keyParts.length - 1];
    
    let startLine = 0;
    let startChar = 0;
    let endLine = 0;
    let endChar = 0;

    if (fileExt === '.json') {
      // JSON format: single-line values (even with \n escape sequences)
      const keyPattern = `"${leafKey}"`;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(keyPattern)) {
          const colonIndex = line.indexOf(keyPattern) + keyPattern.length;
          const afterKey = line.substring(colonIndex).trim();
          if (afterKey.startsWith(':')) {
            startLine = i + 1;
            startChar = line.indexOf(keyPattern);
            
            // For JSON, value is always on the same line (or continues with escapes)
            // Find the end of the value on this line
            const valueStart = line.indexOf(':', colonIndex) + 1;
            
            // Find closing quote or comma
            const closingQuote = line.lastIndexOf('"');
            const comma = line.indexOf(',', valueStart);
            
            endLine = i + 1;
            endChar = closingQuote > valueStart ? closingQuote + 1 : 
                     comma > 0 ? comma : line.length;
            break;
          }
        }
      }
    } else if (fileExt === '.md') {
      // Markdown format: multi-line values possible
      // Format: ## Section\n- key: value (can span multiple lines)
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for "- key:" pattern
        if (line.includes(`- ${leafKey}:`)) {
          startLine = i + 1;
          startChar = line.indexOf(`- ${leafKey}:`);
          
          // Find end: next "- " or next "##" or end of file
          endLine = i + 1;
          endChar = line.length;
          
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            if (nextLine.trim().startsWith('- ') || nextLine.trim().startsWith('##')) {
              endLine = j; // Previous line
              endChar = lines[j - 1].length;
              break;
            }
            if (j === lines.length - 1) {
              endLine = j + 1;
              endChar = nextLine.length;
            }
          }
          break;
        }
      }
    } else {
      // Unknown format: treat as single-line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(leafKey)) {
          startLine = i + 1;
          startChar = lines[i].indexOf(leafKey);
          endLine = i + 1;
          endChar = lines[i].length;
          break;
        }
      }
    }

    // Get git blame for the start line
    const blame = blameMap.get(startLine);
    if (blame) {
      metadata.gitBlame[key] = blame;
    }

    // Store char range (supports both single and multi-line)
    metadata.charRanges[key] = {
      start: [startLine, startChar],
      end: [endLine, endChar],
    };

    // Store source hash
    metadata.sourceHashes[key] = hashValue(value);
  }

  return metadata;
}

/**
 * Extract language code from file path using the pattern derived from {lang} marker
 */
function extractLanguage(filePath: string, includePattern: string, langMarker: string): string {
  try {
    // Convert include pattern with {lang} to regex
    // First, escape special regex chars
    let regexPattern = includePattern
      .replace(/[.+?^$|[\]\\]/g, '\\$&')  // Escape special chars (not {} or *)
      .replace(/\{lang\}/g, `___LANG___`)  // Temporarily replace {lang}
      .replace(/\*\*/g, '___DOUBLESTAR___')  // Temporarily replace **
      .replace(/\*/g, '___STAR___')  // Temporarily replace *
      .replace(/___LANG___/g, `(${langMarker})`)  // Replace with capture group
      .replace(/___DOUBLESTAR___/g, '.*')  // ** → .*
      .replace(/___STAR___/g, '[^/]*');  // * → [^/]*
    
    const regex = new RegExp(`^${regexPattern}$`);
    const match = filePath.match(regex);
    
    if (match && match[1]) {
      return match[1];
    }
  } catch (error: any) {
    console.warn(`Failed to extract language from ${filePath}:`, error.message);
  }
  
  return 'unknown';
}

/**
 * Process a single file
 */
export function processFile(
  filePath: string,
  includePattern?: string,
  langMarker?: string,
  baseDir?: string
): TranslationFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const flattened = flattenObject(parsed);

    // Extract language from path
    let lang = 'unknown';
    if (includePattern && langMarker) {
      lang = extractLanguage(filePath, includePattern, langMarker);
    } else {
      // Fallback: try to find language in path
      const match = filePath.match(/\/([a-z]{2}(-[A-Z]{2})?)\//);
      lang = match ? match[1] : 'unknown';
    }

    // Build metadata
    const metadata = buildMetadata(filePath, flattened);

    // Compress metadata with MessagePack
    const metadataPacked = encode(metadata);
    const metadataBase64 = Buffer.from(metadataPacked).toString('base64');

    // Calculate source hash
    const sourceHash = hashValue(content);

    // Compute relative filename (preserves full directory structure)
    // e.g., "locales/en-US/browser/chrome.json" -> "locales/en-US/browser/chrome.json"
    // e.g., "notes/en-US.json" -> "notes/en-US.json"
    let filename = path.basename(filePath);
    if (baseDir) {
      const relativePath = path.relative(baseDir, filePath);
      // Always use forward slash for consistency across platforms
      filename = relativePath.replace(/\\/g, '/');
    }

    return {
      lang,
      filename,
      contents: flattened,
      metadata: metadataBase64,
      sourceHash,
    };
  } catch (error: any) {
    console.error(`Error processing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Load configuration
 */
export function loadConfig(configPath = '.koro-i18n.repo.config.toml'): Config {
  const content = fs.readFileSync(configPath, 'utf-8');
  return toml.parse(content) as Config;
}

/**
 * Get current commit SHA
 */
function getCommitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return `upload-${Date.now()}`;
  }
}

/**
 * Get current branch
 */
function getBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'main';
  }
}

/**
 * Pre-pack files for R2 storage (zero server CPU)
 * Adds commitSha and uploadedAt, then packs with MessagePack
 */
function prePackFiles(files: TranslationFile[], commitSha: string): void {
  const uploadedAt = new Date().toISOString();
  
  for (const file of files) {
    // Do NOT inline metadata into the main R2 object.
    // Metadata will be uploaded separately to /upload-misc-git.
    const fileData = {
      raw: file.contents,
      sourceHash: file.sourceHash,
      commitSha,
      uploadedAt,
    };
    const packed = encode(fileData);
    file.packedData = Buffer.from(packed).toString('base64');
  }
}

/**
 * Run cleanup to remove orphaned files
 */
async function runCleanup(
  projectName: string,
  platformUrl: string,
  token: string,
  branch: string,
  allSourceFileKeys: Set<string>
): Promise<void> {
  try {
    console.log('🧹 Running cleanup check...');
    
    const response = await fetch(`${platformUrl}/api/projects/${projectName}/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        branch,
        allSourceFiles: Array.from(allSourceFileKeys),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠ Cleanup failed (${response.status}): ${errorText}`);
      return;
    }

    const result = await response.json() as any;
    if (result.cleanupResult && result.cleanupResult.deleted > 0) {
      console.log(`🧹 Cleaned up ${result.cleanupResult.deleted} orphaned files`);
    } else {
      console.log('✨ No orphaned files to clean up');
    }
  } catch (error: any) {
    console.warn(`⚠ Cleanup error: ${error.message}`);
  }
}

/**
 * Fetch existing files from platform to check for duplicates
 */
async function fetchExistingFiles(
  projectName: string,
  platformUrl: string,
  token: string,
  branch: string
): Promise<Map<string, string>> {
  try {
    const response = await fetch(
      `${platformUrl}/api/projects/${projectName}/files/list-oidc?branch=${encodeURIComponent(branch)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.warn(`⚠ Could not fetch existing files (${response.status}), uploading all files`);
      return new Map();
    }

    const data = await response.json() as any;
    const existingFiles = new Map<string, string>();
    
    for (const file of data.files || []) {
      const key = `${file.lang}/${file.filename}`;
      existingFiles.set(key, file.sourceHash);
    }
    
    console.log(`📥 Found ${existingFiles.size} existing files on platform`);
    return existingFiles;
  } catch (error: any) {
    console.warn(`⚠ Error fetching existing files: ${error.message}, uploading all files`);
    return new Map();
  }
}

/**
 * Upload to platform with chunking support and differential upload
 */
export async function upload(
  projectName: string,
  files: TranslationFile[],
  platformUrl: string,
  token: string,
  chunkSize: number,
  sourceLanguage?: string
): Promise<void> {
  const branch = process.env.GITHUB_REF_NAME || getBranch();
  const commitSha = process.env.GITHUB_SHA || getCommitSha();
  // Use provided sourceLanguage or default to 'en'
  const actualSourceLanguage = sourceLanguage || 'en';

  // Collect ALL source file keys (for cleanup - includes unchanged files)
  const allSourceFileKeys = new Set<string>();
  for (const file of files) {
    allSourceFileKeys.add(`${file.lang}/${file.filename}`);
  }

  // Fetch existing files for differential upload
  console.log('🔍 Checking for existing files...');
  const existingFiles = await fetchExistingFiles(projectName, platformUrl, token, branch);
  
  // Filter out files that haven't changed (same sourceHash)
  const filesToUpload = files.filter(file => {
    const key = `${file.lang}/${file.filename}`;
    const existingHash = existingFiles.get(key);
    
    if (existingHash === file.sourceHash) {
      console.log(`  ⏭ Skipping ${key} (unchanged)`);
      return false;
    }
    
    return true;
  });
  
  const skippedCount = files.length - filesToUpload.length;
  if (skippedCount > 0) {
    console.log(`✨ Skipping ${skippedCount} unchanged files (differential upload)`);
  }
  
  if (filesToUpload.length === 0) {
    console.log('✅ All files are up to date, nothing to upload');
    
    // Still need to run cleanup even if no files changed
    await runCleanup(projectName, platformUrl, token, branch, allSourceFileKeys);
    return;
  }

  // Pre-pack all files on client (zero server CPU)
  console.log(`📦 Pre-packing ${filesToUpload.length} files for optimized upload...`);
  prePackFiles(filesToUpload, commitSha);

  // If files are small enough, use single upload
    if (filesToUpload.length <= chunkSize) {
    const payload = {
      branch,
      commitSha,
      sourceLanguage: actualSourceLanguage,
      files: filesToUpload,
    };

    const response = await fetch(`${platformUrl}/api/projects/${projectName}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Upload successful:', result);
    
    // Upload metadata separately to /upload-misc-git for each file
    for (const f of filesToUpload) {
      if (f.metadata) {
        try {
          const r2Key = `${projectName}-${f.lang}-${f.filename.replace(/[\\/]/g, '-')}`;
          const mres = await fetch(`${platformUrl}/api/projects/${projectName}/upload-misc-git`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              project_id: projectName,
              r2_key: r2Key,
              metadata_base64: f.metadata,
              lang: f.lang,
              filename: f.filename,
            }),
          });
          if (!mres.ok) {
            console.warn(`⚠ metadata upload failed for ${f.filename} (${mres.status})`);
          }
        } catch (err: any) {
          console.warn(`⚠ metadata upload error for ${f.filename}: ${err.message}`);
        }
      }
    }

    // Run cleanup after successful upload
    await runCleanup(projectName, platformUrl, token, branch, allSourceFileKeys);
    return;
  }

  // Chunked upload for large file sets
  console.log(`📦 Uploading ${filesToUpload.length} files in chunks of ${chunkSize}...`);
  
  const totalChunks = Math.ceil(filesToUpload.length / chunkSize);
  const uploadId = `${commitSha}-${Date.now()}`;
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, filesToUpload.length);
    const chunk = filesToUpload.slice(start, end);
    const chunkIndex = i + 1;
    
    console.log(`📤 Uploading chunk ${chunkIndex}/${totalChunks} (${chunk.length} files)...`);
    
    const payload = {
      branch,
      commitSha,
      sourceLanguage: actualSourceLanguage,
      files: chunk,
      chunked: {
        uploadId,
        chunkIndex,
        totalChunks,
        isLastChunk: chunkIndex === totalChunks,
      },
    };

    const response = await fetch(`${platformUrl}/api/projects/${projectName}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chunk ${chunkIndex}/${totalChunks} upload failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const progress = Math.round((end / filesToUpload.length) * 100);
    console.log(`  ✓ Chunk ${chunkIndex}/${totalChunks} complete (${progress}% total)`);
    
    // Show final summary and run cleanup on last chunk
    if (chunkIndex === totalChunks) {
      console.log('✅ Upload successful:', result);

      // Upload metadata for all chunked files after final chunk completes
      for (const f of filesToUpload) {
        if (f.metadata) {
          try {
            const r2Key = `${projectName}-${f.lang}-${f.filename.replace(/[\\/]/g, '-')}`;
            const mres = await fetch(`${platformUrl}/api/projects/${projectName}/upload-misc-git`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                project_id: projectName,
                r2_key: r2Key,
                metadata_base64: f.metadata,
                lang: f.lang,
                filename: f.filename,
              }),
            });
            if (!mres.ok) {
              console.warn(`⚠ metadata upload failed for ${f.filename} (${mres.status})`);
            }
          } catch (err: any) {
            console.warn(`⚠ metadata upload error for ${f.filename}: ${err.message}`);
          }
        }
      }

      await runCleanup(projectName, platformUrl, token, branch, allSourceFileKeys);
    }
  }
}

/**
 * Main CLI function
 */
export async function main() {
  const configPath = process.argv[2] || '.koro-i18n.repo.config.toml';
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  
  const config = loadConfig(configPath);

  if (!config?.project?.name) {
    throw new Error('Invalid config: missing project.name');
  }

  const token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || process.env.JWT_TOKEN;
  if (!token) {
    throw new Error('No token found. Set ACTIONS_ID_TOKEN_REQUEST_TOKEN or JWT_TOKEN');
  }

  // Configurable chunk size (default 10, can be overridden via env var)
  const chunkSize = parseInt(process.env.UPLOAD_CHUNK_SIZE || '10', 10);

  console.log(`📦 Processing files for ${config.project.name}...`);

  const allFiles: TranslationFile[] = [];

  // Map files to their matching patterns
  const fileToPattern = new Map<string, string>();

  if (config.source.files) {
    // Simple mode: direct file paths (no glob)
    const existingFiles = config.source.files.filter(f => fs.existsSync(f));
    console.log(`Using ${existingFiles.length} files from config`);
    for (const file of existingFiles) {
      fileToPattern.set(file, '');
    }
  } else if (config.source.include) {
    // Advanced mode: glob patterns with {lang} marker
    const includePatterns = config.source.include;
    const excludePatterns = config.source.exclude || [];

    for (const pattern of includePatterns) {
      // Replace {lang} with * for glob matching (support multiple segments like ja-JP-mac)
      const globPattern = pattern.replace(/\{lang\}/g, '*');
      
      const files = await glob(globPattern, {
        ignore: excludePatterns.filter(p => !p.startsWith('regex:')),
      });
      console.log(`Found ${files.length} files matching ${pattern}`);
      
      // Map each file to its pattern
      for (const file of files) {
        fileToPattern.set(file, pattern);
      }
    }
  } else {
    throw new Error('Config must specify either source.files or source.include');
  }

  // Apply regex-based exclude if specified
  if (config.source.exclude) {
    const regexExcludes = config.source.exclude.filter(p => p.startsWith('regex:'));
    if (regexExcludes.length > 0) {
      const originalCount = fileToPattern.size;
      for (const excludePattern of regexExcludes) {
        const pattern = excludePattern.substring(6); // Remove 'regex:' prefix
        try {
          const regex = new RegExp(pattern);
          for (const file of fileToPattern.keys()) {
            if (regex.test(file)) {
              fileToPattern.delete(file);
            }
          }
        } catch (error: any) {
          console.warn(`Invalid regex exclude pattern: ${pattern}`, error.message);
        }
      }
      console.log(`Excluded ${originalCount - fileToPattern.size} files via regex`);
    }
  }

  // Build list of valid languages (source + targets)
  const validLanguages = new Set([
    config.source.language,
    ...config.target.languages,
  ]);

  // Process all matched files
  // Default pattern supports: en, ja-JP, ja-JP-mac, ja-JP-x-kansai, etc.
  const langMarker = config.source.lang_marker || '([a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)';
  const baseDir = process.cwd();
  let skippedCount = 0;
  
  for (const [filePath, pattern] of fileToPattern.entries()) {
    const processed = processFile(filePath, pattern || undefined, langMarker, baseDir);
    if (processed) {
      // Skip files with unknown language or language not in config
      if (processed.lang === 'unknown') {
        console.warn(`  ⚠ ${filePath} - could not extract language, skipping`);
        skippedCount++;
        continue;
      }
      
      if (!validLanguages.has(processed.lang)) {
        console.warn(`  ⚠ ${filePath} [${processed.lang}] - language not in config, skipping`);
        skippedCount++;
        continue;
      }
      
      allFiles.push(processed);
      console.log(`  ✓ ${filePath} [${processed.lang}] (${Object.keys(processed.contents).length} keys)`);
    }
  }
  
  if (skippedCount > 0) {
    console.log(`\n⚠ Skipped ${skippedCount} files (unknown or unconfigured languages)`);
  }

  console.log(`\n📤 Uploading ${allFiles.length} files (chunk size: ${chunkSize})...`);
  
  // Pass all files (including unchanged ones) for proper cleanup tracking
  await upload(config.project.name, allFiles, config.project.platform_url, token, chunkSize, config.source.language);
  console.log('✨ Done!');
}
