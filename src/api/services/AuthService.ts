/**
 * Authentication service for GitHub OAuth flow
 */

import { createOAuthAppAuth, type OAuthAppAuthInterface } from '@octokit/auth-oauth-app';
import { Octokit } from '@octokit/rest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { 
  GitHubOAuthConfig, 
  OAuthState, 
  GitHubUserProfile, 
  User, 
  AuthSession,
  JWTPayload,
  UserRepository,
  SessionStore
} from '@/lib/types/User.js';

export class AuthService {
  private oauthApp: OAuthAppAuthInterface;
  private jwtSecret: string;
  private userRepository: UserRepository;
  private sessionStore: SessionStore;
  private config: GitHubOAuthConfig;

  constructor(
    config: GitHubOAuthConfig,
    jwtSecret: string,
    userRepository: UserRepository,
    sessionStore: SessionStore
  ) {
    this.config = config;
    this.jwtSecret = jwtSecret;
    this.userRepository = userRepository;
    this.sessionStore = sessionStore;
    
    this.oauthApp = createOAuthAppAuth({
      clientType: 'oauth-app',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
  }

  /**
   * Generate OAuth authorization URL with state parameter
   */
  generateAuthUrl(redirectUrl?: string): { url: string; state: string } {
    const state = crypto.randomBytes(32).toString('hex');
    const stateData: OAuthState = {
      state,
      redirectUrl,
      timestamp: Date.now()
    };

    // Store state temporarily (in production, use Redis or similar)
    this.storeOAuthState(state, stateData);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'user:email',
      state,
      allow_signup: 'true'
    });

    return {
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
      state
    };
  }

  /**
   * Handle OAuth callback and exchange code for access token
   */
  async handleCallback(code: string, state: string): Promise<{ user: User; token: string }> {
    // Validate state parameter
    const stateData = this.getOAuthState(state);
    if (!stateData || Date.now() - stateData.timestamp > 600000) { // 10 minutes
      throw new Error('Invalid or expired OAuth state');
    }

    try {
      // Exchange code for access token
      const auth = await this.oauthApp({
        type: 'oauth-user',
        code,
        state,
      });
      const token = auth.token;

      // Get user profile from GitHub
      const octokit = new Octokit({ auth: token });
      const { data: profile } = await octokit.rest.users.getAuthenticated();
      
      // Get user email if not public
      let email = profile.email;
      if (!email) {
        const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
        const primaryEmail = emails.find(e => e.primary);
        email = primaryEmail?.email || '';
      }

      const githubProfile: GitHubUserProfile = {
        id: profile.id,
        login: profile.login,
        email,
        avatar_url: profile.avatar_url,
        name: profile.name || undefined
      };

      // Find or create user
      let user = await this.userRepository.findByGithubId(githubProfile.id);
      
      if (!user) {
        user = await this.userRepository.create({
          githubId: githubProfile.id,
          username: githubProfile.login,
          email: githubProfile.email,
          avatarUrl: githubProfile.avatar_url,
          accessToken: this.encryptToken(token),
          preferences: {
            language: 'en',
            theme: 'auto',
            autoSave: true,
            notifications: true
          }
        });
      } else {
        // Update existing user
        user = await this.userRepository.update(user.id, {
          username: githubProfile.login,
          email: githubProfile.email,
          avatarUrl: githubProfile.avatar_url,
          accessToken: this.encryptToken(token)
        });
      }

      // Create session
      const session: AuthSession = {
        userId: user.id,
        username: user.username,
        githubId: user.githubId,
        accessToken: token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date()
      };

      await this.sessionStore.create(session);

      // Generate JWT token
      const jwtToken = this.generateJWT(user);

      // Clean up OAuth state
      this.deleteOAuthState(state);

      return { user, token: jwtToken };
    } catch (error) {
      this.deleteOAuthState(state);
      throw new Error(`OAuth callback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate JWT token and return user session
   */
  async validateToken(token: string): Promise<AuthSession | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Check if session exists and is valid
      const session = await this.sessionStore.get(payload.userId);
      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      // Update last active
      await this.userRepository.updateLastActive(payload.userId);

      return session;
    } catch (error) {
      return null;
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(userId: string): Promise<void> {
    await this.sessionStore.delete(userId);
  }

  /**
   * Generate JWT token for user
   */
  private generateJWT(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      githubId: user.githubId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * Encrypt access token for storage
   */
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.jwtSecret, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }



  // Temporary in-memory storage for OAuth states (use Redis in production)
  private oauthStates = new Map<string, OAuthState>();

  private storeOAuthState(state: string, data: OAuthState): void {
    this.oauthStates.set(state, data);
    
    // Clean up expired states
    setTimeout(() => {
      this.oauthStates.delete(state);
    }, 600000); // 10 minutes
  }

  private getOAuthState(state: string): OAuthState | undefined {
    return this.oauthStates.get(state);
  }

  private deleteOAuthState(state: string): void {
    this.oauthStates.delete(state);
  }
}