#!/usr/bin/env node

/**
 * Koro i18n Client Library v3
 * 
 * CLI tool for translation management.
 * 
 * Supports:
 * - JSON, YAML file formats
 * - Differential sync with platform
 * - GitHub Actions OIDC authentication
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';

// ============================================================================
// Types
// ============================================================================

export interface KoroConfig {
  version: number;
  sourceLanguage: string;
  targetLanguages: string[];
  files: {
    include: string[];
    exclude?: string[];
  };
  project?: {
    name: string;
    platformUrl?: string;
  };
}

export interface TranslationEntry {
  key: string;
  value: string;
  file: string;
  language: string;
  hash: string;
  lastModified?: string;
  author?: string;
}

export interface ManifestHeader {
  type: 'header';
  version: number;
  repository: string;
  sourceLanguage: string;
  targetLanguages: string[];
  generatedAt: string;
  commitSha: string;
}

export interface FileHeader {
  type: 'file';
  path: string;
  language: string;
  keyCount: number;
}

export interface KeyEntry {
  type: 'key';
  file: string;
  language: string;
  key: string;
  value: string;
  hash: string;
  lastModified?: string;
  author?: string;
}

export type ManifestLine = ManifestHeader | FileHeader | KeyEntry;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple djb2-style hash for change detection.
 * 
 * This is NOT cryptographically secure and may have collisions.
 * It's used only to detect when a translation value has changed
 * between manifest generations. Collisions are acceptable since
 * the worst case is a translation appears unchanged when it isn't,
 * which will be corrected on the next sync.
 */
function hashValue(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

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
 * Parse a translation file based on its extension
 * Supports: .json, .yaml, .yml
 */
function parseTranslationFile(filePath: string, content: string): Record<string, any> | null {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    switch (ext) {
      case '.json':
        return JSON.parse(content);
      case '.yaml':
      case '.yml':
        return yaml.load(content) as Record<string, any>;
      default:
        console.warn(`Unsupported file format: ${ext}`);
        return null;
    }
  } catch (e) {
    console.warn(`Failed to parse ${filePath}:`, e);
    return null;
  }
}

/**
 * Serialize content to file format based on extension
 */
function serializeTranslationContent(filePath: string, content: Record<string, any>): string {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.yaml':
    case '.yml':
      return yaml.dump(content, { indent: 2, lineWidth: 120 });
    case '.json':
    default:
      return JSON.stringify(content, null, 2) + '\n';
  }
}

function getCommitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return `local-${Date.now()}`;
  }
}

