import { Octokit } from '@octokit/rest';
import { PrismaClient } from '../generated/prisma/';
import { webcrypto } from 'crypto';
import type { GitBlameInfo, R2Metadata } from '../../shared/types';

/**
 * GitHub repository file fetching service
 * Replaces the upload-based flow with direct GitHub file access
 */

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
}

export interface FetchedTranslationFile {
  lang: string;
  filename: string;
  contents: Record<string, any>;
  metadata: R2Metadata;
  sourceHash: string;
  commitSha: string;
}

/**
 * Structure of the generated manifest file
 * Located at .koro-i18n/koro-i18n.repo.generated.json
 */
export interface GeneratedManifest {
  repository: string;
  sourceLanguage: string;
  configVersion: number;
  files: ManifestFileEntry[];
}

export interface ManifestFileEntry {
  filename: string;        // Target filename (e.g., "common.json")
  sourceFilename: string;  // Source file path in repo (e.g., "locales/en/common.json")
  lastUpdated: string;     // ISO date string
  commitHash: string;      // Git commit hash
  language: string;        // Language code (e.g., "en", "ja")
}

/**
 * Get user's GitHub access token from database
 */
export async function getUserGitHubToken(
  prisma: PrismaClient,
  userId: string
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubAccessToken: true },
  });

  return user?.githubAccessToken || null;
}

/**
 * Fetch translation files from a GitHub repository
 */
export async function fetchTranslationFilesFromGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<GitHubFile[]> {
  const files: GitHubFile[] = [];

  try {
    // Get contents of the directory
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    // Handle both single file and directory
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      if (item.type === 'file' && item.path.endsWith('.json')) {
        // Fetch file content
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: item.path,
          ref: branch,
        });

        if ('content' in fileData && fileData.content) {
          // Decode base64 content
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          
          files.push({
            path: item.path,
            content,
            sha: fileData.sha,
          });
        }
      } else if (item.type === 'dir') {
        // Recursively fetch files from subdirectories
        const subFiles = await fetchTranslationFilesFromGitHub(
          octokit,
          owner,
          repo,
          item.path,
          branch
        );
        files.push(...subFiles);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching files from GitHub:', errorMessage);
    throw error;
  }

  return files;
}

/**
 * Parse language from file path
 * Supports patterns like locales/en/common.json or translations/ja-JP.json
 */
