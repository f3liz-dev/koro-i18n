#!/usr/bin/env node

/**
 * Koro i18n Client Library v2
 * 
 * Simplified metadata generation for translation management.
 * 
 * Generates a single .koro-i18n/translations.jsonl file containing:
 * - Header with project config
 * - Translation entries with source values and optional git metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';

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

function hashValue(value: string): string {
  // Simple hash for change detection
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
// Config Loading
// ============================================================================

export async function loadConfig(configPath?: string): Promise<KoroConfig | null> {
  const jsonPath = configPath || 'koro.config.json';
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      return JSON.parse(content) as KoroConfig;
    } catch (e) {
      console.error(`Error parsing ${jsonPath}:`, e);
      return null;
    }
  }

  // Try legacy TOML config
  const tomlPath = '.koro-i18n.repo.config.toml';
  if (fs.existsSync(tomlPath)) {
    try {
      const toml = await import('toml');
      const content = fs.readFileSync(tomlPath, 'utf-8');
      const legacy = toml.parse(content) as any;
      return {
        version: 1,
        sourceLanguage: legacy.source.language,
        targetLanguages: legacy.target.languages,
        files: {
          include: legacy.source.include || legacy.source.files || ['locales/{lang}/**/*.json'],
          exclude: legacy.source.exclude,
        },
      };
    } catch (e) {
      console.error(`Error parsing ${tomlPath}:`, e);
      return null;
    }
  }

  return null;
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
  if (fs.existsSync('koro.config.json')) {
    console.log('koro.config.json already exists');
    return;
  }

  const defaultConfig: KoroConfig = {
    version: 1,
    sourceLanguage: 'en',
    targetLanguages: ['ja', 'es', 'fr', 'de'],
    files: {
      include: ['locales/{lang}/**/*.json'],
      exclude: ['**/node_modules/**'],
    },
  };

  fs.writeFileSync('koro.config.json', JSON.stringify(defaultConfig, null, 2) + '\n');
  console.log('✓ Created koro.config.json');
  console.log('');
  console.log('Next steps:');
  console.log('1. Edit koro.config.json to match your project structure');
  console.log('2. Run: npx @koro-i18n/client generate');
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
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';

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
    case 'help':
    case '--help':
    case '-h':
      console.log('Koro i18n Client v2');
      console.log('');
      console.log('Commands:');
      console.log('  init      Create a koro.config.json file');
      console.log('  validate  Validate config and find translation files');
      console.log('  generate  Generate translation manifest (default)');
      console.log('');
      console.log('Usage:');
      console.log('  npx @koro-i18n/client init');
      console.log('  npx @koro-i18n/client validate');
      console.log('  npx @koro-i18n/client generate');
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