function getGitBlame(filePath: string): Map<number, { author: string; date: string }> {
  const result = new Map<number, { author: string; date: string }>();
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    const blameOutput = execSync(`git blame --line-porcelain "${filePath}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    }).trim();

    const lines = blameOutput.split('\n');
    let currentLineNumber = 0;
    let currentAuthor = '';
    let currentDate = '';
    
    for (const line of lines) {
      if (line.match(/^[0-9a-f]{40}/)) {
        const parts = line.split(' ');
        currentLineNumber = parseInt(parts[2], 10);
      } else if (line.startsWith('author ')) {
        currentAuthor = line.substring(7);
      } else if (line.startsWith('author-time ')) {
        currentDate = new Date(parseInt(line.substring(12)) * 1000).toISOString();
        result.set(currentLineNumber, { author: currentAuthor, date: currentDate });
      }
    }
  } catch {
    // Not in git repo or git blame failed
  }
  return result;
}

/**
 * Find the line number where a key is defined in JSON content.
 * 
 * Limitations:
 * - Does not handle JSON with comments (JSONC)
 * - May fail with string values containing braces or colons
 * - Uses simple regex matching, not a full JSON parser
 * 
 * This is acceptable for well-formed i18n JSON files where values
 * are typically simple strings without special characters.
 */
function findKeyLine(content: string, key: string): number {
  const lines = content.split('\n');
  const keyParts = key.split('.');
  const pathStack: string[] = [];
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '{') braceDepth++;
      else if (char === '}') {
        braceDepth--;
        while (pathStack.length >= braceDepth && pathStack.length > 0) {
          pathStack.pop();
        }
      }
    }
    
    const keyMatch = line.trim().match(/^"([^"]+)"\s*:/);
    if (keyMatch) {
      const foundKey = keyMatch[1];
      const currentPath = pathStack.length > 0 ? pathStack.join('.') + '.' + foundKey : foundKey;
      if (currentPath === key) return i + 1;
      
      const afterColon = line.trim().substring(line.trim().indexOf(':') + 1).trim();
      if (afterColon.startsWith('{') && !afterColon.includes('}')) {
        pathStack.push(foundKey);
      }
    }
  }
  return 0;
}

// ============================================================================
// Config Loading (TOML only)
// ============================================================================

export interface TomlConfig {
  project: {
    name: string;
    platform_url?: string;
  };
  source: {
    language: string;
    include: string[];
    exclude?: string[];
  };
  target: {
    languages: string[];
  };
}

export async function loadConfig(configPath?: string): Promise<KoroConfig | null> {
  const tomlPath = configPath || '.koro-i18n.repo.config.toml';
  
  if (!fs.existsSync(tomlPath)) {
    console.error(`Config file not found: ${tomlPath}`);
    console.error('Create a .koro-i18n.repo.config.toml file or run: npx @koro-i18n/client init');
    return null;
  }

  try {
    const toml = await import('toml');
    const content = fs.readFileSync(tomlPath, 'utf-8');
    const parsed = toml.parse(content) as TomlConfig;
    
    return {
      version: 1,
      sourceLanguage: parsed.source.language,
      targetLanguages: parsed.target.languages,
      files: {
        include: parsed.source.include || ['locales/{lang}/**/*.json'],
        exclude: parsed.source.exclude,
      },
      project: {
        name: parsed.project.name,
        platformUrl: parsed.project.platform_url,
      },
    };
  } catch (e) {
    console.error(`Error parsing ${tomlPath}:`, e);
    return null;
  }
}

// ============================================================================
// File Discovery
// ============================================================================

export async function findTranslationFiles(config: KoroConfig): Promise<string[]> {
  const files: string[] = [];
  const allLanguages = [config.sourceLanguage, ...config.targetLanguages];
  
  for (const pattern of config.files.include) {
    for (const lang of allLanguages) {
      const globPattern = pattern.replace(/\{lang\}/g, lang);
      const matches = await glob(globPattern, {
        ignore: config.files.exclude || [],
      });
      files.push(...matches);
    }
  }

  return [...new Set(files)];
}

// ============================================================================
// Generate Manifest
// ============================================================================

export async function generateManifest(config: KoroConfig, files: string[]): Promise<ManifestLine[]> {
  const lines: ManifestLine[] = [];
  const repository = process.env.GITHUB_REPOSITORY || 'local';
  const commitSha = getCommitSha();
  
  // Header
  lines.push({
    type: 'header',
    version: 2,
    repository,
    sourceLanguage: config.sourceLanguage,
    targetLanguages: config.targetLanguages,
    generatedAt: new Date().toISOString(),
    commitSha,
  });

  // Process each file
  for (const filePath of files) {
    // Extract language from path
    let language = 'unknown';
    for (const lang of [config.sourceLanguage, ...config.targetLanguages]) {
      if (filePath.includes(`/${lang}/`) || filePath.includes(`${lang}.json`)) {
        language = lang;
        break;
      }
    }
    if (language === 'unknown') continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      const flattened = flattenObject(parsed);
      const blameMap = getGitBlame(filePath);
      
      // File header
      lines.push({
        type: 'file',
        path: filePath,
        language,
        keyCount: Object.keys(flattened).length,
      });

      // Key entries
      for (const [key, value] of Object.entries(flattened)) {
        const lineNum = findKeyLine(content, key);
        const blame = blameMap.get(lineNum);
        
        lines.push({
          type: 'key',
          file: filePath,
          language,
          key,
          value,
          hash: hashValue(value),
          ...(blame && { lastModified: blame.date, author: blame.author }),
        });
      }
    } catch (e) {
      console.warn(`Warning: Could not process ${filePath}:`, e);
    }
  }

  return lines;
}

// ============================================================================
// Write Output
// ============================================================================

export function writeManifest(lines: ManifestLine[]): void {
  const outputDir = '.koro-i18n';
  const outputPath = path.join(outputDir, 'translations.jsonl');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const content = lines.map(line => JSON.stringify(line)).join('\n') + '\n';
  fs.writeFileSync(outputPath, content, 'utf-8');
  
  const keyCount = lines.filter(l => l.type === 'key').length;
  const fileCount = lines.filter(l => l.type === 'file').length;
  console.log(`✓ Generated ${outputPath} (${fileCount} files, ${keyCount} keys)`);
}

// ============================================================================
// CLI Commands
// ============================================================================

function commandInit(): void {
  const configPath = '.koro-i18n.repo.config.toml';
  
  if (fs.existsSync(configPath)) {
    console.log(`${configPath} already exists`);
    return;
  }

  const defaultConfig = `# Koro I18n Platform Configuration
# This file configures how translation files are processed and synced

[project]
name = "my-project"
platform_url = "https://koro.f3liz.workers.dev"

# Source language (the language you write your app in)
[source]
language = "en"
include = [
  "locales/{lang}/**/*.json"
]
exclude = [
  "**/node_modules/**"
]

# Target languages (languages you want to translate to)
[target]
languages = [
  "ja", "es", "fr", "de"
]
`;

  fs.writeFileSync(configPath, defaultConfig);
  console.log(`✓ Created ${configPath}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Edit .koro-i18n.repo.config.toml to match your project');
  console.log('2. Set project.name to your project name on the platform');
  console.log('3. Run: npx @koro-i18n/client push');
}

async function commandValidate(): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    console.error('No config found. Run: npx @koro-i18n/client init');
    process.exit(1);
  }

  console.log('✓ Config loaded');
  console.log(`  Source language: ${config.sourceLanguage}`);
  console.log(`  Target languages: ${config.targetLanguages.join(', ')}`);
  
  const files = await findTranslationFiles(config);
  if (files.length === 0) {
    console.error('\nNo translation files found. Check files.include patterns.');
    process.exit(1);
  }

  console.log(`\n✓ Found ${files.length} translation file(s)`);
  for (const file of files) {
    console.log(`  - ${file}`);
  }
}

