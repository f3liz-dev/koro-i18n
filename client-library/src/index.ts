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

// Import shared types via path mapping
import type { GitBlameInfo, R2Metadata } from '@shared/types';

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
