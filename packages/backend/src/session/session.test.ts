/**
 * Unit tests for SessionService.
 *
 * Uses an in-memory Redis mock to test session management logic including:
 * - Session creation
 * - Heartbeat updates
 * - Session interruption detection
 * - Session resumption with timer restoration
 * - Inactivity timeout
 * - Session termination
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionService, SessionState } from './session.service';
import { SessionKeys, HeartbeatKeys, TimerKeys, RedisTTL } from '../redis/keys';

// ─── Redis Mock ──────────────────────────────────────────────────────────────

/**
 * Minimal in-memory Redis mock that supports the operations used by SessionService.
 */
class RedisMock {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async set(key: string, value: string, ...args: unknown[]): Promise<string> {
    let expiresAt: number | undefined;

    // Parse EX argument for TTL
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX' && typeof args[i + 1] === 'number') {
        expiresAt = Date.now() + (args[i + 1] as number) * 1000;
      }
    }

    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check expiry
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const result: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      // Skip expired entries
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.store.delete(key);
        continue;
      }
      if (regex.test(key)) {
        result.push(key);
      }
    }

    return result;
  }

  clear(): void {
    this.store.clear();
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SessionService', () => {
  let redis: RedisMock;
  let service: SessionService;

  const candidateId = 'candidate-123';
  const assessmentId = 'assessment-456';
  const sectionType = 'personality';
  const totalItems = 120;
  const timerMs = 45 * 60 * 1000; // 45 minutes

  beforeEach(() => {
    redis = new RedisMock();
    service = new SessionService(redis as unknown as import('ioredis').default);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  describe('createSession', () => {
    it('should create a session state in Redis', async () => {
      const state = await service.createSession(
        candidateId,
        assessmentId,
        sectionType,
        totalItems,
        timerMs
      );

      expect(state.assessmentId).toBe(assessmentId);
      expect(state.sectionType).toBe(sectionType);
      expect(state.currentItemIndex).toBe(0);
      expect(state.totalItems).toBe(totalItems);
      expect(state.status).toBe('in_progress');
      expect(state.startedAt).toBe(Date.now());
      expect(state.lastSavedAt).toBe(Date.now());
    });

    it('should store session state in Redis with correct key', async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);

      const stored = await redis.get(SessionKeys.state(candidateId));
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!) as SessionState;
      expect(parsed.assessmentId).toBe(assessmentId);
    });

    it('should initialize current item pointer to 0', async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);

      const currentItem = await redis.get(SessionKeys.currentItem(candidateId));
      expect(currentItem).toBe('0');
    });

    it('should initialize progress tracking', async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);

      const progress = await redis.get(SessionKeys.progress(candidateId));
      expect(progress).not.toBeNull();

      const parsed = JSON.parse(progress!);
      expect(parsed.completed).toBe(0);
      expect(parsed.total).toBe(totalItems);
    });

    it('should initialize timer state', async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);

      const remaining = await redis.get(TimerKeys.remaining(assessmentId, sectionType));
      expect(remaining).toBe(String(timerMs));

      const startTime = await redis.get(TimerKeys.startTime(assessmentId, sectionType));
      expect(startTime).toBe(String(Date.now()));
    });

    it('should initialize heartbeat', async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);

      const lastSeen = await redis.get(HeartbeatKeys.lastSeen(assessmentId));
      expect(lastSeen).toBe(String(Date.now()));
    });
  });

  describe('updateHeartbeat', () => {
    beforeEach(async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);
    });

    it('should update the last-seen timestamp', async () => {
      vi.advanceTimersByTime(10_000); // 10 seconds later

      await service.updateHeartbeat(assessmentId);

      const lastSeen = await redis.get(HeartbeatKeys.lastSeen(assessmentId));
      expect(lastSeen).toBe(String(Date.now()));
    });

    it('should return remaining time and server timestamp', async () => {
      vi.advanceTimersByTime(60_000); // 1 minute later

      const result = await service.updateHeartbeat(assessmentId);

      expect(result.serverTimestamp).toBe(Date.now());
      // Timer should have decreased by ~60 seconds
      expect(result.remainingMs).toBe(timerMs - 60_000);
      expect(result.sessionValid).toBe(true);
    });

    it('should return sessionValid=false when timer has expired', async () => {
      // Advance past the timer duration
      vi.advanceTimersByTime(timerMs + 1000);

      const result = await service.updateHeartbeat(assessmentId);

      expect(result.remainingMs).toBe(0);
      expect(result.sessionValid).toBe(false);
    });
  });

  describe('checkSessionInterruption', () => {
    beforeEach(async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);
    });

    it('should return false when heartbeat is fresh (<60s)', async () => {
      vi.advanceTimersByTime(30_000); // 30 seconds

      const interrupted = await service.checkSessionInterruption(assessmentId);
      expect(interrupted).toBe(false);
    });

    it('should return true when heartbeat is stale (>60s)', async () => {
      vi.advanceTimersByTime(61_000); // 61 seconds

      const interrupted = await service.checkSessionInterruption(assessmentId);
      expect(interrupted).toBe(true);
    });

    it('should return true when no heartbeat exists', async () => {
      await redis.del(HeartbeatKeys.lastSeen(assessmentId));

      const interrupted = await service.checkSessionInterruption(assessmentId);
      expect(interrupted).toBe(true);
    });

    it('should return false at exactly 60 seconds', async () => {
      vi.advanceTimersByTime(60_000); // exactly 60 seconds

      const interrupted = await service.checkSessionInterruption(assessmentId);
      expect(interrupted).toBe(false);
    });
  });

  describe('resumeSession', () => {
    beforeEach(async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);
    });

    it('should restore session state on resume', async () => {
      // Simulate some progress
      await service.updateProgress(candidateId, 15);

      // Simulate disconnection (advance time but within 30-min window)
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      const result = await service.resumeSession(assessmentId);

      expect(result).not.toBeNull();
      expect(result!.sessionState.status).toBe('in_progress');
      expect(result!.sessionState.currentItemIndex).toBe(15);
    });

    it('should restore timer to pre-interruption value (Requirement 1.6)', async () => {
      // Advance 10 minutes (timer should show 35 min remaining)
      vi.advanceTimersByTime(10 * 60 * 1000);

      // Update progress to snapshot the timer
      await service.updateProgress(candidateId, 20);

      // Now simulate 5 minutes of disconnection
      vi.advanceTimersByTime(5 * 60 * 1000);

      const result = await service.resumeSession(assessmentId);

      expect(result).not.toBeNull();
      // Timer should be restored to what it was at the moment of last save (35 min)
      // NOT 35 min - 5 min = 30 min
      // The remaining time stored at updateProgress was the snapshot
      expect(result!.remainingMs).toBe(35 * 60 * 1000);
    });

    it('should return null when resumption window (30 min) has expired', async () => {
      // Advance past 30-minute window
      vi.advanceTimersByTime(31 * 60 * 1000);

      const result = await service.resumeSession(assessmentId);

      expect(result).toBeNull();
    });

    it('should return null when session does not exist', async () => {
      const result = await service.resumeSession('nonexistent-assessment');
      expect(result).toBeNull();
    });

    it('should reset heartbeat on resume', async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);

      await service.resumeSession(assessmentId);

      const lastSeen = await redis.get(HeartbeatKeys.lastSeen(assessmentId));
      expect(lastSeen).toBe(String(Date.now()));
    });
  });

  describe('getSessionState', () => {
    it('should return session state for existing candidate', async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);

      const state = await service.getSessionState(candidateId);

      expect(state).not.toBeNull();
      expect(state!.assessmentId).toBe(assessmentId);
      expect(state!.status).toBe('in_progress');
    });

    it('should return null for non-existent candidate', async () => {
      const state = await service.getSessionState('nonexistent');
      expect(state).toBeNull();
    });
  });

  describe('updateProgress', () => {
    beforeEach(async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);
    });

    it('should update current item index', async () => {
      await service.updateProgress(candidateId, 10);

      const state = await service.getSessionState(candidateId);
      expect(state!.currentItemIndex).toBe(10);
    });

    it('should update current item pointer in Redis', async () => {
      await service.updateProgress(candidateId, 25);

      const currentItem = await redis.get(SessionKeys.currentItem(candidateId));
      expect(currentItem).toBe('25');
    });

    it('should update progress tracking', async () => {
      await service.updateProgress(candidateId, 50);

      const progress = await redis.get(SessionKeys.progress(candidateId));
      const parsed = JSON.parse(progress!);
      expect(parsed.completed).toBe(50);
      expect(parsed.total).toBe(totalItems);
    });

    it('should update lastSavedAt timestamp', async () => {
      vi.advanceTimersByTime(5000);

      await service.updateProgress(candidateId, 5);

      const state = await service.getSessionState(candidateId);
      expect(state!.lastSavedAt).toBe(Date.now());
    });
  });

  describe('terminateSession', () => {
    beforeEach(async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);
    });

    it('should mark session as expired', async () => {
      await service.terminateSession(assessmentId);

      const state = await service.getSessionState(candidateId);
      expect(state!.status).toBe('expired');
    });

    it('should remove heartbeat', async () => {
      await service.terminateSession(assessmentId);

      const lastSeen = await redis.get(HeartbeatKeys.lastSeen(assessmentId));
      expect(lastSeen).toBeNull();
    });

    it('should set remaining time to 0', async () => {
      await service.terminateSession(assessmentId);

      const remaining = await redis.get(TimerKeys.remaining(assessmentId, sectionType));
      expect(remaining).toBe('0');
    });
  });

  describe('checkInactivityTimeout', () => {
    beforeEach(async () => {
      await service.createSession(candidateId, assessmentId, sectionType, totalItems, timerMs);
    });

    it('should return false when session is active and within timeout', async () => {
      vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

      const timedOut = await service.checkInactivityTimeout(candidateId);
      expect(timedOut).toBe(false);
    });

    it('should return true when session exceeds 30-minute inactivity', async () => {
      vi.advanceTimersByTime(31 * 60 * 1000); // 31 minutes

      const timedOut = await service.checkInactivityTimeout(candidateId);
      expect(timedOut).toBe(true);
    });

    it('should return true for non-existent session', async () => {
      const timedOut = await service.checkInactivityTimeout('nonexistent');
      expect(timedOut).toBe(true);
    });

    it('should return true for expired session', async () => {
      await service.terminateSession(assessmentId);

      const timedOut = await service.checkInactivityTimeout(candidateId);
      expect(timedOut).toBe(true);
    });

    it('should reset timeout when progress is updated', async () => {
      // Advance 20 minutes
      vi.advanceTimersByTime(20 * 60 * 1000);

      // Update progress (resets lastSavedAt)
      await service.updateProgress(candidateId, 10);

      // Advance another 20 minutes (total 40 from start, but only 20 from last save)
      vi.advanceTimersByTime(20 * 60 * 1000);

      const timedOut = await service.checkInactivityTimeout(candidateId);
      expect(timedOut).toBe(false);
    });
  });
});
