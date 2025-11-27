import { authFetch } from './authFetch';
import { streamJsonl } from './streaming';

/**
 * Extract a string value from plain text content using position information
 * Uses metadata's charRanges (line/char positions) to extract the actual value
 * 
 * @param content - The raw file content as plain text string
 * @param charRange - Position info: { start: [line, char], end: [line, char] }
 * @returns The extracted string value, or empty string if extraction fails
 */
function extractValueFromPosition(
  content: string,
  charRange: { start: [number, number]; end: [number, number] } | undefined
): string {
  if (!charRange || !content) {
    return '';
  }

  const lines = content.split('\n');
  const [startLine, startChar] = charRange.start;
  const [endLine, endChar] = charRange.end;

  // Lines are 1-indexed in the metadata
  if (startLine < 1 || startLine > lines.length) {
    return '';
  }

  try {
    if (startLine === endLine) {
      // Single line value
      const line = lines[startLine - 1];
      // Extract the value part (after the colon, between quotes for JSON)
      const extracted = line.substring(startChar, endChar);
      return parseJsonStringValue(extracted);
    } else {
      // Multi-line value (rare for JSON, common for markdown)
      const extractedLines: string[] = [];
      for (let i = startLine - 1; i < endLine && i < lines.length; i++) {
        if (i === startLine - 1) {
          extractedLines.push(lines[i].substring(startChar));
        } else if (i === endLine - 1) {
          extractedLines.push(lines[i].substring(0, endChar));
        } else {
          extractedLines.push(lines[i]);
        }
      }
      return parseJsonStringValue(extractedLines.join('\n'));
    }
  } catch {
    return '';
  }
}

/**
 * Parse the value portion of a JSON key-value pair
 * Handles: "key": "value" or "key": "value",
 * Returns just the value content without quotes
 */
function parseJsonStringValue(extracted: string): string {
  // Find the colon that separates key from value
  const colonIndex = extracted.indexOf(':');
  if (colonIndex === -1) {
    // No colon found, might be just the value
    return extractQuotedString(extracted);
  }

  // Get everything after the colon
  const afterColon = extracted.substring(colonIndex + 1).trim();
  return extractQuotedString(afterColon);
}

/**
 * Extract the content of a quoted string
 * Handles JSON string escaping
 */
function extractQuotedString(str: string): string {
  const trimmed = str.trim();
  
  // Find opening quote
  const openQuote = trimmed.indexOf('"');
  if (openQuote === -1) {
    // Not a quoted string, return as-is (for non-JSON formats)
    return trimmed.replace(/,\s*$/, '');
  }

  // Find closing quote (handle escaped quotes)
  // Count consecutive backslashes before quote - if odd, quote is escaped
  let closeQuote = -1;
  let i = openQuote + 1;
  while (i < trimmed.length) {
    if (trimmed[i] === '"') {
      // Count consecutive backslashes before this quote
      let backslashCount = 0;
      let j = i - 1;
      while (j >= openQuote + 1 && trimmed[j] === '\\') {
        backslashCount++;
        j--;
      }
      // Quote is escaped only if odd number of backslashes precede it
      if (backslashCount % 2 === 0) {
        closeQuote = i;
        break;
      }
    }
    i++;
  }

  if (closeQuote === -1) {
    // No closing quote found, return content after opening quote
    return trimmed.substring(openQuote + 1);
  }

  // Extract content between quotes
  const content = trimmed.substring(openQuote + 1, closeQuote);
  
  // Unescape JSON string escapes
  return unescapeJsonString(content);
}

/**
 * Unescape JSON string escape sequences
 * Order matters: replace \\\\ first to avoid affecting other escape sequences
 */
function unescapeJsonString(str: string): string {
  // Replace escaped backslash first (\\) -> (\)
  // This must happen first to avoid affecting other escape sequences like \n, \t
  return str
    .replace(/\\\\/g, '\x00')  // Temporarily replace \\\\ with null char
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\x00/g, '\\');   // Replace null char back to single backslash
}

