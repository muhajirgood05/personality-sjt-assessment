/**
 * Server-side timer management service.
 *
 * Provides focused timer operations for assessment sections:
 * - Timer initialization with configurable duration
 * - Server-side countdown that continues during client disconnection
 * - Timer synchronization returning remaining time with server timestamp
 * - Pause/resume for session interruption handling
 * - Expiration detection and callback registration (polling-based)
 *
 * Timer calculation: remaining = stored_remaining - (Date.now() - stored_start_time)
 *
 * Default durations:
 * - Personality test: 45 minutes (2,700,000 ms)
 * - SJT: 60 minutes (3,600,000 ms)
 */

import type Redis from 'ioredis';
import { TimerKeys, RedisTTL } from '../redis/keys';
import type { TimerSync } from '@assessment/shared';
import { SectionType } from '@assessment/shared';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default timer durations in milliseconds */
export const TIMER_DURATIONS = {
  [SectionType.Personality]: 45 * 60 * 1000, // 2,700,000 ms
  [SectionType.SJT]: 60 * 60 * 1000, // 3,600,000 ms
} as const;

/** Polling interval for expiration checks (in ms) */
const EXPIRATION_POLL_INTERVAL_MS = 5_000;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExpirationCallback = (assessmentId: string, sectionType: string) => void | Promise<void>;

