import { describe, it, expect } from 'vitest';
import {
  SessionKeys,
  TimerKeys,
  HeartbeatKeys,
  LoginAttemptKeys,
  TokenBlacklistKeys,
  RedisTTL,
} from './keys.js';

describe('Redis Key Namespaces', () => {
  describe('SessionKeys', () => {
    it('generates correct session state key', () => {
      expect(SessionKeys.state('candidate-123')).toBe('session:candidate-123:state');
    });

    it('generates correct current item key', () => {
      expect(SessionKeys.currentItem('candidate-456')).toBe('session:candidate-456:current_item');
    });

    it('generates correct progress key', () => {
      expect(SessionKeys.progress('candidate-789')).toBe('session:candidate-789:progress');
    });
  });

  describe('TimerKeys', () => {
    it('generates correct remaining time key', () => {
      expect(TimerKeys.remaining('assess-1', 'personality')).toBe(
        'timer:assess-1:personality:remaining'
      );
    });

    it('generates correct start time key', () => {
      expect(TimerKeys.startTime('assess-1', 'sjt')).toBe('timer:assess-1:sjt:start_time');
    });
  });

  describe('HeartbeatKeys', () => {
    it('generates correct last seen key', () => {
      expect(HeartbeatKeys.lastSeen('assess-42')).toBe('heartbeat:assess-42:last_seen');
    });
  });

  describe('LoginAttemptKeys', () => {
    it('generates correct counter key', () => {
      expect(LoginAttemptKeys.counter('emp-001')).toBe('login_attempts:emp-001:count');
    });

    it('generates correct locked until key', () => {
      expect(LoginAttemptKeys.lockedUntil('emp-001')).toBe('login_attempts:emp-001:locked_until');
    });
  });

  describe('TokenBlacklistKeys', () => {
    it('generates correct blacklist entry key', () => {
      expect(TokenBlacklistKeys.entry('jti-abc-123')).toBe('token_blacklist:jti-abc-123');
    });
  });

  describe('RedisTTL', () => {
    it('has correct session inactivity TTL (30 minutes)', () => {
      expect(RedisTTL.SESSION_INACTIVITY).toBe(1800);
    });

    it('has correct session resumption TTL (30 minutes)', () => {
      expect(RedisTTL.SESSION_RESUMPTION).toBe(1800);
    });

    it('has correct account lockout TTL (15 minutes)', () => {
      expect(RedisTTL.ACCOUNT_LOCKOUT).toBe(900);
    });

    it('has correct heartbeat TTL (90 seconds)', () => {
      expect(RedisTTL.HEARTBEAT).toBe(90);
    });

    it('has correct token blacklist TTL (1 hour)', () => {
      expect(RedisTTL.TOKEN_BLACKLIST).toBe(3600);
    });

    it('has correct login attempt window TTL (15 minutes)', () => {
      expect(RedisTTL.LOGIN_ATTEMPT_WINDOW).toBe(900);
    });
  });
});
