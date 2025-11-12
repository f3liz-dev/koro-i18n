import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as toml from 'toml';

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
 * Process a single translation file
 */
export function processFile(filePath: string, format: string): TranslationFile | null {
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
 * Upload metadata to I18n Platform using structured format
 */
export async function uploadToPlatform(
  projectName: string,
  metadata: ProjectMetadata,
  platformUrl: string,
  token: string
): Promise<void> {
  const payload = {
    branch: metadata.branch,
    commitSha: metadata.commit,
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
} {
  const args = process.argv.slice(2);
  const result: any = {
    configPath: '.koro-i18n.repo.config.toml',
    platformUrl: process.env.I18N_PLATFORM_URL || 'https://koro.f3liz.workers.dev',
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
  
  await uploadToPlatform(projectName, metadata, args.platformUrl, token);
  
  console.log('Done!');
}
