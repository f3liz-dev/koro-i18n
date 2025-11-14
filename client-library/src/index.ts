import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as toml from 'toml';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

export interface GitCommitInfo {
  author: string;
  email: string;
  commitSha: string;
  timestamp: string;
}

export interface KeyHistory {
  key: string;
  commits: GitCommitInfo[];
}

export interface StructureMapEntry {
  flattenedKey: string;
  originalPath: string[];
  sourceHash: string;
}

export interface TranslationFile {
  filetype: 'json' | 'markdown' | 'yaml';
  filename: string;
  lang: string;
  contents: Record<string, any>;
  metadata?: {
    size: number;
    keys: number;
    lastModified?: string;
    lastAuthor?: string;
  };
  history?: KeyHistory[];
  structureMap?: StructureMapEntry[];
  sourceHash?: string;
}

export interface ProjectMetadata {
  repository: string;
  branch: string;
  commit: string;
  sourceLanguage: string;
  targetLanguages: string[];
  files: TranslationFile[];
  generatedAt: string;
}

export interface Config {
  projectName?: string;
  sourceLanguage: string;
  targetLanguages: string[];
  outputPattern: string;
  includePatterns: string[];
  excludePatterns: string[];
  sourceFiles: Array<{
    path: string;
    format: string;
    keyPattern?: string;
  }>;
}

/**
 * Parse JSON translation file
 */
function parseJSON(content: string): Record<string, any> {
  return JSON.parse(content);
}

/**
 * Parse Markdown translation file
 * Format: # Section\n- key: value
 */
