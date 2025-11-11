import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyGitHubOIDCToken, clearJWKSCache } from './oidc';
import { SignJWT, generateKeyPair } from 'jose';

describe('GitHub OIDC Token Verification', () => {
  let mockKeyPair: { publicKey: any; privateKey: any };
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    // Generate a test RSA key pair
    mockKeyPair = await generateKeyPair('RS256');
    originalFetch = globalThis.fetch;
    
    // Clear the JWKS cache before each test
    clearJWKSCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const createMockOIDCToken = async (payload: any, kid = 'test-kid') => {
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuedAt()
      .setIssuer('https://token.actions.githubusercontent.com')
      .setAudience('https://test-platform.workers.dev')
      .setExpirationTime('10m')
      .sign(mockKeyPair.privateKey);

    return jwt;
  };

  const setupMockJWKS = async (kid = 'test-kid') => {
    // Export public key as JWK immediately
    const { exportJWK } = await import('jose');
    const publicKeyJWK = await exportJWK(mockKeyPair.publicKey);
    
    globalThis.fetch = vi.fn(async (url: string | Request | URL) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString.includes('/.well-known/jwks')) {
        return new Response(
          JSON.stringify({
            keys: [
              {
                ...publicKeyJWK,
                kid,
                alg: 'RS256',
                use: 'sig',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      return new Response('Not Found', { status: 404 });
    }) as any;
  };

  it('should verify a valid GitHub OIDC token', async () => {
    await setupMockJWKS();

    const payload = {
      repository: 'owner/repo',
      repository_owner: 'owner',
      ref: 'refs/heads/main',
      sha: 'abc123',
      workflow: 'CI',
      actor: 'testuser',
      run_id: '12345',
    };

    const token = await createMockOIDCToken(payload);

    const result = await verifyGitHubOIDCToken(
      token,
      'https://test-platform.workers.dev'
    );

    expect(result.repository).toBe('owner/repo');
    expect(result.repository_owner).toBe('owner');
    expect(result.actor).toBe('testuser');
  });

  it('should verify token with expected repository', async () => {
    await setupMockJWKS();

    const payload = {
      repository: 'owner/repo',
      repository_owner: 'owner',
      ref: 'refs/heads/main',
      sha: 'abc123',
      workflow: 'CI',
      actor: 'testuser',
      run_id: '12345',
    };

    const token = await createMockOIDCToken(payload);

    const result = await verifyGitHubOIDCToken(
      token,
      'https://test-platform.workers.dev',
      'owner/repo'
    );

    expect(result.repository).toBe('owner/repo');
  });

  it('should reject token with mismatched repository', async () => {
    await setupMockJWKS();

    const payload = {
      repository: 'owner/repo',
      repository_owner: 'owner',
      ref: 'refs/heads/main',
      sha: 'abc123',
      workflow: 'CI',
      actor: 'testuser',
      run_id: '12345',
    };

    const token = await createMockOIDCToken(payload);

    await expect(
      verifyGitHubOIDCToken(
        token,
        'https://test-platform.workers.dev',
        'different/repo'
      )
    ).rejects.toThrow('Repository mismatch');
  });

  it('should reject token with invalid signature', async () => {
    await setupMockJWKS();

    // Create token with different key pair
    const differentKeyPair = await generateKeyPair('RS256');
    const payload = {
      repository: 'owner/repo',
      repository_owner: 'owner',
      ref: 'refs/heads/main',
      sha: 'abc123',
      workflow: 'CI',
      actor: 'testuser',
      run_id: '12345',
    };

    const invalidToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
      .setIssuedAt()
      .setIssuer('https://token.actions.githubusercontent.com')
      .setAudience('https://test-platform.workers.dev')
      .setExpirationTime('10m')
      .sign(differentKeyPair.privateKey);

    await expect(
      verifyGitHubOIDCToken(
        invalidToken,
        'https://test-platform.workers.dev'
      )
    ).rejects.toThrow();
  });

  it('should handle JWKS fetch failure', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response('Server Error', { status: 500 });
    }) as any;

    // Create a valid token structure that will try to fetch JWKS
    const payload = {
      repository: 'owner/repo',
      repository_owner: 'owner',
      ref: 'refs/heads/main',
      sha: 'abc123',
      workflow: 'CI',
      actor: 'testuser',
      run_id: '12345',
    };

    const token = await createMockOIDCToken(payload);

    await expect(
      verifyGitHubOIDCToken(token, 'https://test-platform.workers.dev')
    ).rejects.toThrow('Failed to fetch JWKS');
  });

  it('should handle token without kid', async () => {
    await setupMockJWKS('test-kid');

    const payload = {
      repository: 'owner/repo',
      repository_owner: 'owner',
      ref: 'refs/heads/main',
      sha: 'abc123',
      workflow: 'CI',
      actor: 'testuser',
      run_id: '12345',
    };

    // Create token without kid
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer('https://token.actions.githubusercontent.com')
      .setAudience('https://test-platform.workers.dev')
      .setExpirationTime('10m')
      .sign(mockKeyPair.privateKey);

    const result = await verifyGitHubOIDCToken(
      token,
      'https://test-platform.workers.dev'
    );

    expect(result.repository).toBe('owner/repo');
  });

  it('should cache JWKS to reduce requests', async () => {
    const { exportJWK } = await import('jose');
    const publicKeyJWK = await exportJWK(mockKeyPair.publicKey);
    
    const fetchSpy = vi.fn(async (url: string | Request | URL) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString.includes('/.well-known/jwks')) {
        return new Response(
          JSON.stringify({
            keys: [
              {
                ...publicKeyJWK,
                kid: 'test-kid',
                alg: 'RS256',
                use: 'sig',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      return new Response('Not Found', { status: 404 });
    });

    globalThis.fetch = fetchSpy as any;

    const payload = {
      repository: 'owner/repo',
      repository_owner: 'owner',
      ref: 'refs/heads/main',
      sha: 'abc123',
      workflow: 'CI',
      actor: 'testuser',
      run_id: '12345',
    };

    const token1 = await createMockOIDCToken(payload);
    const token2 = await createMockOIDCToken(payload);

    // First verification should fetch JWKS
    await verifyGitHubOIDCToken(token1, 'https://test-platform.workers.dev');
    
    // Second verification should use cached JWKS
    await verifyGitHubOIDCToken(token2, 'https://test-platform.workers.dev');

    // Should only fetch JWKS once due to caching
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
