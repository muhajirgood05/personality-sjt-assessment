/**
 * Unit tests for auth service — lockout logic, password validation, token blacklisting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkLockout,
  incrementFailedAttempts,
  resetFailedAttempts,
  validatePassword,
  logout,
  isTokenBlacklisted,
} from './auth.service.js';
import { LoginAttemptKeys, TokenBlacklistKeys, RedisTTL } from '../redis/keys.js';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

import bcrypt from 'bcrypt';

/**
 * Create a mock Redis client for testing.
 */
function createMockRedis() {
  const store = new Map<string, { value: string; ttl?: number }>();

  return {
    get: vi.fn(async (key: string) => {
      const entry = store.get(key);
      return entry ? entry.value : null;
    }),
    set: vi.fn(async (key: string, value: string, _mode?: string, ttl?: number) => {
      store.set(key, { value, ttl });
      return 'OK';
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    incr: vi.fn(async (key: string) => {
      const entry = store.get(key);
      const current = entry ? parseInt(entry.value, 10) : 0;
      const next = current + 1;
      store.set(key, { value: next.toString(), ttl: entry?.ttl });
      return next;
    }),
    expire: vi.fn(async (_key: string, _ttl: number) => {
      return 1;
    }),
    _store: store,
  } as unknown as ReturnType<typeof createMockRedis>;
}

type MockRedis = ReturnType<typeof createMockRedis>;

describe('Auth Service - Lockout Logic', () => {
  let redis: MockRedis;

  beforeEach(() => {
    redis = createMockRedis();
    vi.clearAllMocks();
  });

  describe('checkLockout', () => {
    it('should return not locked when no lockout key exists', async () => {
      const result = await checkLockout(redis as any, 'EMP001');
      expect(result.locked).toBe(false);
      expect(result.remainingSeconds).toBe(0);
      expect(result.lockedUntil).toBeNull();
    });

    it('should return locked with remaining seconds when lockout is active', async () => {
      const futureTime = Date.now() + 600_000; // 10 minutes from now
      (redis as any)._store.set(
        LoginAttemptKeys.lockedUntil('EMP001'),
        { value: futureTime.toString() }
      );

      const result = await checkLockout(redis as any, 'EMP001');
      expect(result.locked).toBe(true);
      expect(result.remainingSeconds).toBeGreaterThan(0);
      expect(result.remainingSeconds).toBeLessThanOrEqual(600);
      expect(result.lockedUntil).toBe(futureTime);
    });

    it('should return not locked and clean up when lockout has expired', async () => {
      const pastTime = Date.now() - 1000; // 1 second ago
      (redis as any)._store.set(
        LoginAttemptKeys.lockedUntil('EMP001'),
        { value: pastTime.toString() }
      );

      const result = await checkLockout(redis as any, 'EMP001');
      expect(result.locked).toBe(false);
      expect(result.remainingSeconds).toBe(0);
      // Should have cleaned up the keys
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment counter and not lock on first attempt', async () => {
      const result = await incrementFailedAttempts(redis as any, 'EMP001');
      expect(result.locked).toBe(false);
      expect(redis.incr).toHaveBeenCalledWith(LoginAttemptKeys.counter('EMP001'));
      expect(redis.expire).toHaveBeenCalledWith(
        LoginAttemptKeys.counter('EMP001'),
        RedisTTL.LOGIN_ATTEMPT_WINDOW
      );
    });

    it('should not lock on second attempt', async () => {
      // First attempt
      await incrementFailedAttempts(redis as any, 'EMP001');
      // Second attempt
      const result = await incrementFailedAttempts(redis as any, 'EMP001');
      expect(result.locked).toBe(false);
    });

    it('should lock account on third failed attempt', async () => {
      // First two attempts
      await incrementFailedAttempts(redis as any, 'EMP001');
      await incrementFailedAttempts(redis as any, 'EMP001');
      // Third attempt should trigger lockout
      const result = await incrementFailedAttempts(redis as any, 'EMP001');
      expect(result.locked).toBe(true);
      expect(result.remainingSeconds).toBe(RedisTTL.ACCOUNT_LOCKOUT);
      expect(result.lockedUntil).not.toBeNull();
    });

    it('should set TTL on counter only on first attempt', async () => {
      await incrementFailedAttempts(redis as any, 'EMP001');
      expect(redis.expire).toHaveBeenCalledTimes(1);

      await incrementFailedAttempts(redis as any, 'EMP001');
      // expire should not be called again (counter > 1)
      expect(redis.expire).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetFailedAttempts', () => {
    it('should delete both counter and lockout keys', async () => {
      await resetFailedAttempts(redis as any, 'EMP001');
      expect(redis.del).toHaveBeenCalledWith(LoginAttemptKeys.counter('EMP001'));
      expect(redis.del).toHaveBeenCalledWith(LoginAttemptKeys.lockedUntil('EMP001'));
    });
  });

  describe('validatePassword', () => {
    it('should return true for matching password', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      const result = await validatePassword('password123', '$2b$10$hash');
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', '$2b$10$hash');
    });

    it('should return false for non-matching password', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      const result = await validatePassword('wrong', '$2b$10$hash');
      expect(result).toBe(false);
    });
  });

  describe('logout / isTokenBlacklisted', () => {
    it('should blacklist a token on logout', async () => {
      await logout(redis as any, 'test-jti-123');
      expect(redis.set).toHaveBeenCalledWith(
        TokenBlacklistKeys.entry('test-jti-123'),
        '1',
        'EX',
        RedisTTL.TOKEN_BLACKLIST
      );
    });

    it('should detect blacklisted token', async () => {
      (redis as any)._store.set(
        TokenBlacklistKeys.entry('blacklisted-jti'),
        { value: '1' }
      );
      const result = await isTokenBlacklisted(redis as any, 'blacklisted-jti');
      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const result = await isTokenBlacklisted(redis as any, 'valid-jti');
      expect(result).toBe(false);
    });
  });
});

describe('Auth Service - Lockout Duration', () => {
  let redis: MockRedis;

  beforeEach(() => {
    redis = createMockRedis();
    vi.clearAllMocks();
  });

  it('should lock for exactly 15 minutes (900 seconds)', async () => {
    // Trigger lockout
    await incrementFailedAttempts(redis as any, 'EMP001');
    await incrementFailedAttempts(redis as any, 'EMP001');
    const result = await incrementFailedAttempts(redis as any, 'EMP001');

    expect(result.locked).toBe(true);
    expect(result.remainingSeconds).toBe(900); // 15 minutes
  });

  it('should auto-unlock after lockout period expires', async () => {
    // Set a lockout that has already expired
    const pastTime = Date.now() - 1000;
    (redis as any)._store.set(
      LoginAttemptKeys.lockedUntil('EMP001'),
      { value: pastTime.toString() }
    );

    const result = await checkLockout(redis as any, 'EMP001');
    expect(result.locked).toBe(false);
    // Keys should be cleaned up
    expect(redis.del).toHaveBeenCalledWith(LoginAttemptKeys.lockedUntil('EMP001'));
    expect(redis.del).toHaveBeenCalledWith(LoginAttemptKeys.counter('EMP001'));
  });

  it('should display remaining lockout duration', async () => {
    // Set lockout 5 minutes from now
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    (redis as any)._store.set(
      LoginAttemptKeys.lockedUntil('EMP001'),
      { value: fiveMinutesFromNow.toString() }
    );

    const result = await checkLockout(redis as any, 'EMP001');
    expect(result.locked).toBe(true);
    // Should be approximately 300 seconds (5 minutes)
    expect(result.remainingSeconds).toBeGreaterThan(295);
    expect(result.remainingSeconds).toBeLessThanOrEqual(300);
  });
});
