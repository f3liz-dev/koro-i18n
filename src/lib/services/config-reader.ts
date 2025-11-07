/**
 * Repository Configuration Reader
 * Handles reading and caching configuration files from GitHub repositories
 */
import { Octokit } from '@octokit/rest';
import { parseAndValidateConfig, mergeWithDefaults } from '../utils/config-parser.js';
import type { ConfigParseResult, TranslationConfig } from '../types/config.js';

export interface RepositoryInfo {
  owner: string;
  repo: string;
  ref?: string; // branch, tag, or commit SHA
}

export interface ConfigCache {
  config: TranslationConfig;
  etag: string;
  lastModified: string;
  expiresAt: number;
}

export class ConfigReaderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ConfigReaderError';
  }
}

export class RepositoryConfigReader {
  private cache = new Map<string, ConfigCache>();
  private readonly cacheTTL: number;
  private readonly configFileName: string;

  constructor(
    private readonly octokit: Octokit,
    options: {
      cacheTTL?: number; // Cache TTL in milliseconds
      configFileName?: string;
    } = {}
  ) {
    this.cacheTTL = options.cacheTTL ?? 5 * 60 * 1000; // 5 minutes default
    this.configFileName = options.configFileName ?? '.i18n-platform.toml';
  }

  /**
   * Reads configuration from a GitHub repository
   */
  async readConfig(repository: RepositoryInfo): Promise<ConfigParseResult> {
    const cacheKey = this.getCacheKey(repository);
    
    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          success: true,
          config: cached.config,
          errors: []
        };
      }

      // Fetch from GitHub
      const response = await this.fetchConfigFile(repository);
      
      if (!response.content) {
        throw new ConfigReaderError(
          `Configuration file ${this.configFileName} not found`,
          'CONFIG_NOT_FOUND',
          404
        );
      }

      // Decode base64 content
      const content = atob(response.content);
      
      // Parse and validate configuration
      const parseResult = parseAndValidateConfig(content);
      
      if (!parseResult.success || !parseResult.config) {
        return parseResult;
      }

      // Merge with defaults
      const config = mergeWithDefaults(parseResult.config);

      // Cache the result
      this.setCache(cacheKey, {
        config,
        etag: response.etag || '',
        lastModified: response.lastModified || new Date().toISOString(),
        expiresAt: Date.now() + this.cacheTTL
      });

      return {
        success: true,
        config,
        errors: []
      };

    } catch (error) {
      if (error instanceof ConfigReaderError) {
        throw error;
      }

      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number;
        
        if (status === 404) {
          throw new ConfigReaderError(
            `Configuration file ${this.configFileName} not found in repository ${repository.owner}/${repository.repo}`,
            'CONFIG_NOT_FOUND',
            404
          );
        }
        
        if (status === 403) {
          throw new ConfigReaderError(
            `Access denied to repository ${repository.owner}/${repository.repo}`,
            'ACCESS_DENIED',
            403
          );
        }
        
        if (status >= 500) {
          throw new ConfigReaderError(
            'GitHub API server error',
            'SERVER_ERROR',
            status
          );
        }
      }

      throw new ConfigReaderError(
        `Failed to read configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Checks if configuration exists in repository
   */
  async configExists(repository: RepositoryInfo): Promise<boolean> {
    try {
      await this.fetchConfigFile(repository);
      return true;
    } catch (error) {
      if (error instanceof ConfigReaderError && error.code === 'CONFIG_NOT_FOUND') {
        return false;
      }

      // Handle raw GitHub API errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number;
        
        if (status === 404) {
          return false;
        }
        
        if (status === 403) {
          throw new ConfigReaderError(
            `Access denied to repository ${repository.owner}/${repository.repo}`,
            'ACCESS_DENIED',
            403
          );
        }
        
        if (status >= 500) {
          throw new ConfigReaderError(
            'GitHub API server error',
            'SERVER_ERROR',
            status
          );
        }
      }

      throw new ConfigReaderError(
        `Failed to check configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Clears cache for a specific repository or all repositories
   */
  clearCache(repository?: RepositoryInfo): void {
    if (repository) {
      const cacheKey = this.getCacheKey(repository);
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  private async fetchConfigFile(repository: RepositoryInfo) {
    const { owner, repo, ref = 'main' } = repository;
    
    const response = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path: this.configFileName,
      ref
    });

    // Handle the case where response.data is an array (directory) or single file
    if (Array.isArray(response.data)) {
      throw new ConfigReaderError(
        `Expected file but found directory at ${this.configFileName}`,
        'INVALID_FILE_TYPE'
      );
    }

    if (response.data.type !== 'file') {
      throw new ConfigReaderError(
        `Expected file but found ${response.data.type} at ${this.configFileName}`,
        'INVALID_FILE_TYPE'
      );
    }

    return {
      content: response.data.content,
      etag: response.headers.etag,
      lastModified: response.headers['last-modified']
    };
  }

  private getCacheKey(repository: RepositoryInfo): string {
    const { owner, repo, ref = 'main' } = repository;
    return `${owner}/${repo}@${ref}`;
  }

  private getFromCache(cacheKey: string): ConfigCache | null {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  private setCache(cacheKey: string, cache: ConfigCache): void {
    this.cache.set(cacheKey, cache);
  }
}

/**
 * Creates a repository config reader with authentication
 */
export function createConfigReader(
  auth: string,
  options?: {
    cacheTTL?: number;
    configFileName?: string;
  }
): RepositoryConfigReader {
  const octokit = new Octokit({ auth });
  return new RepositoryConfigReader(octokit, options);
}