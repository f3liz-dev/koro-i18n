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
  sourceHash: string;
}

export interface ManifestFile {
  filename: string;
  sourceFilename: string;
  lastUpdated: string;
  commitHash: string;
  language: string;
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
 * Generate manifest file for the repository
 * Creates .koro-i18n/koro-i18n.repo.generated.json
 */
export function generateManifest(
  repository: string,
  sourceLanguage: string,
  files: TranslationFile[]
): GeneratedManifest {
  const manifestFiles: ManifestFile[] = files.map(file => ({
    filename: file.filename,
    sourceFilename: file.filename, // Full path with directory structure
    lastUpdated: new Date().toISOString(),
    commitHash: getCommitSha(),
    language: file.lang,
  }));

  return {
    repository,
    sourceLanguage,
    configVersion: 1,
    files: manifestFiles,
  };
}

/**
 * Write manifest to .koro-i18n/koro-i18n.repo.generated.json
 */
function writeManifest(manifest: GeneratedManifest): void {
  const outputDir = '.koro-i18n';
  const outputPath = path.join(outputDir, 'koro-i18n.repo.generated.json');

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write manifest file
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n✅ Manifest generated: ${outputPath}`);
}

/**
 * Progress translated data structure
 * Maps filepath (with <lang> placeholder) to array of translated key names
 */
export interface ProgressTranslated {
  [filepathWithLangPlaceholder: string]: string[];
}

/**
 * Generate and write progress-translated files for each target language
 * Creates .koro-i18n/progress-translated/[lang].json
 * Content: {[filepath with language replaced by <lang>]: [translated-key-names]}
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
    const progressData: ProgressTranslated = {};

    for (const file of langFiles) {
      // Replace the actual language code with <lang> placeholder in the filepath
      // e.g., "locales/ja/common.json" -> "locales/<lang>/common.json"
      // Note: This replaces the first occurrence of the language code as a path segment.
      // For patterns where the language appears in multiple positions, only the first is replaced.
      // This is sufficient for typical patterns like "locales/{lang}/**/*.json".
      const filepathWithPlaceholder = file.filename.replace(
        new RegExp(`(^|/)${escapeRegExp(lang)}(/|$)`),
        '$1<lang>$2'
      );

      // Get all translated key names (keys from the contents)
      const translatedKeys = Object.keys(file.contents);

      progressData[filepathWithPlaceholder] = translatedKeys;
    }

    // Write the progress file for this language
    const outputPath = path.join(outputDir, `${lang}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(progressData, null, 2), 'utf-8');
    console.log(`  ✓ Progress translated: ${outputPath} (${langFiles.length} files)`);
  }

  if (filesByLang.size > 0) {
    console.log(`\n✅ Progress translated generated for ${filesByLang.size} languages`);
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
  
  // Generate and write manifest
  const manifest = generateManifest(repository, config.source.language, allFiles);
  writeManifest(manifest);
  
  // Generate progress-translated files for each target language
  console.log(`\n📝 Generating progress-translated files...`);
  writeProgressTranslated(allFiles, config.source.language);
  
  console.log('\n✨ Done! The metadata has been created in .koro-i18n/');
  console.log('💡 Commit these files to your repository for the platform to fetch your translations.');
}
