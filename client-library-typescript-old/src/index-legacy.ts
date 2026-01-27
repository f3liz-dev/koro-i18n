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
  metadata: string; // Base64-encoded MessagePack (for git blame info)
  rawMetadata: R2Metadata; // Raw metadata for source file generation
  sourceHash: string;
  filePath: string; // Original file path for re-reading content
}

export interface ManifestFile {
  filename: string;
  sourceFilename: string;
  lastUpdated: string;
  commitHash: string;
  language: string;
  totalKeys: number;
}

export interface GeneratedManifest {
  repository: string;
  sourceLanguage: string;
  configVersion: number;
  files: ManifestFile[];
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
      .replace(/\*\*\//g, '___DOUBLESTARSLASH___')  // Replace **/ first (glob: zero or more path segments)
      .replace(/\*\*/g, '___DOUBLESTAR___')  // Temporarily replace remaining **
      .replace(/\*/g, '___STAR___')  // Temporarily replace *
      .replace(/___LANG___/g, `(${langMarker})`)  // Replace with capture group
      .replace(/___DOUBLESTARSLASH___/g, '(?:.*/)?')  // **/ → optional path segments with trailing slash
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
    const rawMetadata = buildMetadata(filePath, flattened);

    // Compress metadata with MessagePack
    const metadataPacked = encode(rawMetadata);
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
      rawMetadata,
      sourceHash,
      filePath,
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
 * Generate manifest file for the repository
 * Creates .koro-i18n/koro-i18n.repo.generated.json
 */
export function generateManifest(
  repository: string,
  sourceLanguage: string,
  files: TranslationFile[]
): GeneratedManifest {
  // Build a map of source file placeholders to total key counts
  const sourceKeyCounts = new Map<string, number>();
  for (const file of files) {
    if (file.lang !== sourceLanguage) continue;
    const placeholder = replaceLanguageWithPlaceholder(file.filename, sourceLanguage);
    const totalKeys = Object.keys(flattenObject(file.contents)).length;
    sourceKeyCounts.set(placeholder, totalKeys);
  }

  const manifestFiles: ManifestFile[] = files.map(file => {
    const placeholder = replaceLanguageWithPlaceholder(file.filename, file.lang);
    const sourceFilename = placeholder.replace('<lang>', sourceLanguage);
    const totalKeys = sourceKeyCounts.get(placeholder) || 0;

    return {
      filename: file.filename,
      sourceFilename,
      lastUpdated: new Date().toISOString(),
      commitHash: getCommitSha(),
      language: file.lang,
      totalKeys,
    } as ManifestFile;
  });

  return {
    repository,
    sourceLanguage,
    configVersion: 1,
    files: manifestFiles,
  };
}

/**
 * Manifest header in JSONL format (first line of the file)
 */
export interface ManifestHeaderJsonl {
  type: 'header';
  repository: string;
  sourceLanguage: string;
  configVersion: number;
  totalFiles: number;
}

/**
 * Manifest file entry wrapper in JSONL format
 */
export interface ManifestEntryJsonl {
  type: 'file';
  entry: ManifestFile;
}

/**
 * Write manifest to .koro-i18n/koro-i18n.repo.generated.jsonl (JSONL format)
 * JSONL format is more efficient for streaming:
 * - First line: header with metadata
 * - Subsequent lines: file entries
 */
function writeManifest(manifest: GeneratedManifest): void {
  const outputDir = '.koro-i18n';
  const outputPath = path.join(outputDir, 'koro-i18n.repo.generated.jsonl');

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Build JSONL content
  const lines: string[] = [];
  
  // First line: header
  const header: ManifestHeaderJsonl = {
    type: 'header',
    repository: manifest.repository,
    sourceLanguage: manifest.sourceLanguage,
    configVersion: manifest.configVersion,
    totalFiles: manifest.files.length,
  };
  lines.push(JSON.stringify(header));
  
  // Subsequent lines: file entries
  for (const file of manifest.files) {
    const entry: ManifestEntryJsonl = {
      type: 'file',
      entry: file,
    };
    lines.push(JSON.stringify(entry));
  }

  // Write JSONL file
  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`\n✅ Manifest generated: ${outputPath} (${manifest.files.length} files)`);
}

/**
 * Replace the language code in a filepath with <lang> placeholder
 * e.g., "locales/ja/common.json" -> "locales/<lang>/common.json"
 * Note: This replaces the first occurrence of the language code as a path segment.
 */
function replaceLanguageWithPlaceholder(filename: string, language: string): string {
  return filename.replace(
    new RegExp(`(^|/)${escapeRegExp(language)}(/|$)`),
    '$1<lang>$2'
  );
}

/**
 * Progress translated data structure
 * Maps filepath (with <lang> placeholder) to array of translated key names
 */
export interface ProgressTranslated {
  [filepathWithLangPlaceholder: string]: string[];
}

/**
 * Progress translated header in JSONL format (first line of the file)
 */
export interface ProgressHeaderJsonl {
  type: 'header';
  language: string;
  totalFiles: number;
}

/**
 * Progress translated file entry in JSONL format
 */
export interface ProgressEntryJsonl {
  type: 'file';
  filepath: string;  // filepath with <lang> placeholder
  keys: string[];    // array of translated key names
}

/**
 * Generate and write progress-translated files for each target language
 * Creates .koro-i18n/progress-translated/[lang].jsonl
 * JSONL format: header line followed by file entries
 */
function writeProgressTranslated(
  files: TranslationFile[],
  sourceLanguage: string
): void {
  const outputDir = '.koro-i18n/progress-translated';

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Group files by language (exclude source language)
  const filesByLang = new Map<string, TranslationFile[]>();
  for (const file of files) {
    if (file.lang === sourceLanguage) continue;
    
    const existing = filesByLang.get(file.lang) || [];
    existing.push(file);
    filesByLang.set(file.lang, existing);
  }

  // Generate progress-translated file for each target language
  for (const [lang, langFiles] of filesByLang.entries()) {
    const lines: string[] = [];
    
    // First line: header
    const header: ProgressHeaderJsonl = {
      type: 'header',
      language: lang,
      totalFiles: langFiles.length,
    };
    lines.push(JSON.stringify(header));

    for (const file of langFiles) {
      const filepathWithPlaceholder = replaceLanguageWithPlaceholder(file.filename, lang);

      // Get all translated key names (keys from the contents)
      const translatedKeys = Object.keys(file.contents);

      const entry: ProgressEntryJsonl = {
        type: 'file',
        filepath: filepathWithPlaceholder,
        keys: translatedKeys,
      };
      lines.push(JSON.stringify(entry));
    }

    // Write the progress file for this language (JSONL format)
    const outputPath = path.join(outputDir, `${lang}.jsonl`);
    fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
    console.log(`  ✓ Progress translated: ${outputPath} (${langFiles.length} files)`);
  }

  if (filesByLang.size > 0) {
    console.log(`\n✅ Progress translated generated for ${filesByLang.size} languages`);
  }
}

/**
 * Translation entry status
 */
export type TranslationStatus = 'verified' | 'outdated' | 'pending';

/**
 * Store entry for a single translation key
 */
export interface StoreEntry {
  src: string;      // Git commit hash (short) of the source line
  tgt: string;      // Git commit hash (short) of the target/translated line
  updated: number;  // Unix timestamp (seconds) from git blame
  status: TranslationStatus;
}

/**
 * Store data structure
 * Maps filepath (with <lang> placeholder) to {key: StoreEntry}
 */
export interface StoreData {
  [filepathWithLangPlaceholder: string]: Record<string, StoreEntry>;
}

/**
 * Default number of keys per chunk in store files
 * This prevents individual JSONL lines from becoming too large
 */
const STORE_KEYS_PER_CHUNK = 100;

/**
 * Store header in JSONL format (first line of the file)
 */
export interface StoreHeaderJsonl {
  type: 'header';
  language: string;
  totalFiles: number;
  totalKeys: number;  // Total number of keys across all files
}

/**
 * Store file header in JSONL format
 * One per file, before its chunk entries
 */
export interface StoreFileHeaderJsonl {
  type: 'file_header';
  filepath: string;  // filepath with <lang> placeholder
  totalKeys: number; // Total number of keys in this file
}

/**
 * Store chunk entry in JSONL format
 * Contains a subset of keys for a file (chunked for streaming)
 */
export interface StoreChunkJsonl {
  type: 'chunk';
  filepath: string;  // filepath with <lang> placeholder
  chunkIndex: number;
  entries: Record<string, StoreEntry>;  // key -> StoreEntry map (limited to STORE_KEYS_PER_CHUNK)
}

// Legacy type for backward compatibility
export interface StoreFileEntryJsonl {
  type: 'file';
  filepath: string;  // filepath with <lang> placeholder
  entries: Record<string, StoreEntry>;  // key -> StoreEntry map
}


/**
 * Find line number for a nested key in JSON content
 * Handles nested structures like "buttons.save" properly
 */
function findKeyLineInJson(
  lines: string[],
  keyPath: string
): number {
  // Track the current path of parent keys
  const pathStack: string[] = [];
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Count braces before processing keys
    for (const char of line) {
      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        // When closing a brace, pop the path stack if it's deeper than current depth
        while (pathStack.length >= braceDepth && pathStack.length > 0) {
          pathStack.pop();
        }
      }
    }
    