async function commandGenerate(): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    console.error('No config found. Run: npx @koro-i18n/client init');
    process.exit(1);
  }

  console.log('📦 Generating translation manifest...\n');
  
  const files = await findTranslationFiles(config);
  if (files.length === 0) {
    console.error('No translation files found. Check files.include patterns.');
    process.exit(1);
  }

  const manifest = await generateManifest(config, files);
  writeManifest(manifest);
  
  console.log('\n✨ Done! Commit .koro-i18n/translations.jsonl to your repository.');
}

// ============================================================================
// Push Command
// ============================================================================

import { KoroApiClient, computeDiff, type LocalKey } from './api-client.js';

async function commandPush(): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    console.error('No config found. Run: npx @koro-i18n/client init');
    process.exit(1);
  }

  if (!config.project?.name) {
    console.error('Project name not specified in config. Add [project] section with name.');
    process.exit(1);
  }

  console.log('🚀 Pushing source keys to platform...\n');

  // Parse local source files
  const sourceFiles = await findSourceFiles(config);
  if (sourceFiles.length === 0) {
    console.error('No source files found. Check files.include patterns.');
    process.exit(1);
  }

  console.log(`📂 Found ${sourceFiles.length} source file(s)`);

  // Parse local keys
  const localKeys: LocalKey[] = [];
  for (const filePath of sourceFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseTranslationFile(filePath, content);
      if (!parsed) continue;
      
      const flattened = flattenObject(parsed);
      
      // Normalize filename relative to project root
      const filename = filePath.replace(/\\/g, '/');
      
      for (const [key, value] of Object.entries(flattened)) {
        localKeys.push({
          filename,
          key,
          value,
          hash: hashValue(value),
        });
      }
    } catch (e) {
      console.warn(`Warning: Could not parse ${filePath}:`, e);
    }
  }

  console.log(`🔑 Found ${localKeys.length} keys in source files`);

  // Get server hash manifest
  const client = new KoroApiClient({
    projectName: config.project.name,
    baseUrl: config.project.platformUrl,
  });

  let serverManifest: Record<string, Record<string, string>> = {};
  try {
    const hashResult = await client.getHashManifest();
    serverManifest = hashResult.manifest;
    console.log(`☁️  Server has ${hashResult.totalKeys} keys`);
  } catch (e: any) {
    console.log('☁️  Server has no existing keys (new project)');
  }

  // Compute diff
  const operations = computeDiff(serverManifest, localKeys);
  
  const adds = operations.filter(o => o.op === 'add').length;
  const updates = operations.filter(o => o.op === 'update').length;
  const deletes = operations.filter(o => o.op === 'delete').length;

  if (operations.length === 0) {
    console.log('\n✅ No changes detected. Keys are up to date.');
    return;
  }

  console.log(`\n📊 Changes: +${adds} added, ~${updates} updated, -${deletes} deleted`);

  // Sync to server
  const commitSha = getCommitSha();
  const result = await client.syncSourceKeys(operations, commitSha);

  if (!result.success) {
    console.error('❌ Sync failed:', result.error);
    process.exit(1);
  }

  console.log('✅ Source keys synced successfully!');
  if (result.results?.errors.length) {
    console.warn('⚠️  Some errors occurred:', result.results.errors);
  }

  // Import existing translations (default behavior)
  const translationFiles = await findTranslationFiles(config);
  const nonSourceFiles = translationFiles.filter(f => !sourceFiles.includes(f));
  
  if (nonSourceFiles.length > 0) {
    console.log(`\n📥 Importing ${nonSourceFiles.length} translation file(s)...`);
    
    const translations: Array<{
      language: string;
      filename: string;
      key: string;
      value: string;
      hash?: string;
    }> = [];

    for (const filePath of nonSourceFiles) {
      const language = extractLanguageFromPath(filePath, config);
      if (!language) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        const flattened = flattenObject(parsed);
        const filename = filePath.replace(/\\/g, '/');

        for (const [key, value] of Object.entries(flattened)) {
          // Find corresponding source hash
          const sourceKey = localKeys.find(k => k.key === key);
          translations.push({
            language,
            filename,
            key,
            value,
            hash: sourceKey?.hash,
          });
        }
      } catch (e) {
        console.warn(`Warning: Could not parse ${filePath}:`, e);
      }
    }

    if (translations.length > 0) {
      const importResult = await client.importTranslations(translations, true);
      if (importResult.success) {
        console.log(`✅ Imported ${importResult.results?.imported || 0} translations`);
        if (importResult.results?.skipped) {
          console.log(`   (${importResult.results.skipped} skipped - already exist)`);
        }
      } else {
        console.warn('⚠️  Import failed:', importResult.error);
      }
    }
  }

  console.log('\n✨ Push complete!');
}

