/**
 * lib/auth.ts — JWT signing/verification + bcrypt password helpers.
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set.');
  return secret;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// ── JWT ───────────────────────────────────────────────────────────────────────

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, getJwtSecret()) as JWTPayload;
}

export function getAuthUser(req: NextRequest): JWTPayload | null {
  try {
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return null;
    return verifyToken(authHeader.slice(7).trim());
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): JWTPayload {
  const user = getAuthUser(req);
  if (!user) throw new AuthError('Unauthorized. Please log in.');
  return user;
}

// ── Admin guard ───────────────────────────────────────────────────────────────

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = 'Forbidden. Admin access required.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Verifies the request is authenticated AND the user has role = 'admin'.
 * Throws AuthError (401) if not authenticated, ForbiddenError (403) if not admin.
 * Requires a DB lookup — import queryOne inside the route to avoid circular deps.
 */
export async function requireAdmin(
  req: NextRequest,
  queryOne: <T>(sql: string, params?: unknown[]) => Promise<T | null>
): Promise<JWTPayload> {
  const authUser = requireAuth(req);
  const row = await queryOne<{ role: string }>(
    'SELECT role FROM users WHERE id = $1',
    [authUser.userId]
  );
  if (!row || row.role !== 'admin') throw new ForbiddenError();
  return authUser;
}

// ── Password ──────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

// ── Error ─────────────────────────────────────────────────────────────────────

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