function parseMarkdown(content: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = content.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Section header
    if (trimmed.startsWith('#')) {
      currentSection = trimmed.replace(/^#+\s*/, '').toLowerCase().replace(/\s+/g, '_');
      continue;
    }

    // Key-value pair
    const match = trimmed.match(/^-\s*([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      const fullKey = currentSection ? `${currentSection}.${key}` : key;
      result[fullKey] = value;
    }
  }

  return result;
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
 * Calculate SHA-256 hash of content
 */
function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Build structure map that tracks the relationship between original nested structure and flattened keys
 */
function buildStructureMap(obj: any, sourceContent: string, prefix = ''): StructureMapEntry[] {
  const map: StructureMapEntry[] = [];
  const sourceHash = calculateHash(sourceContent);

  function traverse(current: any, path: string[], flatPrefix: string) {
    for (const [key, value] of Object.entries(current)) {
      const newPath = [...path, key];
      const flatKey = flatPrefix ? `${flatPrefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value, newPath, flatKey);
      } else {
        map.push({
          flattenedKey: flatKey,
          originalPath: newPath,
          sourceHash: calculateHash(String(value)),
        });
      }
    }
  }

  traverse(obj, [], prefix);
  return map;
}

/**
 * Extract git commit history for a file
 */
function extractGitHistory(filePath: string): KeyHistory[] {
  try {
    // Check if git is available and we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch {
      console.warn(`[git-history] Not in a git repository, skipping history extraction for ${filePath}`);
      return [];
    }

    // Get git log with author, email, commit sha, and timestamp
    const gitLog = execSync(
      `git log --follow --format="%H|%an|%ae|%ai" -- "${filePath}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    ).trim();

    if (!gitLog) {
      return [];
    }

    const commits: GitCommitInfo[] = gitLog.split('\n').map(line => {
      const [commitSha, author, email, timestamp] = line.split('|');
      return { commitSha, author, email, timestamp };
    });

    // Return only the latest commit (first in the log)
    const latestCommit = commits.length > 0 ? [commits[0]] : [];
    return [{
      key: '__file__',
      commits: latestCommit,
    }];
  } catch (error: any) {
    console.warn(`[git-history] Failed to extract git history for ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Extract per-key git history using git blame
 */
function extractPerKeyGitHistory(filePath: string, flattenedKeys: string[]): KeyHistory[] {
  try {
    // Check if git is available
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch {
      return [];
    }

    // Read the file content to map keys to line numbers
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileLines = fileContent.split('\n');
    
    // Build a map of flattened keys to their line numbers in the file
    const keyToLineMap: Map<string, number> = new Map();
    
    // For JSON files, we need to find which line contains each key
    // We'll search for the key name (as a quoted string) in the file
    for (const key of flattenedKeys) {
      // Split nested keys to find the actual property name
      const keyParts = key.split('.');
      const leafKey = keyParts[keyParts.length - 1];
      
      // Search for the line containing this key
      // Look for patterns like: "key": or "key" :
      const keyPattern = `"${leafKey}"`;
      
      for (let i = 0; i < fileLines.length; i++) {
        const line = fileLines[i];
        if (line.includes(keyPattern)) {
          // Check if this is actually a key definition (has a colon after it)
          const colonIndex = line.indexOf(keyPattern) + keyPattern.length;
          const afterKey = line.substring(colonIndex).trim();
          if (afterKey.startsWith(':')) {
            // Found the key definition line
            if (!keyToLineMap.has(key)) {
              // Line numbers in git blame are 1-indexed
              keyToLineMap.set(key, i + 1);
              break;
            }
          }
        }
      }
    }
    
    // Use git blame to get line-by-line commit information
    const blameOutput = execSync(
      `git blame --line-porcelain "${filePath}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    ).trim();

    if (!blameOutput) {
      return [];
    }

    // Parse git blame porcelain format
    // Map line numbers to commit info
    const lines = blameOutput.split('\n');
    const lineToCommitMap: Map<number, string> = new Map();
    const commitInfo: Map<string, GitCommitInfo> = new Map();
    
    let currentCommit = '';
    let currentLineNumber = 0;
    let currentAuthor = '';
    let currentEmail = '';
    let currentTimestamp = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.match(/^[0-9a-f]{40}/)) {
        // This is a commit header line
        const parts = line.split(' ');
        currentCommit = parts[0];
        currentLineNumber = parseInt(parts[2], 10);
        
        // Initialize commit info if not exists
        if (!commitInfo.has(currentCommit)) {
          commitInfo.set(currentCommit, { 
            commitSha: currentCommit, 
            author: '', 
            email: '', 
            timestamp: '' 
          });
        }
        
        // Map this line to this commit
        lineToCommitMap.set(currentLineNumber, currentCommit);
      } else if (line.startsWith('author ')) {
        currentAuthor = line.substring(7);
        if (commitInfo.has(currentCommit)) {
          commitInfo.get(currentCommit)!.author = currentAuthor;
        }
      } else if (line.startsWith('author-mail ')) {
        currentEmail = line.substring(12).replace(/[<>]/g, '');
        if (commitInfo.has(currentCommit)) {
          commitInfo.get(currentCommit)!.email = currentEmail;
        }
      } else if (line.startsWith('author-time ')) {
        currentTimestamp = new Date(parseInt(line.substring(12)) * 1000).toISOString();
        if (commitInfo.has(currentCommit)) {
          commitInfo.get(currentCommit)!.timestamp = currentTimestamp;
        }
      }
    }

    // Build per-key history
    const histories: KeyHistory[] = [];
    
    for (const [key, lineNumber] of keyToLineMap.entries()) {
      const commitSha = lineToCommitMap.get(lineNumber);
      if (commitSha && commitInfo.has(commitSha)) {
        const commit = commitInfo.get(commitSha)!;
        histories.push({
          key,
          commits: [commit],
        });
      }
    }

    // If we couldn't map any keys, fall back to file-level history
    if (histories.length === 0 && commitInfo.size > 0) {
      const uniqueCommits = Array.from(commitInfo.values());
      const sortedCommits = uniqueCommits.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      const latestCommit = sortedCommits.length > 0 ? [sortedCommits[0]] : [];
      if (latestCommit.length > 0) {
        histories.push({
          key: '__all_keys__',
          commits: latestCommit,
        });
      }
    }

    return histories;
  } catch (error: any) {
    console.warn(`[git-blame] Failed to extract per-key history for ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Process a single translation file
 */
export function processFile(filePath: string, format: string, includeHistory = true): TranslationFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    
    let parsed: Record<string, any>;
    
    switch (format) {
      case 'json':
        parsed = parseJSON(content);
        break;
      case 'markdown':
        parsed = parseMarkdown(content);
        break;
      default:
        console.warn(`Unsupported format: ${format}`);
        return null;
    }

    // Flatten nested structures
    const flattened = flattenObject(parsed);

    // Extract language from path (e.g., locales/en/common.json -> en)
    const langMatch = filePath.match(/\/([a-z]{2}(-[A-Z]{2})?)\//);
    const lang = langMatch ? langMatch[1] : 'unknown';

    // Build structure map to track original structure
    const structureMap = buildStructureMap(parsed, content);
    
    // Calculate source hash for the entire file
    const sourceHash = calculateHash(content);
    
    // Extract git history if requested
    let history: KeyHistory[] = [];
    if (includeHistory) {
      history = extractPerKeyGitHistory(filePath, Object.keys(flattened));
      if (history.length === 0) {
        // Fallback to file-level history if per-key history is not available
        history = extractGitHistory(filePath);
      }
    }

    return {
      filetype: format as 'json' | 'markdown',
      filename: path.basename(filePath),
      lang,
      contents: flattened,
      metadata: {
        size: stats.size,
        keys: Object.keys(flattened).length,
        lastModified: stats.mtime.toISOString(),
      },
      history,
      structureMap,
      sourceHash,
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return null;
  }
}

/**
 * Load configuration from .koro-i18n.repo.config.toml
 */
export function loadConfig(configPath = '.koro-i18n.repo.config.toml'): Config {
  const content = fs.readFileSync(configPath, 'utf-8');
  return toml.parse(content) as Config;
}

/**
 * Process all translation files in the project
 */
export async function processProject(
  repository: string,
  branch: string,
  commit: string,
  configPath = '.koro-i18n.repo.config.toml'
): Promise<ProjectMetadata> {
  const config = loadConfig(configPath);
  const files: TranslationFile[] = [];

  // Process each source file pattern
  for (const pattern of config.includePatterns || []) {
    const matchedFiles = await glob(pattern, {
      ignore: config.excludePatterns || [],
    });

    for (const filePath of matchedFiles) {
      // Determine format from extension or config
      const ext = path.extname(filePath).slice(1);
      const format = ext === 'json' ? 'json' : ext === 'md' ? 'markdown' : 'json';

      const processed = processFile(filePath, format);
      if (processed) {
        files.push(processed);
      }
    }
  }

  return {
    repository,
    branch,
    commit,
    sourceLanguage: config.sourceLanguage,
    targetLanguages: config.targetLanguages,
    files,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Upload metadata to I18n Platform using structured format with chunking support
 */
export async function uploadToPlatform(
  projectName: string,
  metadata: ProjectMetadata,
  platformUrl: string,
  token: string,
  chunkSize: number = 30
): Promise<void> {
  const totalFiles = metadata.files.length;
  
  // If total files are within chunk size, upload in one request
  if (totalFiles <= chunkSize) {
    const payload = {
      branch: metadata.branch,
      commitSha: metadata.commit,
      sourceLanguage: metadata.sourceLanguage,
      targetLanguages: metadata.targetLanguages,
      files: metadata.files,
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
    console.log('Upload successful:', result);
    return;
  }

  // Split files into chunks and upload sequentially
  console.log(`Uploading ${totalFiles} files in chunks of ${chunkSize}...`);
  
  const chunks: TranslationFile[][] = [];
  for (let i = 0; i < totalFiles; i += chunkSize) {
    chunks.push(metadata.files.slice(i, i + chunkSize));
  }

  let totalUploaded = 0;
  let totalKeys = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkNum = i + 1;
    const filesInChunk = chunk.length;
    
    console.log(`Uploading chunk ${chunkNum}/${chunks.length} (${filesInChunk} files)...`);

    const payload = {
      branch: metadata.branch,
      commitSha: metadata.commit,
      sourceLanguage: metadata.sourceLanguage,
      targetLanguages: metadata.targetLanguages,
      files: chunk,
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
      throw new Error(`Upload failed for chunk ${chunkNum}/${chunks.length} (${response.status}): ${errorText}`);
    }

    const result: any = await response.json();
    totalUploaded += result.filesUploaded || filesInChunk;
    totalKeys += result.totalKeys || 0;
    
    console.log(`Chunk ${chunkNum}/${chunks.length} uploaded successfully (${result.filesUploaded || filesInChunk} files, ${result.totalKeys || 0} keys)`);
  }

  console.log(`All chunks uploaded successfully! Total: ${totalUploaded} files, ${totalKeys} keys`);
}

/**
 * Upload JSON files directly to I18n Platform (native JSON mode)
 */
export async function uploadJSONDirectly(
  projectName: string,
  branch: string,
  commit: string,
  language: string,
  files: Record<string, any>,
  platformUrl: string,
  token: string
): Promise<void> {
  const payload = {
    branch,
    commitSha: commit,
    language,
    files,
  };

  const response = await fetch(`${platformUrl}/api/projects/${projectName}/upload-json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`JSON upload failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log('JSON upload successful:', result);
}

/**
 * Download translations from I18n Platform
 */
export async function downloadFromPlatform(
  projectName: string,
  branch: string,
  language: string | undefined,
  platformUrl: string,
  token: string
): Promise<any> {
  let url = `${platformUrl}/api/projects/${projectName}/download?branch=${branch}`;
  if (language) {
    url += `&language=${language}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Download failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Parse command-line arguments
 */
function parseArgs(): {
  configPath: string;
  oidcToken?: string;
  apiKey?: string;
  projectName?: string;
  platformUrl: string;
  chunkSize: number;
} {
  const args = process.argv.slice(2);
  const result: any = {
    configPath: '.koro-i18n.repo.config.toml',
    platformUrl: process.env.I18N_PLATFORM_URL || 'https://koro.f3liz.workers.dev',
    chunkSize: 30, // Default chunk size
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--config-path' && nextArg) {
      result.configPath = nextArg;
      i++;
    } else if (arg === '--oidc-token' && nextArg) {
      result.oidcToken = nextArg;
      i++;
    } else if (arg === '--api-key' && nextArg) {
      result.apiKey = nextArg;
      i++;
    } else if (arg === '--project-name' && nextArg) {
      result.projectName = nextArg;
      i++;
    } else if (arg === '--platform-url' && nextArg) {
      result.platformUrl = nextArg;
      i++;
    } else if (arg === '--chunk-size' && nextArg) {
      const parsed = parseInt(nextArg, 10);
      if (!isNaN(parsed) && parsed > 0) {
        result.chunkSize = parsed;
      }
      i++;
    }
  }

  // Fall back to environment variables
  if (!result.oidcToken) {
    result.oidcToken = process.env.OIDC_TOKEN;
  }
  if (!result.apiKey) {
    result.apiKey = process.env.I18N_PLATFORM_API_KEY;
  }
  if (!result.projectName) {
    result.projectName = process.env.PROJECT_NAME;
  }

  return result;
}

/**
 * Main function for CLI
 */
export async function main() {
  const args = parseArgs();
  
  const token = args.oidcToken || args.apiKey;
  if (!token) {
    throw new Error('Either OIDC_TOKEN or I18N_PLATFORM_API_KEY environment variable is required, or pass --oidc-token or --api-key');
  }

  const repository = process.env.GITHUB_REPOSITORY || 'unknown/unknown';
  const branch = process.env.GITHUB_REF_NAME || 'main';
  const commit = process.env.GITHUB_SHA || 'unknown';

  console.log('Processing translation files...');
  console.log(`Repository: ${repository}`);
  console.log(`Branch: ${branch}`);
  console.log(`Commit: ${commit}`);
  console.log(`Config path: ${args.configPath}`);
  
  const metadata = await processProject(repository, branch, commit, args.configPath);
  
  console.log(`Found ${metadata.files.length} translation files`);
  console.log(`Source language: ${metadata.sourceLanguage}`);
  console.log(`Target languages: ${metadata.targetLanguages.join(', ')}`);
  
  // Determine project name
  let projectName = args.projectName;
  if (!projectName) {
    // Try to load from config
    const config = loadConfig(args.configPath);
    projectName = config.projectName || repository.split('/')[1] || repository;
  }
  
  if (!projectName) {
    throw new Error('Project name is required. Set PROJECT_NAME environment variable, pass --project-name, or add projectName to config file');
  }
  
  console.log(`Project name: ${projectName}`);
  console.log(`Uploading to: ${args.platformUrl}`);
  console.log(`Chunk size: ${args.chunkSize} files per request`);
  
  await uploadToPlatform(projectName, metadata, args.platformUrl, token, args.chunkSize);
  
  console.log('Done!');
}