export interface TimerState {
  remainingMs: number;
  startTime: number;
  paused: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class TimerService {
  private expirationCallbacks = new Map<string, ExpirationCallback>();
  private pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

  constructor(private readonly redis: Redis) {}

  /**
   * Initializes a timer for an assessment section.
   * Stores the duration as remaining time and records the current timestamp as start time.
   *
   * @param assessmentId - The assessment identifier
   * @param sectionType - The section type (personality or sjt)
   * @param durationMs - Timer duration in milliseconds (defaults to section-specific duration)
   */
  async initializeTimer(
    assessmentId: string,
    sectionType: string,
    durationMs?: number
  ): Promise<void> {
    const duration =
      durationMs ?? TIMER_DURATIONS[sectionType as SectionType] ?? TIMER_DURATIONS[SectionType.Personality];
    const now = Date.now();

    await this.redis.set(
      TimerKeys.remaining(assessmentId, sectionType),
      String(duration),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    await this.redis.set(
      TimerKeys.startTime(assessmentId, sectionType),
      String(now),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );
  }

  /**
   * Calculates the current remaining time for an assessment section.
   * Formula: remaining = stored_remaining - (Date.now() - stored_start_time)
   *
   * The timer continues counting down on the server even when the client is disconnected.
   *
   * @returns Remaining time in milliseconds (minimum 0)
   */
  async getRemainingTime(assessmentId: string, sectionType: string): Promise<number> {
    const remainingStr = await this.redis.get(TimerKeys.remaining(assessmentId, sectionType));
    const startTimeStr = await this.redis.get(TimerKeys.startTime(assessmentId, sectionType));

    if (!remainingStr || !startTimeStr) {
      return 0;
    }

    const storedRemaining = Number(remainingStr);
    const startTime = Number(startTimeStr);
    const elapsed = Date.now() - startTime;

    return Math.max(0, storedRemaining - elapsed);
  }

  /**
   * Returns a TimerSync object with remaining time and server timestamp.
   * Used for client-server time synchronization.
   */
  async syncTimer(assessmentId: string, sectionType: string): Promise<TimerSync> {
    const remainingMs = await this.getRemainingTime(assessmentId, sectionType);
    const serverTimestamp = Date.now();

    return {
      sectionId: assessmentId,
      remainingMs,
      serverTimestamp,
    };
  }

  /**
   * Checks if the timer for an assessment section has reached zero.
   */
  async isExpired(assessmentId: string, sectionType: string): Promise<boolean> {
    const remaining = await this.getRemainingTime(assessmentId, sectionType);
    return remaining <= 0;
  }

  /**
   * Pauses the timer by snapshotting the current remaining time.
   * Used when a session is interrupted — freezes the countdown.
   *
   * After pausing, the stored remaining time reflects the exact time left
   * at the moment of pause, and the start time is cleared to indicate paused state.
   */
  async pauseTimer(assessmentId: string, sectionType: string): Promise<number> {
    const remainingMs = await this.getRemainingTime(assessmentId, sectionType);

    // Snapshot the remaining time
    await this.redis.set(
      TimerKeys.remaining(assessmentId, sectionType),
      String(remainingMs),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Set start time to 0 to indicate paused state
    // When start time equals the "remaining snapshot time", elapsed will be 0
    await this.redis.set(
      TimerKeys.startTime(assessmentId, sectionType),
      String(Date.now()),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Stop polling for this timer if active
    this.stopPolling(assessmentId);

    return remainingMs;
  }

  /**
   * Resumes the timer from the paused remaining time.
   * Resets the start time to now so the countdown continues from the paused value.
   */
  async resumeTimer(assessmentId: string, sectionType: string): Promise<number> {
    const remainingStr = await this.redis.get(TimerKeys.remaining(assessmentId, sectionType));

    if (!remainingStr) {
      return 0;
    }

    const remainingMs = Number(remainingStr);

    if (remainingMs <= 0) {
      return 0;
    }

    const now = Date.now();

    // Reset start time to now — countdown resumes from stored remaining
    await this.redis.set(
      TimerKeys.startTime(assessmentId, sectionType),
      String(now),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Re-start expiration polling if a callback is registered
    const callbackKey = this.getCallbackKey(assessmentId, sectionType);
    const callback = this.expirationCallbacks.get(callbackKey);
    if (callback) {
      this.startPolling(assessmentId, sectionType, callback);
    }

    return remainingMs;
  }

  /**
   * Registers an expiration callback for an assessment.
   * Uses polling-based checking to detect when the timer reaches zero.
   *
   * @param assessmentId - The assessment identifier
   * @param sectionType - The section type
   * @param callback - Function to call when the timer expires
   */
  onExpiration(
    assessmentId: string,
    sectionType: string,
    callback: ExpirationCallback
  ): void {
    const callbackKey = this.getCallbackKey(assessmentId, sectionType);
    this.expirationCallbacks.set(callbackKey, callback);
    this.startPolling(assessmentId, sectionType, callback);
  }

  /**
   * Removes the expiration callback and stops polling for an assessment.
   */
  removeExpiration(assessmentId: string, sectionType: string): void {
    const callbackKey = this.getCallbackKey(assessmentId, sectionType);
    this.expirationCallbacks.delete(callbackKey);
    this.stopPolling(assessmentId);
  }

  /**
   * Cleans up all polling intervals. Call this when shutting down the service.
   */
  dispose(): void {
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
    this.expirationCallbacks.clear();
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private getCallbackKey(assessmentId: string, sectionType: string): string {
    return `${assessmentId}:${sectionType}`;
  }

  private startPolling(
    assessmentId: string,
    sectionType: string,
    callback: ExpirationCallback
  ): void {
    const key = this.getCallbackKey(assessmentId, sectionType);

    // Don't start duplicate polling
    if (this.pollingIntervals.has(key)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const expired = await this.isExpired(assessmentId, sectionType);
        if (expired) {
          this.stopPolling(assessmentId);
          this.expirationCallbacks.delete(key);
          await callback(assessmentId, sectionType);
        }
      } catch (error) {
        // Log but don't crash the polling loop
        console.error(`[TimerService] Expiration check failed for ${key}:`, error);
      }
    }, EXPIRATION_POLL_INTERVAL_MS);

    this.pollingIntervals.set(key, interval);
  }

  private stopPolling(assessmentId: string): void {
    // Stop all polling intervals for this assessment (any section type)
    for (const [key, interval] of this.pollingIntervals.entries()) {
      if (key.startsWith(`${assessmentId}:`)) {
        clearInterval(interval);
        this.pollingIntervals.delete(key);
      }
    }
  }
}