export function extractLanguageFromPath(filePath: string): string {
  // Try common patterns
  const patterns = [
    /\/locales\/([a-z]{2}(-[A-Z]{2})?)\//i,  // /locales/en/ or /locales/ja-JP/
    /\/translations\/([a-z]{2}(-[A-Z]{2})?)\//i,  // /translations/en/
    /\/([a-z]{2}(-[A-Z]{2})?)\.json$/i,  // /en.json or /ja-JP.json
    /\/([a-z]{2}(-[A-Z]{2})?)\//i,  // Generic /{lang}/
  ];

  for (const pattern of patterns) {
    const match = filePath.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return 'unknown';
}

/**
 * Calculate hash of content for validation
 * Uses SHA-256 and returns first 16 characters
 */
export async function calculateSourceHash(content: string): Promise<string> {
  // Use Web Crypto API (available in Cloudflare Workers)
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
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
 * Fetch git blame information from GitHub for a file
 */
export async function fetchGitBlameFromGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<Map<number, GitBlameInfo>> {
  try {
    // Use GitHub's blame API
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (!('content' in data)) {
      return new Map();
    }

    // Get the commit history for the file
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path,
      sha: ref,
      per_page: 100, // Get recent commits
    });

    // Create a map of line numbers to git blame info
    const blameMap = new Map<number, GitBlameInfo>();

    // For simplicity, we'll associate each line with the most recent commit
    // In a more sophisticated implementation, we could use GitHub's blame API
    // or parse the file line by line with commit history
    if (commits.length > 0) {
      const latestCommit = commits[0];
      const blameInfo: GitBlameInfo = {
        commit: latestCommit.sha,
        author: latestCommit.commit.author?.name || 'Unknown',
        email: latestCommit.commit.author?.email || '',
        date: latestCommit.commit.author?.date || new Date().toISOString(),
      };

      // Decode content and count lines
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const lines = content.split('\n');
      
      // Associate each line with the blame info
      for (let i = 1; i <= lines.length; i++) {
        blameMap.set(i, blameInfo);
      }
    }

    return blameMap;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[git-blame] Failed to fetch blame for ${path}:`, errorMessage);
    return new Map();
  }
}

/**
 * Build metadata for a file including git blame, char ranges, and source hashes
 */
export async function buildMetadataForFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  fileContent: string,
  ref: string
): Promise<R2Metadata> {
  const metadata: R2Metadata = {
    gitBlame: {},
    charRanges: {},
    sourceHashes: {},
  };

  try {
    // Parse JSON content
    const parsed = JSON.parse(fileContent);
    const flattened = flattenObject(parsed);

    // Fetch git blame from GitHub
    const blameMap = await fetchGitBlameFromGitHub(octokit, owner, repo, filePath, ref);

    // Split content into lines for processing
    const lines = fileContent.split('\n');

    // For each flattened key, find its position and associate with git blame
    for (const [key, value] of Object.entries(flattened)) {
      const keyParts = key.split('.');
      const leafKey = keyParts[keyParts.length - 1];

      // Find the line containing this key
      let lineNumber = 0;
      let startChar = 0;
      let endLine = 0;
      let endChar = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const keyPattern = `"${leafKey}"`;
        
        if (line.includes(keyPattern)) {
          lineNumber = i + 1; // Line numbers are 1-indexed
          startChar = line.indexOf(keyPattern);
          
          // For JSON, value is on the same line
          const colonIndex = line.indexOf(':', startChar);
          if (colonIndex > -1) {
            const valueStart = colonIndex + 1;
            const closingQuote = line.lastIndexOf('"');
            const comma = line.indexOf(',', valueStart);
            
            endLine = i + 1;
            endChar = closingQuote > valueStart ? closingQuote + 1 : 
                     comma > 0 ? comma : line.length;
            break;
          }
        }
      }

      // Get git blame for this line
      const blame = blameMap.get(lineNumber);
      if (blame) {
        metadata.gitBlame[key] = blame;
      }

      // Store char range
      if (lineNumber > 0) {
        metadata.charRanges[key] = {
          start: [lineNumber, startChar],
          end: [endLine || lineNumber, endChar || startChar],
        };
      }

      // Store source hash for the value
      metadata.sourceHashes[key] = await calculateSourceHash(value);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[metadata] Failed to build metadata for ${filePath}:`, errorMessage);
  }

  return metadata;
}

/**
 * Process translation files from GitHub and build metadata
 */