    // Check for key pattern: "keyName":
    const keyMatch = trimmed.match(/^"([^"]+)"\s*:/);
    if (keyMatch) {
      const foundKey = keyMatch[1];
      
      // Build current path
      const currentPath = pathStack.length > 0 
        ? pathStack.join('.') + '.' + foundKey 
        : foundKey;
      
      // Check if this matches our target key path
      if (currentPath === keyPath) {
        return i + 1; // 1-indexed line number
      }
      
      // If this key's value is an object (line has { after :), add to path stack
      const afterColon = trimmed.substring(trimmed.indexOf(':') + 1).trim();
      if (afterColon.startsWith('{') && !afterColon.includes('}')) {
        pathStack.push(foundKey);
      }
    }
  }
  
  return 0;
}

/**
 * Get git blame commit hash for each key in a file
 * Returns a map of key -> {commit, timestamp}
 * Uses short commit hashes (7 chars) to reduce file size
 */
function getKeyCommitInfo(
  filePath: string,
  contents: Record<string, string>
): Map<string, { commit: string; timestamp: number }> {
  const result = new Map<string, { commit: string; timestamp: number }>();
  
  if (!fs.existsSync(filePath)) {
    return result;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  const blameMap = getGitBlame(filePath);
  const fileExt = path.extname(filePath).toLowerCase();

  for (const key of Object.keys(contents)) {
    let lineNumber = 0;

    if (fileExt === '.json') {
      lineNumber = findKeyLineInJson(lines, key);
    } else {
      // Fallback for other formats - look for the leaf key
      const leafKey = key.split('.').pop() || key;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(leafKey)) {
          lineNumber = i + 1;
          break;
        }
      }
    }

    if (lineNumber > 0) {
      const blame = blameMap.get(lineNumber);
      if (blame) {
        result.set(key, {
          commit: blame.commit.substring(0, 7), // Short 7-char hash
          timestamp: Math.floor(new Date(blame.date).getTime() / 1000),
        });
      }
    }
  }

  return result;
}

