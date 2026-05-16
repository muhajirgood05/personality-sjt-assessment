/**
 * Session management service.
 *
 * Handles assessment session state in Redis including:
 * - Session creation and state storage
 * - Heartbeat tracking for connectivity monitoring
 * - Session interruption detection (>60s without heartbeat)
 * - Session resumption within 30-minute window
 * - 30-minute inactivity timeout
 */

import type Redis from 'ioredis';
import { SessionKeys, HeartbeatKeys, TimerKeys, RedisTTL } from '../redis/keys';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionStatus = 'in_progress' | 'interrupted' | 'completed' | 'expired';

export interface SessionState {
  assessmentId: string;
  sectionType: string;
  currentItemIndex: number;
  totalItems: number;
  startedAt: number;
  lastSavedAt: number;
  status: SessionStatus;
}

export interface TimerState {
  remainingMs: number;
  startTime: number;
}

export interface HeartbeatResult {
  remainingMs: number;
  serverTimestamp: number;
  sessionValid: boolean;
}

export interface ResumeResult {
  sessionState: SessionState;
  remainingMs: number;
  serverTimestamp: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Heartbeat staleness threshold in milliseconds (60 seconds) */
const HEARTBEAT_STALE_THRESHOLD_MS = 60_000;

/** Inactivity timeout in milliseconds (30 minutes) */
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

// ─── Service ─────────────────────────────────────────────────────────────────

export class SessionService {
  constructor(private readonly redis: Redis) {}