// ============================================================================
// Pull Command
// ============================================================================

async function commandPull(): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    console.error('No config found. Run: npx @koro-i18n/client init');
    process.exit(1);
  }

  if (!config.project?.name) {
    console.error('Project name not specified in config. Add [project] section with name.');
    process.exit(1);
  }

  console.log('📥 Pulling approved translations...\n');

  const client = new KoroApiClient({
    projectName: config.project.name,
    baseUrl: config.project.platformUrl,
  });

  const result = await client.pullTranslations({ status: 'approved' });
  
  if (!result.success) {
    console.error('❌ Pull failed:', result.error);
    process.exit(1);
  }

  if (result.translations.length === 0) {
    console.log('ℹ️  No approved translations to pull.');
    return;
  }

  console.log(`📦 Received ${result.translations.length} translations`);

  // Group by filename
  const fileGroups = new Map<string, Map<string, string>>();
  for (const t of result.translations) {
    const key = `${t.language}:${t.filename}`;
    if (!fileGroups.has(key)) {
      fileGroups.set(key, new Map());
    }
    fileGroups.get(key)!.set(t.key, t.value);
  }

  // Write files
  let filesWritten = 0;
  for (const [key, translations] of fileGroups) {
    const [language, filename] = key.split(':');
    
    // Build nested object from flat keys
    const nested: Record<string, any> = {};
    for (const [flatKey, value] of translations) {
      setNestedValue(nested, flatKey, value);
    }

    // Determine output path
    const outputPath = determineOutputPath(filename, language, config);
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Merge with existing file if present
    let finalContent = nested;
    if (fs.existsSync(outputPath)) {
      try {
        const existingContent = fs.readFileSync(outputPath, 'utf-8');
        const existing = parseTranslationFile(outputPath, existingContent);
        if (existing) {
          finalContent = deepMerge(existing, nested);
        }
      } catch {
        // Use new content if can't parse existing
      }
    }

    fs.writeFileSync(outputPath, serializeTranslationContent(outputPath, finalContent));
    console.log(`  ✓ ${outputPath}`);
    filesWritten++;
  }

  console.log(`\n✨ Pulled ${result.translations.length} translations to ${filesWritten} file(s)`);
}

