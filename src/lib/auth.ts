import { Context } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  username: string;
  githubId: number;
  accessToken?: string;
}

export function createJWT(user: { id: string; username: string; githubId: number }, accessToken: string, secret: string): string {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username, 
      githubId: user.githubId,
      accessToken
    },
    secret,
    { expiresIn: '24h' }
  );
}

export async function verifyJWT(token: string, secret: string): Promise<AuthPayload | null> {
  try {
    return jwt.verify(token, secret) as AuthPayload;
  } catch {
    return null;
  }
}

export function extractToken(c: Context): string | undefined {
  const cookieToken = getCookie(c, 'auth_token');
  if (cookieToken) return cookieToken;
  
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return undefined;
}

export async function requireAuth(c: Context, secret: string): Promise<AuthPayload | Response> {
  const token = extractToken(c);
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload = await verifyJWT(token, secret);
  if (!payload) {
    deleteCookie(c, 'auth_token');
    return c.json({ error: 'Invalid token' }, 401);
  }

  return payload;
}
