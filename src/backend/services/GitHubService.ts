/**
 * GitHub Repository Service
 * Handles GitHub API operations for repository management, file operations, and integration
 */
import { Octokit } from '@octokit/rest';
import { RepositoryConfigReader, RepositoryInfo, ConfigReaderError } from '../../shared/services/config-reader.js';
import type { TranslationConfig } from '../../shared/types/config.js';
import type { User } from '../types/User.js';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
  };
  private: boolean;
  description: string | null;
  default_branch: string;
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
  updated_at: string;
}

export interface FileContent {
  content: string;
  sha: string;
  path: string;
  encoding: 'base64' | 'utf-8';
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
}

export interface RepositoryAccess {
  hasAccess: boolean;
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
  };
  repository?: GitHubRepository;
}

export class GitHubServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly repository?: string
  ) {
    super(message);
    this.name = 'GitHubServiceError';
  }
}

export class GitHubRepositoryService {
  public readonly octokit: Octokit;
  private readonly configReader: RepositoryConfigReader;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
    this.configReader = new RepositoryConfigReader(this.octokit, {
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      configFileName: '.i18n-platform.toml'
    });
  }

  /**
   * Lists repositories accessible to the authenticated user
   * Filters for repositories with push access
   */
  async listRepositories(options: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepository[]> {
    try {
      const { type = 'all', sort = 'updated', direction = 'desc', per_page = 30, page = 1 } = options;

      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        type,
        sort,
        direction,
        per_page,
        page
      });

      // Filter repositories where user has push access and map to our interface
      return response.data
        .filter(repo => 
          repo.permissions?.push || repo.permissions?.admin || repo.permissions?.maintain
        )
        .map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          owner: {
            login: repo.owner.login,
            id: repo.owner.id,
            avatar_url: repo.owner.avatar_url
          },
          private: repo.private,
          description: repo.description,
          default_branch: repo.default_branch,
          permissions: repo.permissions ? {
            admin: repo.permissions.admin,
            maintain: repo.permissions.maintain,
            push: repo.permissions.push,
            triage: repo.permissions.triage,
            pull: repo.permissions.pull
          } : undefined,
          updated_at: repo.updated_at || new Date().toISOString()
        }));
    } catch (error) {
      throw this.handleGitHubError(error, 'Failed to list repositories');
    }
  }

  /**
   * Validates access to a specific repository
   */
  async validateRepositoryAccess(owner: string, repo: string): Promise<RepositoryAccess> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo
      });

      const repoData = response.data;
      const permissions = repoData.permissions || { pull: false, push: false, admin: false, maintain: false };

      const repository: GitHubRepository = {
        id: repoData.id,
        name: repoData.name,
        full_name: repoData.full_name,
        owner: {
          login: repoData.owner.login,
          id: repoData.owner.id,
          avatar_url: repoData.owner.avatar_url
        },
        private: repoData.private,
        description: repoData.description,
        default_branch: repoData.default_branch,
        permissions: repoData.permissions ? {
          admin: repoData.permissions.admin,
          maintain: repoData.permissions.maintain,
          push: repoData.permissions.push,
          triage: repoData.permissions.triage,
          pull: repoData.permissions.pull
        } : undefined,
        updated_at: repoData.updated_at || new Date().toISOString()
      };

      return {
        hasAccess: true,
        permissions: {
          read: permissions.pull || false,
          write: permissions.push || permissions.admin || permissions.maintain || false,
          admin: permissions.admin || false
        },
        repository
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number;
        
        if (status === 404) {
          return {
            hasAccess: false,
            permissions: {
              read: false,
              write: false,
              admin: false
            }
          };
        }
      }

      throw this.handleGitHubError(error, `Failed to validate access to repository ${owner}/${repo}`, `${owner}/${repo}`);
    }
  }

  /**
   * Reads a file from a repository
   */
  async readFile(owner: string, repo: string, path: string, ref?: string): Promise<FileContent> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: ref || 'main'
      });

      if (Array.isArray(response.data)) {
        throw new GitHubServiceError(
          `Expected file but found directory at ${path}`,
          'INVALID_FILE_TYPE',
          400,
          `${owner}/${repo}`
        );
      }

      if (response.data.type !== 'file') {
        throw new GitHubServiceError(
          `Expected file but found ${response.data.type} at ${path}`,
          'INVALID_FILE_TYPE',
          400,
          `${owner}/${repo}`
        );
      }

      return {
        content: response.data.content,
        sha: response.data.sha,
        path: response.data.path,
        encoding: response.data.encoding as 'base64' | 'utf-8'
      };
    } catch (error) {
      if (error instanceof GitHubServiceError) {
        throw error;
      }

      throw this.handleGitHubError(error, `Failed to read file ${path} from repository ${owner}/${repo}`, `${owner}/${repo}`);
    }
  }

  /**
   * Writes a file to a repository
   */
  async writeFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    options: {
      branch?: string;
      sha?: string; // Required for updates
      author?: {
        name: string;
        email: string;
      };
      committer?: {
        name: string;
        email: string;
      };
    } = {}
  ): Promise<CommitInfo> {
    try {
      const { branch = 'main', sha, author, committer } = options;

      const response = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: btoa(content), // Base64 encode content
        branch,
        sha,
        author,
        committer
      });

      return {
        sha: response.data.commit.sha || '',
        message: response.data.commit.message || '',
        author: {
          name: response.data.commit.author?.name || '',
          email: response.data.commit.author?.email || '',
          date: response.data.commit.author?.date || new Date().toISOString()
        },
        committer: {
          name: response.data.commit.committer?.name || '',
          email: response.data.commit.committer?.email || '',
          date: response.data.commit.committer?.date || new Date().toISOString()
        },
        url: response.data.commit.html_url || ''
      };
    } catch (error) {
      throw this.handleGitHubError(error, `Failed to write file ${path} to repository ${owner}/${repo}`, `${owner}/${repo}`);
    }
  }

  /**
   * Creates a commit with multiple file changes
   */
  async createCommit(
    owner: string,
    repo: string,
    message: string,
    files: Array<{
      path: string;
      content: string;
      mode?: '100644' | '100755' | '040000' | '160000' | '120000';
    }>,
    options: {
      branch?: string;
      author?: {
        name: string;
        email: string;
      };
      committer?: {
        name: string;
        email: string;
      };
    } = {}
  ): Promise<CommitInfo> {
    try {
      const { branch = 'main', author, committer } = options;

      // Get the current branch reference
      const refResponse = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
      });

      const currentCommitSha = refResponse.data.object.sha;

      // Get the current commit to get the tree SHA
      const commitResponse = await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha
      });

      const currentTreeSha = commitResponse.data.tree.sha;

      // Create tree with file changes
      const tree = files.map(file => ({
        path: file.path,
        mode: file.mode || '100644' as const,
        type: 'blob' as const,
        content: file.content
      }));

      const treeResponse = await this.octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentTreeSha,
        tree
      });

      // Create the commit
      const newCommitResponse = await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: treeResponse.data.sha,
        parents: [currentCommitSha],
        author,
        committer
      });

      // Update the branch reference
      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommitResponse.data.sha
      });

      return {
        sha: newCommitResponse.data.sha,
        message: newCommitResponse.data.message,
        author: {
          name: newCommitResponse.data.author.name,
          email: newCommitResponse.data.author.email,
          date: newCommitResponse.data.author.date
        },
        committer: {
          name: newCommitResponse.data.committer.name,
          email: newCommitResponse.data.committer.email,
          date: newCommitResponse.data.committer.date
        },
        url: newCommitResponse.data.html_url || ''
      };
    } catch (error) {
      throw this.handleGitHubError(error, `Failed to create commit in repository ${owner}/${repo}`, `${owner}/${repo}`);
    }
  }

  /**
   * Reads and validates repository configuration
   */
  async getRepositoryConfig(owner: string, repo: string, ref?: string): Promise<TranslationConfig> {
    try {
      const repositoryInfo: RepositoryInfo = {
        owner,
        repo,
        ref: ref || 'main'
      };

      const result = await this.configReader.readConfig(repositoryInfo);

      if (!result.success || !result.config) {
        throw new GitHubServiceError(
          `Invalid configuration in repository ${owner}/${repo}: ${result.errors.map(e => e.message).join(', ')}`,
          'INVALID_CONFIG',
          400,
          `${owner}/${repo}`
        );
      }

      return result.config;
    } catch (error) {
      if (error instanceof ConfigReaderError) {
        throw new GitHubServiceError(
          error.message,
          error.code,
          error.statusCode,
          `${owner}/${repo}`
        );
      }

      if (error instanceof GitHubServiceError) {
        throw error;
      }

      throw this.handleGitHubError(error, `Failed to read configuration from repository ${owner}/${repo}`, `${owner}/${repo}`);
    }
  }

  /**
   * Checks if repository has valid configuration
   */
  async hasValidConfig(owner: string, repo: string, ref?: string): Promise<boolean> {
    try {
      await this.getRepositoryConfig(owner, repo, ref);
      return true;
    } catch (error) {
      if (error instanceof GitHubServiceError && 
          (error.code === 'CONFIG_NOT_FOUND' || error.code === 'INVALID_CONFIG')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Lists repositories with valid i18n configuration
   */
  async listConfiguredRepositories(options: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<Array<GitHubRepository & { config: TranslationConfig }>> {
    const repositories = await this.listRepositories(options);
    const configuredRepos: Array<GitHubRepository & { config: TranslationConfig }> = [];

    // Check each repository for valid configuration
    for (const repo of repositories) {
      try {
        const config = await this.getRepositoryConfig(repo.owner.login, repo.name);
        configuredRepos.push({ ...repo, config });
      } catch (error) {
        // Skip repositories without valid configuration
        continue;
      }
    }

    return configuredRepos;
  }

  /**
   * Gets repository branches
   */
  async getBranches(owner: string, repo: string): Promise<Array<{ name: string; sha: string; protected: boolean }>> {
    try {
      const response = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });

      return response.data.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected
      }));
    } catch (error) {
      throw this.handleGitHubError(error, `Failed to get branches for repository ${owner}/${repo}`, `${owner}/${repo}`);
    }
  }

  /**
   * Clears configuration cache for a repository
   */
  clearConfigCache(owner?: string, repo?: string, ref?: string): void {
    if (owner && repo) {
      const repositoryInfo: RepositoryInfo = { owner, repo, ref };
      this.configReader.clearCache(repositoryInfo);
    } else {
      this.configReader.clearCache();
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.configReader.getCacheStats();
  }

  private handleGitHubError(error: unknown, message: string, repository?: string): GitHubServiceError {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = error.status as number;
      
      if (status === 404) {
        return new GitHubServiceError(
          `Resource not found: ${message}`,
          'NOT_FOUND',
          404,
          repository
        );
      }
      
      if (status === 403) {
        return new GitHubServiceError(
          `Access denied: ${message}`,
          'ACCESS_DENIED',
          403,
          repository
        );
      }
      
      if (status === 401) {
        return new GitHubServiceError(
          `Authentication failed: ${message}`,
          'AUTH_FAILED',
          401,
          repository
        );
      }
      
      if (status >= 500) {
        return new GitHubServiceError(
          `GitHub API server error: ${message}`,
          'SERVER_ERROR',
          status,
          repository
        );
      }

      if (status === 422) {
        return new GitHubServiceError(
          `Validation failed: ${message}`,
          'VALIDATION_FAILED',
          422,
          repository
        );
      }
    }

    return new GitHubServiceError(
      `${message}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN_ERROR',
      undefined,
      repository
    );
  }
}

/**
 * Creates a GitHub repository service with user authentication
 */
export function createGitHubService(user: User): GitHubRepositoryService {
  return new GitHubRepositoryService(user.accessToken);
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at?: string;
}

export interface CommitOptions {
  branch?: string;
  createPR?: boolean;
  prTitle?: string;
  prBody?: string;
  baseBranch?: string;
  author?: {
    name: string;
    email: string;
  };
  coAuthors?: Array<{
    name: string;
    email: string;
  }>;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Translation Bot Service
 * Handles automated commit creation and PR management for translations
 */
export class TranslationBotService {
  private readonly githubService: GitHubRepositoryService;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRetryDelay = 1000; // 1 second

  constructor(accessToken: string) {
    this.githubService = new GitHubRepositoryService(accessToken);
  }

  /**
   * Commits translation changes with proper co-author attribution
   */
  async commitTranslations(
    owner: string,
    repo: string,
    translations: Array<{
      filePath: string;
      content: string;
      language: string;
      keys: string[];
    }>,
    contributor: {
      name: string;
      email: string;
      username: string;
    },
    options: CommitOptions = {}
  ): Promise<CommitInfo | PullRequest> {
    const {
      branch = 'main',
      createPR = false,
      prTitle,
      prBody,
      baseBranch = 'main',
      author,
      coAuthors = [],
      retryAttempts = this.defaultRetryAttempts,
      retryDelay = this.defaultRetryDelay
    } = options;

    // Validate repository access
    const access = await this.githubService.validateRepositoryAccess(owner, repo);
    if (!access.hasAccess || !access.permissions.write) {
      throw new GitHubServiceError(
        `Insufficient permissions to commit to repository ${owner}/${repo}`,
        'ACCESS_DENIED',
        403,
        `${owner}/${repo}`
      );
    }

    // Get repository configuration for commit message templates
    const config = await this.githubService.getRepositoryConfig(owner, repo);

    // Prepare commit details
    const languages = [...new Set(translations.map(t => t.language))];
    const allKeys = [...new Set(translations.flatMap(t => t.keys))];
    
    const commitMessage = this.generateCommitMessage(
      config.settings?.commitMessageTemplate || 'feat(i18n): Add {language} translation for {keys}',
      languages,
      allKeys,
      contributor.username
    );

    // Prepare co-author attribution
    const allCoAuthors = [
      { name: contributor.name, email: contributor.email },
      ...coAuthors
    ];

    const commitMessageWithCoAuthors = this.addCoAuthors(commitMessage, allCoAuthors);

    // Prepare files for commit
    const files = translations.map(translation => ({
      path: translation.filePath,
      content: translation.content
    }));

    let lastError: Error | null = null;

    // Retry mechanism with exponential backoff
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        if (createPR) {
          return await this.createPullRequestWithTranslations(
            owner,
            repo,
            files,
            commitMessageWithCoAuthors,
            {
              prTitle: prTitle || this.generatePRTitle(config.settings?.prTitleTemplate || 'feat(i18n): Update {language} translations', languages),
              prBody: prBody || this.generatePRBody(translations, contributor),
              baseBranch,
              author: author || { name: contributor.name, email: contributor.email }
            }
          );
        } else {
          return await this.githubService.createCommit(
            owner,
            repo,
            commitMessageWithCoAuthors,
            files,
            {
              branch,
              author: author || { name: contributor.name, email: contributor.email }
            }
          );
        }
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof GitHubServiceError) {
          if (['ACCESS_DENIED', 'NOT_FOUND', 'VALIDATION_FAILED'].includes(error.code)) {
            throw error;
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retryAttempts) {
          await this.delay(retryDelay * Math.pow(2, attempt - 1));
        }
      }
    }

    // If all retries failed, throw the last error
    throw new GitHubServiceError(
      `Failed to commit translations after ${retryAttempts} attempts: ${lastError?.message}`,
      'COMMIT_FAILED',
      500,
      `${owner}/${repo}`
    );
  }

  /**
   * Creates a pull request with translation changes
   */
  private async createPullRequestWithTranslations(
    owner: string,
    repo: string,
    files: Array<{ path: string; content: string }>,
    commitMessage: string,
    options: {
      prTitle: string;
      prBody: string;
      baseBranch: string;
      author: { name: string; email: string };
    }
  ): Promise<PullRequest> {
    const { prTitle, prBody, baseBranch, author } = options;
    
    // Create a unique branch name for the PR
    const timestamp = Date.now();
    const branchName = `i18n-translations-${timestamp}`;

    try {
      // Create a new branch
      const baseRef = await this.githubService.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`
      });

      await this.githubService.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.data.object.sha
      });

      // Commit changes to the new branch
      await this.githubService.createCommit(
        owner,
        repo,
        commitMessage,
        files,
        {
          branch: branchName,
          author
        }
      );

      // Create pull request
      const prResponse = await this.githubService.octokit.rest.pulls.create({
        owner,
        repo,
        title: prTitle,
        body: prBody,
        head: branchName,
        base: baseBranch
      });

      return {
        id: prResponse.data.id,
        number: prResponse.data.number,
        title: prResponse.data.title,
        body: prResponse.data.body || '',
        state: prResponse.data.state as 'open' | 'closed' | 'merged',
        head: {
          ref: prResponse.data.head.ref,
          sha: prResponse.data.head.sha
        },
        base: {
          ref: prResponse.data.base.ref,
          sha: prResponse.data.base.sha
        },
        html_url: prResponse.data.html_url,
        created_at: prResponse.data.created_at,
        updated_at: prResponse.data.updated_at,
        merged_at: prResponse.data.merged_at || undefined
      };
    } catch (error) {
      // Clean up branch if PR creation failed
      try {
        await this.githubService.octokit.rest.git.deleteRef({
          owner,
          repo,
          ref: `heads/${branchName}`
        });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      throw new GitHubServiceError(
        `Failed to create pull request in repository ${owner}/${repo}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PR_CREATION_FAILED',
        undefined,
        `${owner}/${repo}`
      );
    }
  }

  /**
   * Generates commit message from template
   */
  private generateCommitMessage(
    template: string,
    languages: string[],
    keys: string[],
    contributor: string
  ): string {
    const languageList = languages.join(', ');
    const keyList = keys.length > 5 ? `${keys.slice(0, 5).join(', ')} and ${keys.length - 5} more` : keys.join(', ');
    
    return template
      .replace(/{languages?}/g, languageList)
      .replace(/{keys?}/g, keyList)
      .replace(/{contributor}/g, contributor)
      .replace(/{language}/g, languages[0] || 'unknown') // For backward compatibility
      .replace(/{key}/g, keys[0] || 'unknown'); // For backward compatibility
  }

  /**
   * Generates PR title from template
   */
  private generatePRTitle(template: string, languages: string[]): string {
    const languageList = languages.join(', ');
    
    return template
      .replace(/{languages?}/g, languageList)
      .replace(/{language}/g, languages[0] || 'unknown'); // For backward compatibility
  }

  /**
   * Generates PR body with translation details
   */
  private generatePRBody(
    translations: Array<{
      filePath: string;
      content: string;
      language: string;
      keys: string[];
    }>,
    contributor: { name: string; email: string; username: string }
  ): string {
    const languages = [...new Set(translations.map(t => t.language))];
    const totalKeys = translations.reduce((sum, t) => sum + t.keys.length, 0);
    
    let body = `## Translation Update\n\n`;
    body += `This PR contains translation updates contributed by @${contributor.username}.\n\n`;
    body += `### Summary\n`;
    body += `- **Languages**: ${languages.join(', ')}\n`;
    body += `- **Total keys updated**: ${totalKeys}\n`;
    body += `- **Files modified**: ${translations.length}\n\n`;
    
    body += `### Files Changed\n`;
    for (const translation of translations) {
      body += `- \`${translation.filePath}\` (${translation.language}): ${translation.keys.length} keys\n`;
    }
    
    body += `\n### Contributor\n`;
    body += `- **Name**: ${contributor.name}\n`;
    body += `- **Email**: ${contributor.email}\n`;
    body += `- **GitHub**: @${contributor.username}\n`;
    
    return body;
  }

  /**
   * Adds co-author attribution to commit message
   */
  private addCoAuthors(
    message: string,
    coAuthors: Array<{ name: string; email: string }>
  ): string {
    if (coAuthors.length === 0) {
      return message;
    }

    let messageWithCoAuthors = message;
    
    // Add co-authors in Git trailer format
    for (const coAuthor of coAuthors) {
      messageWithCoAuthors += `\n\nCo-authored-by: ${coAuthor.name} <${coAuthor.email}>`;
    }

    return messageWithCoAuthors;
  }

  /**
   * Utility method for delays in retry mechanism
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets pull request status
   */
  async getPullRequestStatus(owner: string, repo: string, prNumber: number): Promise<PullRequest> {
    try {
      const response = await this.githubService.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });

      return {
        id: response.data.id,
        number: response.data.number,
        title: response.data.title,
        body: response.data.body || '',
        state: response.data.state as 'open' | 'closed' | 'merged',
        head: {
          ref: response.data.head.ref,
          sha: response.data.head.sha
        },
        base: {
          ref: response.data.base.ref,
          sha: response.data.base.sha
        },
        html_url: response.data.html_url,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        merged_at: response.data.merged_at || undefined
      };
    } catch (error) {
      throw new GitHubServiceError(
        `Failed to get pull request ${prNumber} in repository ${owner}/${repo}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PR_GET_FAILED',
        undefined,
        `${owner}/${repo}`
      );
    }
  }

  /**
   * Lists pull requests for a repository
   */
  async listPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
      sort?: 'created' | 'updated' | 'popularity';
      direction?: 'asc' | 'desc';
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<PullRequest[]> {
    try {
      const response = await this.githubService.octokit.rest.pulls.list({
        owner,
        repo,
        ...options
      });

      return response.data.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state as 'open' | 'closed' | 'merged',
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha
        },
        base: {
          ref: pr.base.ref,
          sha: pr.base.sha
        },
        html_url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at || undefined
      }));
    } catch (error) {
      throw new GitHubServiceError(
        `Failed to list pull requests for repository ${owner}/${repo}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PR_LIST_FAILED',
        undefined,
        `${owner}/${repo}`
      );
    }
  }
}

/**
 * Creates a translation bot service with user authentication
 */
export function createTranslationBotService(user: User): TranslationBotService {
  return new TranslationBotService(user.accessToken);
}