// Store JSONL types used by the client streaming API
export interface StoreEntry {
  src: string; // source commit hash
  tgt: string; // target commit hash (if present)
  updated: number; // unix timestamp (seconds)
  status: 'verified' | 'outdated' | 'pending';
}

export interface StoreHeaderJsonl {
  type: 'header';
  language: string;
  totalFiles: number;
  totalKeys: number;
}

export interface StoreFileHeaderJsonl {
  type: 'file_header';
  filepath: string;
  totalKeys: number;
}

export interface StoreChunkJsonl {
  type: 'chunk';
  filepath: string;
  chunkIndex: number;
  entries: Record<string, StoreEntry>;
}

export type StoreJsonlLine = StoreHeaderJsonl | StoreFileHeaderJsonl | StoreChunkJsonl;

// Source JSONL types for key positions from client repository
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

export interface SourceFileJsonl {
  type: 'file';
  filepath: string;  // filepath with <lang> placeholder
  filename: string;  // just the filename without directories
  keys: Record<string, KeyPosition>;  // key -> position data
}

export interface SourceChunkJsonl {
  type: 'chunk';
  filepath: string;  // filepath with <lang> placeholder
  chunkIndex: number;
  keys: Record<string, KeyPosition>;  // key -> position data
}

export type SourceJsonlLine = SourceHeaderJsonl | SourceFileJsonl | SourceChunkJsonl;

import type {
  GitBlameInfo,
  CharRange,
  WebTranslation as SharedWebTranslation,
  MergedTranslation as SharedMergedTranslation
} from '../../../shared/types';

/**
 * Flatten a nested object into dot-notation keys
 * e.g., { a: { b: 'c' } } => { 'a.b': 'c' }
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
 * Find the line number in JSON content where a nested key is defined.
 * Handles nested structures like "buttons.save" properly.
 */