/**
 * Load existing store data from JSONL file
 * Handles both legacy format (type: 'file') and new chunked format (type: 'chunk')
 * Returns the data in the StoreData format for compatibility
 */
function loadExistingStoreData(jsonlPath: string): StoreData {
  const existingData: StoreData = {};
  
  if (fs.existsSync(jsonlPath)) {
    try {
      const content = fs.readFileSync(jsonlPath, 'utf-8');
      const lines = content.trim().split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line);
        
        // Handle legacy format (entire file in one entry)
        if (parsed.type === 'file') {
          existingData[parsed.filepath] = parsed.entries;
        }
        // Handle new chunked format
        else if (parsed.type === 'chunk') {
          if (!existingData[parsed.filepath]) {
            existingData[parsed.filepath] = {};
          }
          Object.assign(existingData[parsed.filepath], parsed.entries);
        }
      }
    } catch {
      // If parsing fails, start fresh
    }
  }
  
  return existingData;
}

/**
 * Split entries into chunks of specified size
 */
function chunkEntries(
  entries: Record<string, StoreEntry>,
  chunkSize: number
): Record<string, StoreEntry>[] {
  const keys = Object.keys(entries);
  const chunks: Record<string, StoreEntry>[] = [];
  
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunkKeys = keys.slice(i, i + chunkSize);
    const chunk: Record<string, StoreEntry> = {};
    for (const key of chunkKeys) {
      chunk[key] = entries[key];
    }
    chunks.push(chunk);
  }
  
  return chunks;
}

