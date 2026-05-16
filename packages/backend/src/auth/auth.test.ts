/**
 * Unit tests for the auth service — token generation, refresh, and full login flow.
 * Complements auth.service.test.ts which covers lockout and password validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateTokens,
  refreshAccessToken,
  logout,
  logoutRefreshToken,
  isTokenBlacklisted,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  type JwtSigner,
  type TokenPayload,
} from './auth.service.js';
import { TokenBlacklistKeys, RedisTTL } from '../redis/keys.js';

// ─── Mocks ───────────────────────────────────────────────────────────────────

function createMockRedis() {
  const store = new Map<string, string>();

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, _mode?: string, _ttl?: number) => {
      store.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    incr: vi.fn(async (key: string) => {
      const current = parseInt(store.get(key) ?? '0', 10);
      const next = current + 1;
      store.set(key, String(next));
      return next;
    }),
    expire: vi.fn(async () => 1),
    _store: store,
  };
}

function createMockJwt(): JwtSigner {
  let counter = 0;
  return {
    sign: vi.fn((payload: Record<string, unknown>, _opts?: { expiresIn: number }) => {
      counter++;
      return `token-${counter}-${JSON.stringify(payload)}`;
    }),
    verify: vi.fn(<T>(token: string): T => {
      const match = token.match(/token-\d+-(.+)/);
      if (!match) throw new Error('Invalid token');
      return JSON.parse(match[1]!) as T;
    }),
    decode: vi.fn(<T>(token: string): T | null => {
      const match = token.match(/token-\d+-(.+)/);
      if (!match) return null;
      return JSON.parse(match[1]!) as T;
    }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Auth Service - Token Generation', () => {
  let jwt: JwtSigner;

  beforeEach(() => {
    jwt = createMockJwt();
  });

  it('should generate access and refresh tokens', () => {
    const user = { id: 'uuid-1', employeeId: 'EMP001', role: 'candidate' as const };
    const result = generateTokens(jwt, user);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(ACCESS_TOKEN_EXPIRY);
    expect(jwt.sign).toHaveBeenCalledTimes(2);
  });

  it('should include correct payload in access token', () => {
    const user = { id: 'uuid-1', employeeId: 'EMP001', role: 'candidate' as const };
    generateTokens(jwt, user);

    const signCall = (jwt.sign as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(signCall[0]).toMatchObject({
      sub: 'uuid-1',
      role: 'candidate',
      employeeId: 'EMP001',
    });
    expect(signCall[0].jti).toBeDefined();
    expect(signCall[1]).toEqual({ expiresIn: ACCESS_TOKEN_EXPIRY });
  });

  it('should include correct payload in refresh token', () => {
    const user = { id: 'uuid-2', employeeId: 'ADM001', role: 'administrator' as const };
    generateTokens(jwt, user);

    const signCall = (jwt.sign as ReturnType<typeof vi.fn>).mock.calls[1]!;
    expect(signCall[0]).toMatchObject({
      sub: 'uuid-2',
      role: 'administrator',
      employeeId: 'ADM001',
    });
    expect(signCall[1]).toEqual({ expiresIn: REFRESH_TOKEN_EXPIRY });
  });

  it('should generate unique JTIs for access and refresh tokens', () => {
    const user = { id: 'uuid-1', employeeId: 'EMP001', role: 'candidate' as const };
    generateTokens(jwt, user);

    const accessPayload = (jwt.sign as ReturnType<typeof vi.fn>).mock.calls[0]![0] as TokenPayload;
    const refreshPayload = (jwt.sign as ReturnType<typeof vi.fn>).mock.calls[1]![0] as TokenPayload;
    expect(accessPayload.jti).not.toBe(refreshPayload.jti);
  });
});

describe('Auth Service - Token Refresh', () => {
  let jwt: JwtSigner;
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    jwt = createMockJwt();
    redis = createMockRedis();
  });

  it('should return new access token for valid refresh token', async () => {
    const payload: TokenPayload = { sub: 'uuid-1', role: 'candidate', employeeId: 'EMP001', jti: 'refresh-jti-1' };
    const refreshToken = `token-1-${JSON.stringify(payload)}`;

    const result = await refreshAccessToken(jwt, redis as any, refreshToken);

    expect(result).not.toBeNull();
    expect(result!.accessToken).toBeDefined();
    expect(result!.expiresIn).toBe(ACCESS_TOKEN_EXPIRY);
  });

  it('should return null for blacklisted refresh token', async () => {
    const payload: TokenPayload = { sub: 'uuid-1', role: 'candidate', employeeId: 'EMP001', jti: 'blacklisted-jti' };
    const refreshToken = `token-1-${JSON.stringify(payload)}`;

    redis._store.set(TokenBlacklistKeys.entry('blacklisted-jti'), '1');

    const result = await refreshAccessToken(jwt, redis as any, refreshToken);
    expect(result).toBeNull();
  });

  it('should return null for invalid refresh token', async () => {
    (jwt.verify as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Invalid token');
    });

    const result = await refreshAccessToken(jwt, redis as any, 'invalid-token');
    expect(result).toBeNull();
  });
});

describe('Auth Service - Logout and Token Blacklisting', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  it('should blacklist access token JTI on logout', async () => {
    await logout(redis as any, 'access-jti-1');

    expect(redis.set).toHaveBeenCalledWith(
      TokenBlacklistKeys.entry('access-jti-1'),
      '1',
      'EX',
      RedisTTL.TOKEN_BLACKLIST
    );
  });

  it('should blacklist refresh token JTI with longer TTL', async () => {
    await logoutRefreshToken(redis as any, 'refresh-jti-1');

    expect(redis.set).toHaveBeenCalledWith(
      TokenBlacklistKeys.entry('refresh-jti-1'),
      '1',
      'EX',
      REFRESH_TOKEN_EXPIRY
    );
  });

  it('should detect blacklisted token', async () => {
    redis._store.set(TokenBlacklistKeys.entry('blacklisted-jti'), '1');

    const result = await isTokenBlacklisted(redis as any, 'blacklisted-jti');
    expect(result).toBe(true);
  });

  it('should return false for non-blacklisted token', async () => {
    const result = await isTokenBlacklisted(redis as any, 'valid-jti');
    expect(result).toBe(false);
  });
});