function findKeyLineInJson(lines: string[], keyPath: string): number {
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
 * Build charRanges from JSON content.
 * Parses the JSON file and finds the position of each key-value pair.
 */
function buildCharRangesFromJson(
  rawContent: string,
  flattenedContents: Record<string, string>
): Record<string, CharRange> {
  const charRanges: Record<string, CharRange> = {};
  const lines = rawContent.split('\n');

  for (const key of Object.keys(flattenedContents)) {
    const lineNumber = findKeyLineInJson(lines, key);

    if (lineNumber > 0) {
      const line = lines[lineNumber - 1];
      const keyParts = key.split('.');
      const leafKey = keyParts[keyParts.length - 1];
      const keyPattern = `"${leafKey}"`;

      const startChar = line.indexOf(keyPattern);
      if (startChar >= 0) {
        // Find the end of the value on this line
        const colonIndex = line.indexOf(':', startChar);
        if (colonIndex > -1) {
          const closingQuote = line.lastIndexOf('"');
          const comma = line.indexOf(',', colonIndex);

          charRanges[key] = {
            start: [lineNumber, startChar],
            end: [lineNumber, closingQuote > colonIndex ? closingQuote + 1 : comma > 0 ? comma : line.length]
          };
        }
      }
    }
  }

  return charRanges;
}

// Re-export shared types for convenience
export type WebTranslation = SharedWebTranslation;
export type MergedTranslation = SharedMergedTranslation;
export type { GitBlameInfo, CharRange };

// UI variant of merged translation that includes optional store entry metadata
export type UiMergedTranslation = MergedTranslation & { storeEntry?: StoreEntry };

/**
 * File data structure returned from the API (GitHub-based)
 * 
 * raw: Plain text content of the file (NOT parsed JSON)
 * parsed: Flattened key-value pairs from parsed JSON (used for value lookup)
 * metadata: Contains position information (charRanges) for extracting values
 */
export interface FileData {
  raw: string;  // Plain text file content
  parsed: Record<string, string>;  // Flattened key-value pairs from parsed JSON
  metadata: {
    gitBlame: Record<string, GitBlameInfo>;
    charRanges: Record<string, CharRange>;
    sourceHashes: Record<string, string>;
  };
  sourceHash: string;
  commitSha: string;
  fetchedAt: string;
  totalKeys?: number;
}

/**
 * Fetch file from GitHub via the API
 * Uses the files endpoint which now fetches directly from GitHub
 * 
 * First tries to fetch key positions from client repository (.koro-i18n/source/)
 * Falls back to fetching raw file and parsing JSON if source data is not available
 */
export async function fetchFileFromGitHub(
  projectName: string,
  lang: string,
  filename: string
): Promise<FileData | null> {
  try {
    // First, try to fetch key positions from client repository
    // This is the preferred method as it supports custom parsers (JSON, Markdown, etc.)
    const keyPositions = await fetchSourceData(projectName, lang, filename, { credentials: 'include' });

    // Fetch raw file content from the API
    const response = await authFetch(
      `/api/projects/${encodeURIComponent(projectName)}/files/${encodeURIComponent(lang)}/${encodeURIComponent(filename)}`,
      { credentials: 'include' }
    );

    // Handle conditional response (ETag) and standard errors
    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 304) {
        // Not modified — caller should reuse cached data if available.
        return null;
      }
      throw new Error('Failed to fetch file');
    }

    // Get raw content as plain text
    const rawContent = await response.text();

    // Get commit SHA from ETag header (remove quotes)
    const etag = response.headers.get('ETag');
    const commitSha = etag ? etag.replace(/"/g, '') : '';

    // Use key positions from client repository if available
    let parsed: Record<string, string> = {};
    let charRanges: Record<string, CharRange> = {};

    if (keyPositions && Object.keys(keyPositions).length > 0) {
      // Use key positions from client repository to extract values
      charRanges = keyPositions as Record<string, CharRange>;
      
      // Extract values using the position data
      for (const [key, position] of Object.entries(keyPositions)) {
        const value = extractValueFromPosition(rawContent, position);
        parsed[key] = value;
      }
    } else {
      // Fallback: Parse JSON content locally
      // This is a fallback for repositories that haven't run the client-library yet
      try {
        const jsonParsed = JSON.parse(rawContent);
        parsed = flattenObject(jsonParsed);
        charRanges = buildCharRangesFromJson(rawContent, parsed);
      } catch (parseError) {
        console.warn('[GitHub] Failed to parse JSON content, will return empty data:', parseError);
      }
    }

    return {
      raw: rawContent,
      parsed,
      metadata: {
        gitBlame: {},
        charRanges,
        sourceHashes: {}
      },
      sourceHash: '',
      commitSha,
      fetchedAt: new Date().toISOString(),
      totalKeys: Object.keys(parsed).length
    };
  } catch (error) {
    console.error('[GitHub] Fetch error:', error);
    return null;
  }
}



/**
 * Fetch web translations from D1
 */
export async function fetchWebTranslations(
  projectName: string,
  language: string,
  filename: string
): Promise<WebTranslation[]> {
  try {
    const params = new URLSearchParams({
      language,
      filename,
      status: 'approved',
    });

    const response = await authFetch(
      `/api/projects/${encodeURIComponent(projectName)}/translations?${params}`,
      { credentials: 'include' }
    );

    // Handle conditional requests (ETag)
    if (!response.ok) {
      if (response.status === 304) {
        // Not modified - return empty array to indicate no new translations.
        return [];
      }
      throw new Error('Failed to fetch web translations');
    }

    const data = await response.json() as { translations?: WebTranslation[] };
    return data.translations || [];
  } catch (error) {
    console.error('[D1] Fetch error:', error);
    return [];
  }
}

/**
 * Stream store JSONL file from backend and yield parsed StoreJsonlLine items
 * This allows UI to react to incoming chunked store entries and update
 * translation statuses progressively as chunks arrive.
 */
export async function* streamStore(
  projectName: string,
  language: string,
  init?: RequestInit
): AsyncGenerator<StoreJsonlLine> {
  const url = `/api/projects/${encodeURIComponent(projectName)}/files/store/stream/${encodeURIComponent(language)}`;
  const generator = streamJsonl<StoreJsonlLine>(url, init);
  for await (const line of generator) {
    yield line;
  }
}

