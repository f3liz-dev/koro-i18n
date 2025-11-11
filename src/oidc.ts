import { importJWK, jwtVerify, decodeProtectedHeader } from 'jose';
import type { JWK } from 'jose';

export interface GitHubOIDCToken {
  repository: string;
  repository_owner: string;
  ref: string;
  sha: string;
  workflow: string;
  actor: string;
  run_id: string;
}

// Cache for JWKS to avoid repeated fetches
let jwksCache: { keys: JWK[], timestamp: number } | null = null;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

async function fetchGitHubJWKS(): Promise<{ keys: JWK[] }> {
  // Return cached JWKS if still valid
  if (jwksCache && Date.now() - jwksCache.timestamp < CACHE_TTL) {
    return jwksCache;
  }

  const response = await fetch('https://token.actions.githubusercontent.com/.well-known/jwks');
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
  }
  
  const jwks = await response.json() as { keys: JWK[] };
  
  // Cache the JWKS
  jwksCache = {
    keys: jwks.keys,
    timestamp: Date.now()
  };
  
  return jwks;
}

async function findMatchingKey(kid: string | undefined, alg: string): Promise<JWK> {
  const jwks = await fetchGitHubJWKS();
  
  // Find key by kid (Key ID) and alg (Algorithm)
  const key = jwks.keys.find(k => {
    if (kid && k.kid !== kid) return false;
    if (k.alg && k.alg !== alg) return false;
    return true;
  });
  
  if (!key) {
    throw new Error(`No matching key found for kid: ${kid}, alg: ${alg}`);
  }
  
  return key;
}

export async function verifyGitHubOIDCToken(
  token: string,
  expectedAudience?: string,
  expectedRepo?: string
): Promise<GitHubOIDCToken> {
  try {
    // Decode the header to get kid and alg
    const header = decodeProtectedHeader(token);
    const { kid, alg } = header;
    
    if (!alg) {
      throw new Error('Token header missing "alg" field');
    }
    
    // Find the matching key from JWKS
    const jwk = await findMatchingKey(kid, alg);
    
    // Import the JWK as a CryptoKey - this approach is compatible with Cloudflare Workers
    const publicKey = await importJWK(jwk, alg);
    
    const verifyOptions: any = {
      issuer: 'https://token.actions.githubusercontent.com',
    };
    
    // Only add audience check if provided
    if (expectedAudience) {
      verifyOptions.audience = expectedAudience;
    }
    
    // Verify the JWT using the imported public key
    const { payload } = await jwtVerify(token, publicKey, verifyOptions);

    const oidcPayload = payload as unknown as GitHubOIDCToken;

    if (expectedRepo && oidcPayload.repository !== expectedRepo) {
      throw new Error(`Repository mismatch: expected ${expectedRepo}, got ${oidcPayload.repository}`);
    }

    return oidcPayload;
  } catch (error) {
    // Provide more context in error messages
    if (error instanceof Error) {
      throw new Error(`GitHub OIDC token verification failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Middleware to validate OIDC token for uploads
 * 
 * Usage in workers.ts:
 * 
 * ```typescript
 * app.post('/api/projects/upload', async (c) => {
 *   const token = c.req.header('Authorization')?.replace('Bearer ', '');
 *   
 *   try {
 *     const oidcPayload = await verifyGitHubOIDCToken(
 *       token,
 *       'https://i18n-platform.workers.dev'
 *     );
 *     
 *     // Use repository from token
 *     const projectId = oidcPayload.repository;
 *     
 *     // Process upload...
 *   } catch (error) {
 *     return c.json({ error: 'Invalid OIDC token' }, 401);
 *   }
 * });
 * ```
 */

/**
 * Example GitHub Actions workflow using OIDC:
 * 
 * ```yaml
 * name: Upload Translations
 * 
 * on:
 *   push:
 *     branches: [main]
 * 
 * permissions:
 *   id-token: write  # Required for OIDC
 *   contents: read
 * 
 * jobs:
 *   upload:
 *     runs-on: ubuntu-latest
 *     steps:
 *       - uses: actions/checkout@v4
 *       
 *       - name: Get OIDC Token
 *         id: oidc
 *         run: |
 *           TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
 *             "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=https://i18n-platform.workers.dev" | jq -r .value)
 *           echo "token=$TOKEN" >> $GITHUB_OUTPUT
 *       
 *       - name: Upload translations
 *         run: |
 *           npx @i18n-platform/client upload \
 *             --oidc-token "${{ steps.oidc.outputs.token }}" \
 *             --platform-url https://i18n-platform.workers.dev
 * ```
 */

/**
 * Comparison: API Keys vs OIDC
 * 
 * API Keys:
 * ✓ Simple setup (generate key, add to secrets)
 * ✓ Works everywhere (GitHub Actions, local dev, CI/CD)
 * ✓ No workflow changes needed
 * ✗ Long-lived secrets to manage
 * ✗ Manual revocation needed if compromised
 * ✗ Stored in GitHub secrets
 * 
 * OIDC:
 * ✓ No static secrets
 * ✓ Tokens expire in 10 minutes
 * ✓ Automatic repository verification
 * ✓ Industry standard
 * ✗ More complex setup
 * ✗ Requires workflow changes
 * ✗ Only works in GitHub Actions
 * ✗ Requires JWT signature verification library
 * 
 * Recommendation:
 * - Start with API keys (simpler, works everywhere)
 * - Migrate to OIDC later for enhanced security
 * - Support both methods for flexibility
 */

export const OIDCComplexity = {
  setup: 'Medium - Requires workflow changes and permissions',
  implementation: 'High - Needs JWT verification library for Workers',
  userExperience: 'Medium - More steps in workflow setup',
  security: 'Excellent - No static secrets, short-lived tokens',
  flexibility: 'Low - Only works in GitHub Actions',
  maintenance: 'Low - No key rotation needed',
};