  /**
   * Creates a new session state in Redis for a candidate's assessment.
   */
  async createSession(
    candidateId: string,
    assessmentId: string,
    sectionType: string,
    totalItems: number,
    timerMs: number
  ): Promise<SessionState> {
    const now = Date.now();

    const sessionState: SessionState = {
      assessmentId,
      sectionType,
      currentItemIndex: 0,
      totalItems,
      startedAt: now,
      lastSavedAt: now,
      status: 'in_progress',
    };

    // Store session state with inactivity TTL
    await this.redis.set(
      SessionKeys.state(candidateId),
      JSON.stringify(sessionState),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Initialize current item pointer
    await this.redis.set(
      SessionKeys.currentItem(candidateId),
      '0',
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Initialize progress
    await this.redis.set(
      SessionKeys.progress(candidateId),
      JSON.stringify({ completed: 0, total: totalItems }),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Initialize timer state
    await this.redis.set(
      TimerKeys.remaining(assessmentId, sectionType),
      String(timerMs),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );
    await this.redis.set(
      TimerKeys.startTime(assessmentId, sectionType),
      String(now),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Initialize heartbeat
    await this.redis.set(
      HeartbeatKeys.lastSeen(assessmentId),
      String(now),
      'EX',
      RedisTTL.HEARTBEAT
    );

    return sessionState;
  }

  /**
   * Updates the heartbeat last-seen timestamp for an assessment.
   * Returns timer sync information.
   */
  async updateHeartbeat(assessmentId: string): Promise<HeartbeatResult> {
    const now = Date.now();

    // Update heartbeat with TTL
    await this.redis.set(
      HeartbeatKeys.lastSeen(assessmentId),
      String(now),
      'EX',
      RedisTTL.HEARTBEAT
    );

    // Calculate remaining time from timer state
    const remainingMs = await this.calculateRemainingTime(assessmentId);

    return {
      remainingMs,
      serverTimestamp: now,
      sessionValid: remainingMs > 0,
    };
  }

  /**
   * Checks if the heartbeat for an assessment is stale (>60 seconds since last seen).
   * Returns true if the session is interrupted.
   */
  async checkSessionInterruption(assessmentId: string): Promise<boolean> {
    const lastSeenStr = await this.redis.get(HeartbeatKeys.lastSeen(assessmentId));

    if (!lastSeenStr) {
      // No heartbeat found — session is interrupted
      return true;
    }

    const lastSeen = Number(lastSeenStr);
    const elapsed = Date.now() - lastSeen;

    return elapsed > HEARTBEAT_STALE_THRESHOLD_MS;
  }

  /**
   * Resumes an interrupted session within the 30-minute window.
   * Per Requirement 1.6: time during disconnection SHALL NOT be deducted.
   * The remaining time is restored to what it was at the moment of interruption.
   */
  async resumeSession(assessmentId: string): Promise<ResumeResult | null> {
    // Find the candidate's session state by looking up via assessment ID
    // We need to find the session state that has this assessmentId
    const sessionState = await this.findSessionByAssessmentId(assessmentId);

    if (!sessionState) {
      return null;
    }

    const { state, candidateId } = sessionState;

    // Check if session can be resumed (must be interrupted or in_progress)
    if (state.status !== 'interrupted' && state.status !== 'in_progress') {
      return null;
    }

    // Check 30-minute resumption window
    const lastSavedAt = state.lastSavedAt;
    const elapsed = Date.now() - lastSavedAt;

    if (elapsed > INACTIVITY_TIMEOUT_MS) {
      // Window expired — terminate the session
      await this.terminateSession(assessmentId);
      return null;
    }

    const now = Date.now();

    // Per Requirement 1.6: restore remaining time to what it was at moment of interruption
    // The timer value stored in Redis represents the remaining time at the moment of last save/interruption
    const remainingStr = await this.redis.get(
      TimerKeys.remaining(state.assessmentId, state.sectionType)
    );
    const remainingMs = remainingStr ? Number(remainingStr) : 0;

    if (remainingMs <= 0) {
      await this.terminateSession(assessmentId);
      return null;
    }

    // Reset timer start time to now (timer resumes from this point)
    await this.redis.set(
      TimerKeys.startTime(state.assessmentId, state.sectionType),
      String(now),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Update session status back to in_progress
    const updatedState: SessionState = {
      ...state,
      status: 'in_progress',
      lastSavedAt: now,
    };

    await this.redis.set(
      SessionKeys.state(candidateId),
      JSON.stringify(updatedState),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Reset heartbeat
    await this.redis.set(
      HeartbeatKeys.lastSeen(assessmentId),
      String(now),
      'EX',
      RedisTTL.HEARTBEAT
    );

    return {
      sessionState: updatedState,
      remainingMs,
      serverTimestamp: now,
    };
  }

  /**
   * Retrieves the current session state for a candidate from Redis.
   */
  async getSessionState(candidateId: string): Promise<SessionState | null> {
    const stateStr = await this.redis.get(SessionKeys.state(candidateId));

    if (!stateStr) {
      return null;
    }

    return JSON.parse(stateStr) as SessionState;
  }

  /**
   * Updates the current item index for a candidate's session.
   */
  async updateProgress(candidateId: string, currentItemIndex: number): Promise<void> {
    const stateStr = await this.redis.get(SessionKeys.state(candidateId));

    if (!stateStr) {
      return;
    }

    const state = JSON.parse(stateStr) as SessionState;
    const now = Date.now();

    const updatedState: SessionState = {
      ...state,
      currentItemIndex,
      lastSavedAt: now,
    };

    // Update session state
    await this.redis.set(
      SessionKeys.state(candidateId),
      JSON.stringify(updatedState),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Update current item pointer
    await this.redis.set(
      SessionKeys.currentItem(candidateId),
      String(currentItemIndex),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Update progress
    await this.redis.set(
      SessionKeys.progress(candidateId),
      JSON.stringify({ completed: currentItemIndex, total: state.totalItems }),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Snapshot remaining time at this point for potential future resume
    const remainingMs = await this.calculateRemainingTime(state.assessmentId);
    await this.redis.set(
      TimerKeys.remaining(state.assessmentId, state.sectionType),
      String(Math.max(0, remainingMs)),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Update timer start to now (since we just snapshotted remaining)
    await this.redis.set(
      TimerKeys.startTime(state.assessmentId, state.sectionType),
      String(now),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );
  }

  /**
   * Terminates a session, marking it as expired/incomplete.
   * Called when the 30-minute resumption window expires.
   */
  async terminateSession(assessmentId: string): Promise<void> {
    const sessionData = await this.findSessionByAssessmentId(assessmentId);

    if (!sessionData) {
      return;
    }

    const { state, candidateId } = sessionData;

    const updatedState: SessionState = {
      ...state,
      status: 'expired',
      lastSavedAt: Date.now(),
    };

    // Update state with a short TTL (keep for a while for potential queries)
    await this.redis.set(
      SessionKeys.state(candidateId),
      JSON.stringify(updatedState),
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );

    // Clean up heartbeat
    await this.redis.del(HeartbeatKeys.lastSeen(assessmentId));

    // Set remaining time to 0
    await this.redis.set(
      TimerKeys.remaining(assessmentId, state.sectionType),
      '0',
      'EX',
      RedisTTL.SESSION_INACTIVITY
    );
  }

  /**
   * Checks if a candidate's session has exceeded the 30-minute inactivity timeout.
   * Returns true if the session should be terminated.
   */
  async checkInactivityTimeout(candidateId: string): Promise<boolean> {
    const state = await this.getSessionState(candidateId);

    if (!state) {
      return true;
    }

    if (state.status === 'expired' || state.status === 'completed') {
      return true;
    }

    const elapsed = Date.now() - state.lastSavedAt;
    return elapsed > INACTIVITY_TIMEOUT_MS;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Calculates the current remaining time for an assessment's timer.
   * remaining = stored_remaining - (now - stored_start_time)
   */
  private async calculateRemainingTime(assessmentId: string): Promise<number> {
    // We need the section type to look up timer keys.
    // Try to find it from any session that references this assessmentId.
    const keys = await this.redis.keys('session:*:state');
    for (const key of keys) {
      const stateStr = await this.redis.get(key);
      if (stateStr) {
        const state = JSON.parse(stateStr) as SessionState;
        if (state.assessmentId === assessmentId) {
          return this.calculateRemainingTimeForSection(assessmentId, state.sectionType);
        }
      }
    }
    return 0;
  }

  /**
   * Calculates remaining time for a specific assessment section.
   */
  private async calculateRemainingTimeForSection(
    assessmentId: string,
    sectionType: string
  ): Promise<number> {
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
   * Finds a session state by assessment ID by scanning session keys.
   * In production, you'd maintain a reverse index (assessmentId -> candidateId).
   */
  private async findSessionByAssessmentId(
    assessmentId: string
  ): Promise<{ state: SessionState; candidateId: string } | null> {
    const keys = await this.redis.keys('session:*:state');

    for (const key of keys) {
      const stateStr = await this.redis.get(key);
      if (stateStr) {
        const state = JSON.parse(stateStr) as SessionState;
        if (state.assessmentId === assessmentId) {
          // Extract candidateId from key pattern: session:{candidateId}:state
          const parts = key.split(':');
          const candidateId = parts[1];
          if (candidateId) {
            return { state, candidateId };
          }
        }
      }
    }

    return null;
  }
}