/**
 * Stream source JSONL file from backend and yield parsed SourceJsonlLine items
 * This provides key positions from the client repository for value extraction.
 */
export async function* streamSource(
  projectName: string,
  language: string,
  init?: RequestInit
): AsyncGenerator<SourceJsonlLine> {
  const url = `/api/projects/${encodeURIComponent(projectName)}/files/source/stream/${encodeURIComponent(language)}`;
  const generator = streamJsonl<SourceJsonlLine>(url, init);
  for await (const line of generator) {
    yield line;
  }
}

/**
 * Fetch key positions for a specific file from the client repository
 * Uses the source stream endpoint and filters for the requested file
 * 
 * @returns Record of key -> KeyPosition for the file, or null if not found
 */
export async function fetchSourceData(
  projectName: string,
  language: string,
  filename: string,
  init?: RequestInit
): Promise<Record<string, KeyPosition> | null> {
  try {
    const keyPositions: Record<string, KeyPosition> = {};
    const filenameBase = filename.split('/').pop() || filename;
    let foundFile = false;

    for await (const line of streamSource(projectName, language, init)) {
      if (line.type === 'header') continue;

      // Match by filename (with or without path)
      const lineFilename = (line as SourceFileJsonl).filename || '';
      const lineFilepath = (line as SourceFileJsonl | SourceChunkJsonl).filepath || '';
      
      // Check if this line is for our file
      const isMatch = lineFilename === filenameBase || 
                      lineFilepath.endsWith(`/${filenameBase}`) ||
                      lineFilepath === filenameBase;

      if (isMatch) {
        foundFile = true;
        if (line.type === 'file' || line.type === 'chunk') {
          Object.assign(keyPositions, line.keys);
        }
      } else if (foundFile) {
        // We've moved past our file, stop streaming
        break;
      }
    }

    return foundFile ? keyPositions : null;
  } catch (error) {
    console.warn('[Source] Failed to fetch source data:', error);
    return null;
  }
}

/**
 * Get all translation keys from file data
 * Priority: parsed content > charRanges > sourceHashes > gitBlame
 */
function getKeysFromFileData(fileData: FileData): string[] {
  // Priority 0: Use keys from parsed content (generated by frontend JSON parsing)
  const parsedKeys = Object.keys(fileData.parsed || {});
  if (parsedKeys.length > 0) {
    return parsedKeys;
  }

  // Priority 1: Use keys from charRanges (generated by client-library with position info)
  const charRangeKeys = Object.keys(fileData.metadata.charRanges || {});
  if (charRangeKeys.length > 0) {
    return charRangeKeys;
  }

  // Priority 2: Use keys from sourceHashes (also generated by client-library)
  const sourceHashKeys = Object.keys(fileData.metadata.sourceHashes || {});
  if (sourceHashKeys.length > 0) {
    return sourceHashKeys;
  }

  // Priority 3: Use keys from gitBlame
  const gitBlameKeys = Object.keys(fileData.metadata.gitBlame || {});
  if (gitBlameKeys.length > 0) {
    return gitBlameKeys;
  }

  // No metadata available - return empty array
  // The UI should show an error or prompt user to run client-library
  return [];
}

/**
 * Merge file data and D1 data (legacy - for backward compatibility)
 * 
 * Extracts values using metadata's charRanges position info
 * Does NOT parse JSON - treats source as plain text
 */
export function mergeTranslations(
  fileData: FileData | null,
  webTranslations: WebTranslation[]
): MergedTranslation[] {
  if (!fileData) return [];

  const webTransMap = new Map<string, WebTranslation>();
  for (const trans of webTranslations) {
    webTransMap.set(trans.key, trans);
  }

  const merged: MergedTranslation[] = [];

  // Get keys from metadata
  const keys = getKeysFromFileData(fileData);

  for (const key of keys) {
    const charRange = fileData.metadata.charRanges?.[key];
    // Extract value using position info from metadata (string manipulation, not JSON parse)
    const sourceValue = extractValueFromPosition(fileData.raw, charRange);
    const webTrans = webTransMap.get(key);

    merged.push({
      key,
      sourceValue,
      currentValue: webTrans?.value || sourceValue,
      gitBlame: fileData.metadata.gitBlame?.[key],
      charRange,
      webTranslation: webTrans,
      isValid: webTrans?.isValid ?? true,
    });
  }

  return merged;
}

