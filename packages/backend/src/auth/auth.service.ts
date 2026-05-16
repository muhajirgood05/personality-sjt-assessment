/**
 * Authentication service handling credential validation, token management,
 * account lockout, and session invalidation.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { LoginAttemptKeys, TokenBlacklistKeys, RedisTTL } from '../redis/keys.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum consecutive failed login attempts before lockout */
export const MAX_FAILED_ATTEMPTS = 3;

/** Lockout duration in seconds (15 minutes) */
export const LOCKOUT_DURATION_SECONDS = RedisTTL.ACCOUNT_LOCKOUT;

/** Access token expiry in seconds (1 hour) */
export const ACCESS_TOKEN_EXPIRY = 3600;

/** Refresh token expiry in seconds (7 days) */
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 3600;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TokenPayload {
  sub: string;
  role: 'administrator' | 'candidate';
  employeeId: string;
  jti: string;
}

export interface LockoutResult {
  locked: boolean;
  remainingSeconds: number;
  lockedUntil: number | null;
}

export interface IncrementResult {
  locked: boolean;
  remainingSeconds: number;
  lockedUntil: number | null;
}

export interface JwtSigner {
  sign(payload: Record<string, unknown>, options?: { expiresIn: number }): string;
  verify<T = TokenPayload>(token: string): T;
  decode<T = TokenPayload>(token: string): T | null;
}

// ─── Lockout Functions ───────────────────────────────────────────────────────

/**
 * Check if an account is currently locked out.
 */
export async function checkLockout(redis: Redis, employeeId: string): Promise<LockoutResult> {
  const lockedUntilStr = await redis.get(LoginAttemptKeys.lockedUntil(employeeId));

  if (!lockedUntilStr) {
    return { locked: false, remainingSeconds: 0, lockedUntil: null };
  }

  const lockedUntil = parseInt(lockedUntilStr, 10);
  const now = Date.now();

  if (now >= lockedUntil) {
    // Lockout has expired, clean up
    await resetFailedAttempts(redis, employeeId);
    return { locked: false, remainingSeconds: 0, lockedUntil: null };
  }

  const remainingSeconds = Math.ceil((lockedUntil - now) / 1000);
  return {
    locked: true,
    remainingSeconds,
    lockedUntil,
  };
}

/**
 * Increment the failed login attempt counter.
 * Locks the account if MAX_FAILED_ATTEMPTS is reached.
 */
export async function incrementFailedAttempts(redis: Redis, employeeId: string): Promise<IncrementResult> {
  const counterKey = LoginAttemptKeys.counter(employeeId);
  const attempts = await redis.incr(counterKey);

  // Set TTL on first attempt only
  if (attempts === 1) {
    await redis.expire(counterKey, RedisTTL.LOGIN_ATTEMPT_WINDOW);
  }

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
    await redis.set(
      LoginAttemptKeys.lockedUntil(employeeId),
      lockedUntil.toString(),
      'EX',
      LOCKOUT_DURATION_SECONDS
    );
    return { locked: true, remainingSeconds: LOCKOUT_DURATION_SECONDS, lockedUntil };
  }

  return { locked: false, remainingSeconds: 0, lockedUntil: null };
}

/**
 * Reset failed login attempts after successful login.
 */
export async function resetFailedAttempts(redis: Redis, employeeId: string): Promise<void> {
  await redis.del(LoginAttemptKeys.counter(employeeId));
  await redis.del(LoginAttemptKeys.lockedUntil(employeeId));
}

// ─── Password Validation ─────────────────────────────────────────────────────

/**
 * Validate a plaintext password against a bcrypt hash.
 */
export async function validatePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Token Management ────────────────────────────────────────────────────────

/**
 * Generate access and refresh token pair.
 */
export function generateTokens(
  jwt: JwtSigner,
  user: { id: string; employeeId: string; role: 'administrator' | 'candidate' }
): { accessToken: string; refreshToken: string; expiresIn: number } {
  const accessJti = randomUUID();
  const refreshJti = randomUUID();

  const accessToken = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      employeeId: user.employeeId,
      jti: accessJti,
    },
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      employeeId: user.employeeId,
      jti: refreshJti,
    },
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

/**
 * Refresh an access token using a valid refresh token.
 * Returns a new access token if the refresh token is valid and not blacklisted.
 */
export async function refreshAccessToken(
  jwt: JwtSigner,
  redis: Redis,
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  let payload: TokenPayload;
  try {
    payload = jwt.verify<TokenPayload>(refreshToken);
  } catch {
    return null;
  }

  // Check if refresh token is blacklisted
  const isBlacklisted = await redis.get(TokenBlacklistKeys.entry(payload.jti));
  if (isBlacklisted) {
    return null;
  }

  const jti = randomUUID();
  const accessToken = jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      employeeId: payload.employeeId,
      jti,
    },
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

/**
 * Logout: blacklist a token by its JTI.
 */
export async function logout(redis: Redis, jti: string): Promise<void> {
  await redis.set(
    TokenBlacklistKeys.entry(jti),
    '1',
    'EX',
    RedisTTL.TOKEN_BLACKLIST
  );
}

/**
 * Blacklist a refresh token (longer TTL).
 */
export async function logoutRefreshToken(redis: Redis, jti: string): Promise<void> {
  await redis.set(
    TokenBlacklistKeys.entry(jti),
    '1',
    'EX',
    REFRESH_TOKEN_EXPIRY
  );
}

/**
 * Check if a token's JTI is blacklisted.
 */
export async function isTokenBlacklisted(redis: Redis, jti: string): Promise<boolean> {
  const result = await redis.get(TokenBlacklistKeys.entry(jti));
  return result !== null;
}
