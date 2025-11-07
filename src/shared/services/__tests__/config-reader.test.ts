/**
 * Tests for Repository Configuration Reader
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Octokit } from '@octokit/rest';
import { RepositoryConfigReader, ConfigReaderError, createConfigReader } from '../config-reader.js';

// Mock Octokit
vi.mock('@octokit/rest');

describe('RepositoryConfigReader', () => {
  let mockOctokit: any;
  let configReader: RepositoryConfigReader;

  const validConfigContent = `
sourceLanguage = "en"
targetLanguages = ["es", "fr", "de"]
outputPattern = "locales/{lang}.toml"

[[sourceFiles]]
path = "src/locales/en.toml"
format = "toml"

[settings]
submitAsPR = true
requireReview = true
autoMerge = false
prTitleTemplate = "feat(i18n): update translations for {languages}"
commitMessageTemplate = "Update translations for {languages}"
`;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn()
        }
      }
    };
    
    configReader = new RepositoryConfigReader(mockOctokit, {
      cacheTTL: 1000, // 1 second for testing
      configFileName: '.i18n-platform.toml'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('readConfig', () => {
    it('should successfully read and parse valid configuration', async () => {
      const mockResponse = {
        data: {
          type: 'file',
          content: btoa(validConfigContent), // base64 encoded
        },
        headers: {
          etag: '"abc123"',
          'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT'
        }
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(mockResponse);

      const result = await configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.sourceLanguage).toBe('en');
      expect(result.config?.targetLanguages).toEqual(['es', 'fr', 'de']);
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: '.i18n-platform.toml',
        ref: 'main'
      });
    });

    it('should use custom ref when provided', async () => {
      const mockResponse = {
        data: {
          type: 'file',
          content: btoa(validConfigContent),
        },
        headers: {}
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(mockResponse);

      await configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'develop'
      });

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: '.i18n-platform.toml',
        ref: 'develop'
      });
    });

    it('should throw ConfigReaderError for missing configuration file', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({
        status: 404,
        message: 'Not Found'
      });

      await expect(configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      })).rejects.toThrow(ConfigReaderError);

      await expect(configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      })).rejects.toThrow('Configuration file .i18n-platform.toml not found');
    });

    it('should throw ConfigReaderError for access denied', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({
        status: 403,
        message: 'Forbidden'
      });

      await expect(configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      })).rejects.toThrow(ConfigReaderError);

      await expect(configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      })).rejects.toThrow('Access denied to repository test-owner/test-repo');
    });

    it('should throw ConfigReaderError for server errors', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({
        status: 500,
        message: 'Internal Server Error'
      });

      await expect(configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      })).rejects.toThrow(ConfigReaderError);
    });

    it('should handle directory instead of file error', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: [{
          type: 'file',
          name: 'config.toml'
        }],
        headers: {}
      });

      await expect(configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      })).rejects.toThrow('Expected file but found directory');
    });

    it('should handle non-file type error', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          type: 'symlink',
          content: btoa(validConfigContent)
        },
        headers: {}
      });

      await expect(configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      })).rejects.toThrow('Expected file but found symlink');
    });
  });

  describe('caching', () => {
    it('should cache successful configuration reads', async () => {
      const mockResponse = {
        data: {
          type: 'file',
          content: btoa(validConfigContent),
        },
        headers: {
          etag: '"abc123"',
          'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT'
        }
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(mockResponse);

      // First call
      const result1 = await configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      // Second call should use cache
      const result2 = await configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(1);
    });

    it('should not use expired cache', async () => {
      const mockResponse = {
        data: {
          type: 'file',
          content: btoa(validConfigContent),
        },
        headers: {}
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(mockResponse);

      // First call
      await configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second call should fetch again
      await configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(2);
    });

    it('should clear cache for specific repository', async () => {
      const mockResponse = {
        data: {
          type: 'file',
          content: btoa(validConfigContent),
        },
        headers: {}
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(mockResponse);

      // First call to cache
      await configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      // Clear cache
      configReader.clearCache({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      // Second call should fetch again
      await configReader.readConfig({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      const mockResponse = {
        data: {
          type: 'file',
          content: btoa(validConfigContent),
        },
        headers: {}
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(mockResponse);

      // Cache multiple repositories
      await configReader.readConfig({ owner: 'owner1', repo: 'repo1' });
      await configReader.readConfig({ owner: 'owner2', repo: 'repo2' });

      expect(configReader.getCacheStats().size).toBe(2);

      // Clear all cache
      configReader.clearCache();

      expect(configReader.getCacheStats().size).toBe(0);
    });
  });

  describe('configExists', () => {
    it('should return true when configuration exists', async () => {
      const mockResponse = {
        data: {
          type: 'file',
          content: btoa(validConfigContent),
        },
        headers: {}
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(mockResponse);

      const exists = await configReader.configExists({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      expect(exists).toBe(true);
    });

    it('should return false when configuration does not exist', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({
        status: 404,
        message: 'Not Found'
      });

      const exists = await configReader.configExists({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      expect(exists).toBe(false);
    });

    it('should throw error for other failures', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({
        status: 403,
        message: 'Forbidden'
      });

      await expect(configReader.configExists({
        owner: 'test-owner',
        repo: 'test-repo'
      })).rejects.toThrow(ConfigReaderError);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockResponse = {
        data: {
          type: 'file',
          content: btoa(validConfigContent),
        },
        headers: {}
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(mockResponse);

      // Initially empty
      expect(configReader.getCacheStats().size).toBe(0);

      // Add to cache
      await configReader.readConfig({ owner: 'owner1', repo: 'repo1' });
      await configReader.readConfig({ owner: 'owner2', repo: 'repo2' });

      const stats = configReader.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('owner1/repo1@main');
      expect(stats.keys).toContain('owner2/repo2@main');
    });
  });
});

describe('createConfigReader', () => {
  it('should create a RepositoryConfigReader with authentication', () => {
    const reader = createConfigReader('github_token_123', {
      cacheTTL: 5000,
      configFileName: 'custom-config.toml'
    });

    expect(reader).toBeInstanceOf(RepositoryConfigReader);
  });

  it('should create a RepositoryConfigReader with default options', () => {
    const reader = createConfigReader('github_token_123');

    expect(reader).toBeInstanceOf(RepositoryConfigReader);
  });
});