/**
 * Generate and write store files for each target language
 * Creates .koro-i18n/store/[lang].jsonl
 * JSONL format: header line followed by file headers and chunked entries
 * Chunks entries by key limit (STORE_KEYS_PER_CHUNK) for streaming support
 * Uses git commit hashes to track changes in source and target files
 */
function writeStore(
  files: TranslationFile[],
  sourceLanguage: string
): void {
  const outputDir = '.koro-i18n/store';

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Build maps of source files
  const sourceFiles = new Map<string, { filepath: string; contents: Record<string, string> }>();
  for (const file of files) {
    if (file.lang !== sourceLanguage) continue;
    
    const filepathWithPlaceholder = replaceLanguageWithPlaceholder(file.filename, sourceLanguage);
    sourceFiles.set(filepathWithPlaceholder, {
      filepath: file.filename,
      contents: file.contents,
    });
  }

  // Group target files by language
  const filesByLang = new Map<string, TranslationFile[]>();
  for (const file of files) {
    if (file.lang === sourceLanguage) continue;
    
    const existing = filesByLang.get(file.lang) || [];
    existing.push(file);
    filesByLang.set(file.lang, existing);
  }

  // Generate store file for each target language
  for (const [lang, langFiles] of filesByLang.entries()) {
    const outputPath = path.join(outputDir, `${lang}.jsonl`);
    
    // Load existing store data if it exists (to preserve status for unchanged entries)
    const existingData = loadExistingStoreData(outputPath);

    // Collect all file entries first, then chunk and write
    const fileEntriesMap = new Map<string, Record<string, StoreEntry>>();
    let fileCount = 0;
    let totalKeys = 0;

    for (const file of langFiles) {
      const filepathWithPlaceholder = replaceLanguageWithPlaceholder(file.filename, lang);

      // Get the corresponding source file
      const sourceFile = sourceFiles.get(filepathWithPlaceholder);
      if (!sourceFile) continue;

      // Get git blame info for both source and target files
      const sourceCommitInfo = getKeyCommitInfo(sourceFile.filepath, sourceFile.contents);
      const targetCommitInfo = getKeyCommitInfo(file.filename, file.contents);

      const existingFileData = existingData[filepathWithPlaceholder] || {};
      const entriesForFile: Record<string, StoreEntry> = {};

      for (const key of Object.keys(file.contents)) {
        if (!Object.hasOwn(sourceFile.contents, key)) continue;

        const srcInfo = sourceCommitInfo.get(key);
        const tgtInfo = targetCommitInfo.get(key);
        
        if (!srcInfo || !tgtInfo) continue;

        const existingEntry = existingFileData[key];

        let status: TranslationStatus;

        if (existingEntry) {
          // Compare with existing entry to determine status
          if (existingEntry.src !== srcInfo.commit) {
            // Source changed - translation is outdated
            status = 'outdated';
          } else if (existingEntry.tgt !== tgtInfo.commit) {
            // Target changed but source unchanged - assume latest translation is verified
            status = 'verified';
          } else {
            // No changes - preserve existing status
            status = existingEntry.status;
          }
        } else {
          // New entry - mark as verified (git is source of truth)
          status = 'verified';
        }

        entriesForFile[key] = {
          src: srcInfo.commit,
          tgt: tgtInfo.commit,
          updated: tgtInfo.timestamp,
          status,
        };
      }

      if (Object.keys(entriesForFile).length > 0) {
        // Store file info for later processing
        fileEntriesMap.set(filepathWithPlaceholder, entriesForFile);
        fileCount++;
        totalKeys += Object.keys(entriesForFile).length;
      }
    }

    // Build the JSONL content with chunked entries
    const lines: string[] = [];

    // Header with total keys
    const header: StoreHeaderJsonl = {
      type: 'header',
      language: lang,
      totalFiles: fileCount,
      totalKeys,
    };
    lines.push(JSON.stringify(header));

    // Write file headers and chunked entries
    for (const [filepath, entries] of fileEntriesMap.entries()) {
      const keyCount = Object.keys(entries).length;
      
      // File header with total keys for this file
      const fileHeader: StoreFileHeaderJsonl = {
        type: 'file_header',
        filepath,
        totalKeys: keyCount,
      };
      lines.push(JSON.stringify(fileHeader));

      // Chunk the entries and write each chunk
      const chunks = chunkEntries(entries, STORE_KEYS_PER_CHUNK);
      for (let i = 0; i < chunks.length; i++) {
        const chunk: StoreChunkJsonl = {
          type: 'chunk',
          filepath,
          chunkIndex: i,
          entries: chunks[i],
        };
        lines.push(JSON.stringify(chunk));
      }
    }

    // Write the store file for this language (JSONL format)
    fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
    console.log(`  ✓ Store: ${outputPath} (${fileCount} files, ${totalKeys} keys)`);
  }

  if (filesByLang.size > 0) {
    console.log(`\n✅ Store generated for ${filesByLang.size} languages`);
  }
}

