import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface GitHubOIDCToken {
  repository: string;
  repository_owner: string;
  ref: string;
  sha: string;
  workflow: string;
  actor: string;
  run_id: string;
}

export async function verifyGitHubOIDCToken(
  token: string,
  expectedAudience?: string,
  expectedRepo?: string
): Promise<GitHubOIDCToken> {
  // Create JWKS inside the function to ensure compatibility with Cloudflare Workers
  const JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
  
  const verifyOptions: any = {
    issuer: 'https://token.actions.githubusercontent.com',
  };
  
  // Only add audience check if provided
  if (expectedAudience) {
    verifyOptions.audience = expectedAudience;
  }
  
  const { payload } = await jwtVerify(token, JWKS, verifyOptions);

  const oidcPayload = payload as unknown as GitHubOIDCToken;

  if (expectedRepo && oidcPayload.repository !== expectedRepo) {
    throw new Error(`Repository mismatch: expected ${expectedRepo}, got ${oidcPayload.repository}`);
  }

  return oidcPayload;
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
