import { Context } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';
import { createMiddleware } from 'hono/factory';
import { verifyGitHubOIDCToken } from '../oidc';

export interface AuthPayload {
  userId: string;
  username: string;
  githubId: number;
  accessToken?: string;
  repository?: string;
  actor?: string;
  workflow?: string;
}

const toKey = (secret: string) => new TextEncoder().encode(secret);

export async function createJWT(
  user: { id: string; username: string; githubId: number },
  accessToken: string,
  secret: string
): Promise<string> {
  return await new SignJWT({
    userId: user.id,
    username: user.username,
    githubId: user.githubId,
    accessToken
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(toKey(secret));
}

export async function verifyJWT(token: string, secret: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, toKey(secret));
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export const extractToken = (c: Context): string | undefined => {
  const cookieToken = getCookie(c, 'auth_token');
  if (cookieToken) return cookieToken;

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return undefined;
};

type Env = {
  Variables: {
    user: AuthPayload;
  };
  Bindings: {
    JWT_SECRET: string;
    PLATFORM_URL?: string;
  };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const token = extractToken(c);
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const secret = c.env.JWT_SECRET;
  let payload = await verifyJWT(token, secret);

  if (!payload) {
    try {
      const platformUrl = c.env.PLATFORM_URL || 'https://koro.f3liz.workers.dev';
      // We don't know the repository yet, so we can't validate it here strictly against a project
      // But we verify the token is valid from GitHub.
      // The route handler should check if the repository matches the project.
      const oidc = await verifyGitHubOIDCToken(token, platformUrl, undefined, c.env.JWKS_CACHE);
      payload = {
        userId: 'oidc-user',
        username: oidc.actor,
        githubId: 0,
        repository: oidc.repository,
        actor: oidc.actor,
        workflow: oidc.workflow,
      };
    } catch (e) {
      // Ignore
    }
  }

  if (!payload) {
    deleteCookie(c, 'auth_token');
    return c.json({ error: 'Invalid token' }, 401);
  }

  c.set('user', payload);
  await next();
});