/**
 * Source file header in JSONL format (first line of the file)
 */
export interface SourceHeaderJsonl {
  type: 'header';
  language: string;
  totalFiles: number;
  totalKeys: number;
}

/**
 * Key position data for extracting values from raw file content
 */
export interface KeyPosition {
  start: [number, number];  // [line, char] - 1-indexed
  end: [number, number];    // [line, char] - 1-indexed
}

/**
 * Source file entry in JSONL format
 * Contains keys with their position data for value extraction
 */
export interface SourceFileJsonl {
  type: 'file';
  filepath: string;  // filepath with <lang> placeholder
  filename: string;  // just the filename without directories
  keys: Record<string, KeyPosition>;  // key -> position data
}

/**
 * Source chunk entry in JSONL format
 * Contains a subset of keys with position data (chunked for streaming)
 */
export interface SourceChunkJsonl {
  type: 'chunk';
  filepath: string;  // filepath with <lang> placeholder
  chunkIndex: number;
  keys: Record<string, KeyPosition>;  // key -> position data
}

/**
 * Default number of keys per chunk in source files
 */
const SOURCE_KEYS_PER_CHUNK = 200;

/**
 * Generate and write source files for each language
 * Creates .koro-i18n/source/[lang].jsonl
 * JSONL format: header line followed by file entries with key position data
 * 
 * Stores keys with position info (charRanges) so the frontend can extract
 * values from raw file content. This supports custom parsers (JSON, Markdown, etc.)
 * while keeping file size small (no values stored).
 */