/**
 * Merge source file, target file, and D1 web translations
 * This properly handles the case where source and target are different files
 * 
 * Uses pre-parsed content when available, falls back to position extraction
 */
export function mergeTranslationsWithSource(
  sourceFileData: FileData | null,
  targetFileData: FileData | null,
  webTranslations: WebTranslation[]
): MergedTranslation[] {
  if (!sourceFileData) return [];

  const webTransMap = new Map<string, WebTranslation>();
  for (const trans of webTranslations) {
    webTransMap.set(trans.key, trans);
  }

  const merged: MergedTranslation[] = [];

  // Get keys from source file data
  const keys = getKeysFromFileData(sourceFileData);

  for (const key of keys) {
    const sourceCharRange = sourceFileData.metadata.charRanges?.[key];
    const targetCharRange = targetFileData?.metadata.charRanges?.[key];

    // Get values from parsed content (preferred) or extract from positions (fallback)
    const sourceValue = sourceFileData.parsed?.[key] ?? 
                        extractValueFromPosition(sourceFileData.raw, sourceCharRange);
    const targetValue = targetFileData?.parsed?.[key] ??
                        (targetFileData ? extractValueFromPosition(targetFileData.raw, targetCharRange) : '');
    const webTrans = webTransMap.get(key);

    // Priority: web translation > target file > empty (don't use source as fallback)
    // If there's no translation, leave it empty so users know to translate it
    const currentValue = webTrans?.value || targetValue || '';

    // isValid flag:
    // - Git-imported translations are always valid
    // - Web translations use their isValid flag (can be invalidated if source changed)
    // - Empty translations (no translation yet) are still "valid" (just not translated)
    const isValid = webTrans ? webTrans.isValid : true;

    merged.push({
      key,
      sourceValue,
      currentValue,
      gitBlame: sourceFileData.metadata.gitBlame?.[key],
      charRange: sourceCharRange,
      webTranslation: webTrans,
      isValid,
    });
  }

  return merged;
}

/**
 * Submit web translation
 */
export async function submitTranslation(
  projectName: string,
  language: string,
  filename: string,
  key: string,
  value: string
): Promise<void> {
  const response = await authFetch(`/api/projects/${encodeURIComponent(projectName)}/translations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ language, filename, key, value }),
  });

  if (!response.ok) throw new Error('Failed to submit translation');
}

/**
 * Approve suggestion
 */
export async function approveSuggestion(projectName: string, id: string): Promise<void> {
  const response = await authFetch(`/api/projects/${encodeURIComponent(projectName)}/translations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status: 'approved' }),
  });

  if (!response.ok) throw new Error('Failed to approve suggestion');
}

/**
 * Reject suggestion
 */
export async function rejectSuggestion(projectName: string, id: string): Promise<void> {
  const response = await authFetch(`/api/projects/${encodeURIComponent(projectName)}/translations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to reject suggestion');
}

/**
 * Fetch suggestions for a key
 */
export async function fetchSuggestions(
  projectName: string,
  language: string,
  filename: string,
  key?: string,
  // If true, bypass browser cache and force revalidation
  force = false
): Promise<WebTranslation[]> {
  const params = new URLSearchParams({ language, filename });
  if (key) params.append('key', key);

  const response = await authFetch(
    `/api/projects/${encodeURIComponent(projectName)}/translations/suggestions?${params}`,
    // When force is true, instruct the browser to reload the resource from network
    // (this avoids max-age serving stale responses)
    { credentials: 'include', ...(force ? { cache: 'reload' } : {}) }
  );

  // Handle ETag 304 responses
  if (!response.ok) {
    if (response.status === 304) {
      return [];
    }
    throw new Error('Failed to fetch suggestions');
  }

  const data = await response.json() as { suggestions?: WebTranslation[] };
  return data.suggestions || [];
}
