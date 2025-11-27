#!/usr/bin/env node

/**
 * Koro i18n CLI
 * 
 * A simple CLI for managing translations with Koro i18n platform.
 * 
 * Commands:
 *   init     - Create a koro.config.json file
 *   validate - Validate the config and find translation files
 *   generate - Generate metadata files (for advanced use cases)
 * 
 * Usage:
 *   npx koro-i18n init
 *   npx koro-i18n validate
 *   npx koro-i18n generate  (legacy mode for metadata generation)
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

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

export interface LegacyConfig {
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

export interface TranslationFile {
  path: string;
  language: string;
  filename: string;
  keyCount: number;
}

// ============================================================================
// Config Loading
// ============================================================================

/**
 * Load configuration from koro.config.json or legacy TOML
 */
export async function loadConfig(configPath?: string): Promise<KoroConfig | null> {
  // Try new JSON config first
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
      // Use dynamic import for toml parser
      const toml = await import('toml');
      const content = fs.readFileSync(tomlPath, 'utf-8');
      const legacy = toml.parse(content) as LegacyConfig;
      
      // Convert legacy to new format
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

/**
 * Find translation files matching the config patterns
 */
export async function findTranslationFiles(config: KoroConfig): Promise<TranslationFile[]> {
  const files: TranslationFile[] = [];
  const allLanguages = [config.sourceLanguage, ...config.targetLanguages];
  
  for (const pattern of config.files.include) {
    for (const lang of allLanguages) {
      // Replace {lang} placeholder with actual language
      const globPattern = pattern.replace(/\{lang\}/g, lang);
      
      const matches = await glob(globPattern, {
        ignore: config.files.exclude || [],
      });

      for (const match of matches) {
        try {
          const content = fs.readFileSync(match, 'utf-8');
          const parsed = JSON.parse(content);
          const keyCount = countKeys(parsed);
          
          files.push({
            path: match,
            language: lang,
            filename: path.basename(match),
            keyCount,
          });
        } catch (e) {
          console.warn(`Warning: Could not parse ${match}`);
        }
      }
    }
  }

  return files;
}

/**
 * Count total keys in a nested object
 */
function countKeys(obj: any, prefix = ''): number {
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      count += countKeys(value, `${prefix}${key}.`);
    } else {
      count++;
    }
  }
  return count;
}

// ============================================================================
// Commands
// ============================================================================

/**
 * Initialize a new koro.config.json
 */
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

  fs.writeFileSync(
    'koro.config.json',
    JSON.stringify(defaultConfig, null, 2) + '\n'
  );

  console.log('✓ Created koro.config.json');
  console.log('');
  console.log('Next steps:');
  console.log('1. Edit koro.config.json to match your project structure');
  console.log('2. Run: npx koro-i18n validate');
  console.log('3. Create a project on the Koro i18n platform');
}

/**
 * Validate the config and list found files
 */
async function commandValidate(): Promise<void> {
  const config = await loadConfig();
  
  if (!config) {
    console.error('No config found. Run: npx koro-i18n init');
    process.exit(1);
  }

  console.log('✓ Config loaded');
  console.log(`  Source language: ${config.sourceLanguage}`);
  console.log(`  Target languages: ${config.targetLanguages.join(', ')}`);
  console.log('');

  const files = await findTranslationFiles(config);

  if (files.length === 0) {
    console.error('No translation files found matching the patterns');
    console.error('Check your files.include patterns');
    process.exit(1);
  }

  console.log(`Found ${files.length} translation file(s):`);
  
  // Group by language
  const byLanguage = new Map<string, TranslationFile[]>();
  for (const file of files) {
    const existing = byLanguage.get(file.language) || [];
    existing.push(file);
    byLanguage.set(file.language, existing);
  }

  for (const [lang, langFiles] of byLanguage) {
    console.log(`\n  ${lang}:`);
    for (const file of langFiles) {
      console.log(`    ${file.path} (${file.keyCount} keys)`);
    }
  }

  console.log('\n✓ Validation passed');
}

/**
 * Generate metadata files
 * Runs the legacy metadata generation with support for both config formats
 */
async function commandGenerate(configPath?: string): Promise<void> {
  console.log('📦 Generating metadata files...');
  console.log('');
  
  // Check if we have a JSON config
  const jsonPath = configPath || 'koro.config.json';
  const tomlPath = '.koro-i18n.repo.config.toml';
  
  // If JSON config exists, convert it to TOML format for the legacy generator
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const config = JSON.parse(content) as KoroConfig;
      
      // Create a temporary TOML-like structure for the legacy generator
      // Or we can just run the legacy generator with the TOML if it exists
      if (!fs.existsSync(tomlPath)) {
        // Generate a temporary TOML config for the legacy generator
        const tomlContent = `[project]
name = "${process.env.GITHUB_REPOSITORY || 'project'}"

[source]
language = "${config.sourceLanguage}"
include = [${config.files.include.map(p => `"${p}"`).join(', ')}]
${config.files.exclude ? `exclude = [${config.files.exclude.map(p => `"${p}"`).join(', ')}]` : ''}

[target]
languages = [${config.targetLanguages.map(l => `"${l}"`).join(', ')}]
`;
        fs.writeFileSync(tomlPath, tomlContent);
        console.log('✓ Generated temporary TOML config');
      }
    } catch (e) {
      console.error('Error parsing JSON config:', e);
      process.exit(1);
    }
  }

  try {
    // Import and run the legacy main function
    const legacy = await import('./index-legacy');
    await legacy.main();
  } catch (e) {
    console.error('Error running metadata generation:', e);
    process.exit(1);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'validate';
  const configPath = args[1];

  switch (command) {
    case 'init':
      commandInit();
      break;
    case 'validate':
      await commandValidate();
      break;
    case 'generate':
      await commandGenerate(configPath);
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log('Koro i18n CLI');
      console.log('');
      console.log('Commands:');
      console.log('  init      Create a koro.config.json file');
      console.log('  validate  Validate the config and find translation files');
      console.log('  generate  Generate metadata files (legacy mode)');
      console.log('');
      console.log('Usage:');
      console.log('  npx koro-i18n init');
      console.log('  npx koro-i18n validate');
      console.log('  npx koro-i18n generate');
      console.log('  npx koro-i18n generate [config-path]');
      console.log('');
      console.log('Legacy usage (for backwards compatibility):');
      console.log('  npx koro-i18n path/to/config.toml');
      break;
    default:
      // Check if the command looks like a config file path (legacy usage)
      if (command.endsWith('.toml') || command.endsWith('.json')) {
        console.log('Running in legacy mode with config:', command);
        await commandGenerate(command);
      } else {
        console.error(`Unknown command: ${command}`);
        console.error('Run: npx koro-i18n help');
        process.exit(1);
      }
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
