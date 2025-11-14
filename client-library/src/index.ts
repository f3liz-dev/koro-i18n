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
    files: string[];
  };
  target: {
    languages: string[];
  };
}

export interface GitBlameInfo {
  commit: string;
  author: string;
  email: string;
  date: string;
}

export interface Metadata {
  gitBlame: Record<string, GitBlameInfo>;
  charRanges: Record<string, { start: [number, number]; end: [number, number] }>;
  sourceHashes: Record<string, string>;
}

export interface TranslationFile {
  lang: string;
  filename: string;
  contents: Record<string, any>;
  metadata: string; // Base64-encoded MessagePack
  sourceHash: string;
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
 */
function buildMetadata(
  filePath: string,
  flattenedContents: Record<string, string>
): Metadata {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  const blameMap = getGitBlame(filePath);

  const metadata: Metadata = {
    gitBlame: {},
    charRanges: {},
    sourceHashes: {},
  };

  // For each flattened key, find its position in the file
  for (const [key, value] of Object.entries(flattenedContents)) {
    // Find the line containing this key
    const keyParts = key.split('.');
    const leafKey = keyParts[keyParts.length - 1];
    const keyPattern = `"${leafKey}"`;
    
    let lineNum = 0;
    let charStart = 0;
    let charEnd = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(keyPattern)) {
        const colonIndex = line.indexOf(keyPattern) + keyPattern.length;
        const afterKey = line.substring(colonIndex).trim();
        if (afterKey.startsWith(':')) {
          lineNum = i + 1;
          charStart = line.indexOf(keyPattern);
          charEnd = charStart + keyPattern.length;
          break;
        }
      }
    }

    // Get git blame for this line
    const blame = blameMap.get(lineNum);
    if (blame) {
      metadata.gitBlame[key] = blame;
    }

    // Store char range
    metadata.charRanges[key] = {
      start: [lineNum, charStart],
      end: [lineNum, charEnd],
    };

    // Store source hash
    metadata.sourceHashes[key] = hashValue(value);
  }

  return metadata;
}

/**
 * Process a single file
 */
export function processFile(filePath: string): TranslationFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const flattened = flattenObject(parsed);

    // Extract language from path
    const langMatch = filePath.match(/\/([a-z]{2}(-[A-Z]{2})?)\//);
    const lang = langMatch ? langMatch[1] : 'unknown';

    // Build metadata
    const metadata = buildMetadata(filePath, flattened);

    // Compress metadata with MessagePack
    const metadataPacked = encode(metadata);
    const metadataBase64 = Buffer.from(metadataPacked).toString('base64');

    // Calculate source hash
    const sourceHash = hashValue(content);

    return {
      lang,
      filename: path.basename(filePath),
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
 * Upload to platform
 */
export async function upload(
  projectName: string,
  files: TranslationFile[],
  platformUrl: string,
  token: string
): Promise<void> {
  const payload = {
    branch: process.env.GITHUB_REF_NAME || getBranch(),
    commitSha: process.env.GITHUB_SHA || getCommitSha(),
    sourceLanguage: files.find(f => f.lang)?.lang || 'en',
    files,
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
}

/**
 * Main CLI function
 */
export async function main() {
  const configPath = process.argv[2] || '.koro-i18n.repo.config.toml';
  const config = loadConfig(configPath);

  const token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || process.env.JWT_TOKEN;
  if (!token) {
    throw new Error('No token found. Set ACTIONS_ID_TOKEN_REQUEST_TOKEN or JWT_TOKEN');
  }

  console.log(`📦 Processing files for ${config.project.name}...`);

  const allFiles: TranslationFile[] = [];

  for (const pattern of config.source.files) {
    const files = await glob(pattern);
    console.log(`Found ${files.length} files matching ${pattern}`);

    for (const filePath of files) {
      const processed = processFile(filePath);
      if (processed) {
        allFiles.push(processed);
        console.log(`  ✓ ${filePath} (${Object.keys(processed.contents).length} keys)`);
      }
    }
  }

  console.log(`\n📤 Uploading ${allFiles.length} files...`);
  await upload(config.project.name, allFiles, config.project.platform_url, token);
  console.log('✨ Done!');
}
