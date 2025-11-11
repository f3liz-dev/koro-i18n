import { Context } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';

export interface AuthPayload {
  userId: string;
  username: string;
  githubId: number;
  accessToken?: string;
}

export async function createJWT(user: { id: string; username: string; githubId: number }, accessToken: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);
  
  return await new SignJWT({ 
    userId: user.id, 
    username: user.username, 
    githubId: user.githubId,
    accessToken
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
}

export async function verifyJWT(token: string, secret: string): Promise<AuthPayload | null> {
  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);
    
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as AuthPayload;
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