function writeSource(
  files: TranslationFile[],
  sourceLanguage: string
): void {
  const outputDir = '.koro-i18n/source';

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Group files by language (include all languages including source)
  const filesByLang = new Map<string, TranslationFile[]>();
  for (const file of files) {
    const existing = filesByLang.get(file.lang) || [];
    existing.push(file);
    filesByLang.set(file.lang, existing);
  }

  // Generate source file for each language
  for (const [lang, langFiles] of filesByLang.entries()) {
    const lines: string[] = [];
    let totalKeys = 0;

    // Count total keys first
    for (const file of langFiles) {
      totalKeys += Object.keys(file.contents).length;
    }

    // First line: header
    const header: SourceHeaderJsonl = {
      type: 'header',
      language: lang,
      totalFiles: langFiles.length,
      totalKeys,
    };
    lines.push(JSON.stringify(header));

    // Write file entries with keys and their position data
    for (const file of langFiles) {
      const filepathWithPlaceholder = replaceLanguageWithPlaceholder(file.filename, lang);
      const filename = file.filename.split('/').pop() || file.filename;
      const allKeys = Object.keys(file.contents);
      const charRanges = file.rawMetadata?.charRanges ?? {};

      // Build keys with position data
      const keysWithPositions: Record<string, KeyPosition> = {};
      for (const key of allKeys) {
        const range = charRanges[key];
        if (range && range.start && range.end) {
          keysWithPositions[key] = {
            start: range.start,
            end: range.end,
          };
        } else {
          // Log warning for keys without position data
          console.warn(`  ⚠ Key "${key}" in ${file.filename} has no position data`);
        }
      }

      // Chunk the keys
      const keysList = Object.keys(keysWithPositions);
      for (let i = 0; i < keysList.length; i += SOURCE_KEYS_PER_CHUNK) {
        const chunkKeysList = keysList.slice(i, i + SOURCE_KEYS_PER_CHUNK);
        const chunkKeys: Record<string, KeyPosition> = {};
        for (const key of chunkKeysList) {
          chunkKeys[key] = keysWithPositions[key];
        }

        if (i === 0) {
          // First chunk includes file metadata
          const fileEntry: SourceFileJsonl = {
            type: 'file',
            filepath: filepathWithPlaceholder,
            filename,
            keys: chunkKeys,
          };
          lines.push(JSON.stringify(fileEntry));
        } else {
          // Subsequent chunks
          const chunk: SourceChunkJsonl = {
            type: 'chunk',
            filepath: filepathWithPlaceholder,
            chunkIndex: Math.floor(i / SOURCE_KEYS_PER_CHUNK),
            keys: chunkKeys,
          };
          lines.push(JSON.stringify(chunk));
        }
      }
    }

    // Write the source file for this language (JSONL format)
    const outputPath = path.join(outputDir, `${lang}.jsonl`);
    fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
    console.log(`  ✓ Source: ${outputPath} (${langFiles.length} files, ${totalKeys} keys)`);
  }

  if (filesByLang.size > 0) {
    console.log(`\n✅ Source generated for ${filesByLang.size} languages`);
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  // Get repository from environment or config
  const repository = process.env.GITHUB_REPOSITORY || config.project.name;

  console.log(`📦 Processing files for ${repository}...`);

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

  console.log(`\n📝 Generating manifest for ${allFiles.length} files...`);
  
  // Generate and write manifest (JSONL format for streaming)
  const manifest = generateManifest(repository, config.source.language, allFiles);
  writeManifest(manifest);
  
  // Generate progress-translated files for each target language
  console.log(`\n📝 Generating progress-translated files...`);
  writeProgressTranslated(allFiles, config.source.language);
  
  // Generate store files for each target language (source values for validation)
  console.log(`\n📝 Generating store files...`);
  writeStore(allFiles, config.source.language);
  
  // Generate source files for all languages (pre-parsed content)
  console.log(`\n📝 Generating source files (pre-parsed content)...`);
  writeSource(allFiles, config.source.language);
  
  console.log('\n✨ Done! The metadata has been created in .koro-i18n/');
  console.log('💡 Commit these files to your repository for the platform to fetch your translations.');
}