// ============================================================================
// Helper Functions for Push/Pull
// ============================================================================

async function findSourceFiles(config: KoroConfig): Promise<string[]> {
  const files: string[] = [];
  
  for (const pattern of config.files.include) {
    const globPattern = pattern.replace(/\{lang\}/g, config.sourceLanguage);
    const matches = await glob(globPattern, {
      ignore: config.files.exclude || [],
    });
    files.push(...matches);
  }

  return [...new Set(files)];
}

function extractLanguageFromPath(filePath: string, config: KoroConfig): string | null {
  const allLanguages = [config.sourceLanguage, ...config.targetLanguages];
  for (const lang of allLanguages) {
    if (filePath.includes(`/${lang}/`) || filePath.includes(`/${lang}.json`) || 
        filePath.includes(`\\${lang}\\`) || filePath.includes(`\\${lang}.json`)) {
      return lang;
    }
  }
  return null;
}

function setNestedValue(obj: Record<string, any>, flatKey: string, value: string): void {
  const parts = flatKey.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

function determineOutputPath(filename: string, language: string, config: KoroConfig): string {
  // Replace source language in path with target language
  let outputPath = filename.replace(config.sourceLanguage, language);
  
  // If no change, append language suffix
  if (outputPath === filename) {
    const ext = path.extname(filename);
    const base = filename.slice(0, -ext.length);
    outputPath = `${base}.${language}${ext}`;
  }
  
  return outputPath;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'init':
      commandInit();
      break;
    case 'validate':
      await commandValidate();
      break;
    case 'generate':
      await commandGenerate();
      break;
    case 'push':
      await commandPush();
      break;
    case 'pull':
      await commandPull();
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log('Koro i18n CLI v3');
      console.log('');
      console.log('Commands:');
      console.log('  init      Create a .koro-i18n.repo.config.toml file');
      console.log('  validate  Validate config and find translation files');
      console.log('  push      Sync source keys to platform (default imports translations)');
      console.log('  pull      Download approved translations');
      console.log('  generate  Generate translation manifest (legacy)');
      console.log('');
      console.log('Usage:');
      console.log('  npx @koro-i18n/client init');
      console.log('  npx @koro-i18n/client push');
      console.log('  npx @koro-i18n/client pull');
      console.log('');
      console.log('Environment:');
      console.log('  KORO_API_URL   Platform URL (default: https://koro.f3liz.workers.dev)');
      console.log('  KORO_TOKEN     Authentication token');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run: npx @koro-i18n/client help');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

export { main };