export async function processGitHubTranslationFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: GitHubFile[],
  commitSha: string,
  branch: string
): Promise<FetchedTranslationFile[]> {
  const processed: FetchedTranslationFile[] = [];

  for (const file of files) {
    try {
      const contents = JSON.parse(file.content);
      const lang = extractLanguageFromPath(file.path);
      
      // Get just the filename without directory path
      const filename = file.path.split('/').pop() || file.path;
      
      // Build metadata with git blame from GitHub
      const metadata = await buildMetadataForFile(
        octokit,
        owner,
        repo,
        file.path,
        file.content,
        branch
      );
      
      processed.push({
        lang,
        filename,
        contents,
        metadata,
        sourceHash: await calculateSourceHash(file.content),
        commitSha,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing file ${file.path}:`, errorMessage);
    }
  }

  return processed;
}

/**
 * Get latest commit SHA for a branch
 */
export async function getLatestCommitSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<string> {
  const { data } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch,
  });

  return data.commit.sha;
}

/**
 * Fetch the generated manifest file from the repository
 * Path: .koro-i18n/koro-i18n.repo.generated.json
 */
export async function fetchGeneratedManifest(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<GeneratedManifest | null> {
  try {
    const manifestPath = '.koro-i18n/koro-i18n.repo.generated.json';
    
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: manifestPath,
      ref: branch,
    });

    if (!('content' in data)) {
      console.warn(`[manifest] Generated manifest not found at ${manifestPath}`);
      return null;
    }

    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const manifest = JSON.parse(content) as GeneratedManifest;

    return manifest;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[manifest] Failed to fetch generated manifest:`, errorMessage);
    return null;
  }
}

/**
 * Fetch specific files listed in the manifest
 */
export async function fetchFilesFromManifest(
  octokit: Octokit,
  owner: string,
  repo: string,
  manifest: GeneratedManifest,
  branch: string = 'main'
): Promise<GitHubFile[]> {
  const files: GitHubFile[] = [];

  for (const entry of manifest.files) {
    try {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: entry.sourceFilename,
        ref: branch,
      });

      if ('content' in fileData && fileData.content) {
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        
        files.push({
          path: entry.sourceFilename,
          content,
          sha: fileData.sha,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error fetching file ${entry.sourceFilename}:`, errorMessage);
    }
  }

  return files;
}

/**
 * Fetch a single translation file from GitHub
 * Uses the manifest to find the file path for a given language and filename
 */
export async function fetchSingleFileFromGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  lang: string,
  filename: string,
  branch: string = 'main'
): Promise<FetchedTranslationFile | null> {
  try {
    // First, fetch the manifest to find the file path
    const manifest = await fetchGeneratedManifest(octokit, owner, repo, branch);
    
    if (!manifest) {
      console.warn(`[github-fetcher] Manifest not found for ${owner}/${repo}`);
      return null;
    }

    // Find the file entry in the manifest
    const entry = manifest.files.find(f => f.language === lang && f.filename === filename);
    
    if (!entry) {
      console.warn(`[github-fetcher] File not found in manifest: ${lang}/${filename}`);
      return null;
    }

    // Fetch the file content
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: entry.sourceFilename,
      ref: branch,
    });

    if (!('content' in fileData) || !fileData.content) {
      console.warn(`[github-fetcher] No content in file: ${entry.sourceFilename}`);
      return null;
    }

    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const contents = JSON.parse(content);
    
    // Build metadata with git blame from GitHub
    const metadata = await buildMetadataForFile(
      octokit,
      owner,
      repo,
      entry.sourceFilename,
      content,
      branch
    );

    return {
      lang,
      filename,
      contents,
      metadata,
      sourceHash: await calculateSourceHash(content),
      commitSha: entry.commitHash,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[github-fetcher] Error fetching ${lang}/${filename}:`, errorMessage);
    return null;
  }
}

/**
 * Fetch the progress-translated file for a specific language
 * Path: .koro-i18n/progress-translated/[lang].json
 * 
 * Returns a map of filepath (with <lang> placeholder) to array of translated key names
 */
export async function fetchProgressTranslatedFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  lang: string,
  branch: string = 'main'
): Promise<Record<string, string[]> | null> {
  try {
    const progressPath = `.koro-i18n/progress-translated/${lang}.json`;
    
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: progressPath,
      ref: branch,
    });

    if (!('content' in data) || !data.content) {
      return null;
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(content) as Record<string, string[]>;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[github-fetcher] Progress file not found for ${lang}:`, errorMessage);
    return null;
  }
}

/**
 * Fetch the store file for a specific language to get source totalKeys
 * Path: .koro-i18n/store/[lang].json
 */
export async function fetchStoreFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  lang: string,
  branch: string = 'main'
): Promise<Record<string, Record<string, any>> | null> {
  try {
    const storePath = `.koro-i18n/store/${lang}.json`;
    
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: storePath,
      ref: branch,
    });

    if (!('content' in data) || !data.content) {
      return null;
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(content) as Record<string, Record<string, any>>;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[github-fetcher] Store file not found for ${lang}:`, errorMessage);
    return null;
  }
}
