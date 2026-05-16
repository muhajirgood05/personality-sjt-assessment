/**
 * Admin session management service.
 *
 * Handles assessment session CRUD operations including:
 * - Creating sessions with validation (end > start, non-empty candidates, timer bounds)
 * - Listing all sessions with summary statistics
 * - Retrieving candidate progress for a session (updated within 30 seconds)
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.7
 */

import type { Database } from '../db/connection';
import type {
  CreateSessionRequest,
  SessionSummaryDto,
  CandidateProgressDto,
} from '@assessment/shared';
import { AssessmentStatus } from '@assessment/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateSessionResult {
  sessionId: string;
  name: string;
  startDate: string;
  endDate: string;
  candidateCount: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_TIMER_SECONDS = 60;
const MAX_TIMER_SECONDS = 7200;
const MAX_CANDIDATES = 500;

// ─── Service ─────────────────────────────────────────────────────────────────

export class AdminSessionService {
  constructor(private readonly db: Database) {}

  /**
   * Validates a session creation request.
   * Returns an array of validation errors (empty if valid).
   *
   * Validates: Requirement 12.7
   */
  validateCreateSession(request: CreateSessionRequest): ValidationError[] {
    const errors: ValidationError[] = [];

    // Name validation
    if (!request.name || request.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Session name is required' });
    }

    // Date validation
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);

    if (isNaN(startDate.getTime())) {
      errors.push({ field: 'startDate', message: 'Invalid start date format' });
    }

    if (isNaN(endDate.getTime())) {
      errors.push({ field: 'endDate', message: 'Invalid end date format' });
    }

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate <= startDate) {
      errors.push({
        field: 'endDate',
        message: 'End date must be after start date',
      });
    }

    // Candidate list validation
    if (!request.candidateIds || request.candidateIds.length === 0) {
      errors.push({
        field: 'candidateIds',
        message: 'Candidate list must not be empty',
      });
    } else if (request.candidateIds.length > MAX_CANDIDATES) {
      errors.push({
        field: 'candidateIds',
        message: `Candidate list must not exceed ${MAX_CANDIDATES} candidates`,
      });
    }

    // Timer bounds validation
    if (
      request.personalityTimerSeconds < MIN_TIMER_SECONDS ||
      request.personalityTimerSeconds > MAX_TIMER_SECONDS
    ) {
      errors.push({
        field: 'personalityTimerSeconds',
        message: `Personality timer must be between ${MIN_TIMER_SECONDS} and ${MAX_TIMER_SECONDS} seconds`,
      });
    }

    if (
      request.sjtTimerSeconds < MIN_TIMER_SECONDS ||
      request.sjtTimerSeconds > MAX_TIMER_SECONDS
    ) {
      errors.push({
        field: 'sjtTimerSeconds',
        message: `SJT timer must be between ${MIN_TIMER_SECONDS} and ${MAX_TIMER_SECONDS} seconds`,
      });
    }

    return errors;
  }

  /**
   * Creates a new assessment session with associated candidates.
   *
   * Validates: Requirement 12.2
   */
  async createSession(
    adminId: string,
    request: CreateSessionRequest
  ): Promise<CreateSessionResult> {
    return this.db.transaction(async (client) => {
      // Insert the session
      const sessionResult = await client.query<{ id: string }>(
        `INSERT INTO assessment_sessions (admin_id, name, start_date, end_date, personality_timer_seconds, sjt_timer_seconds, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id`,
        [
          adminId,
          request.name.trim(),
          request.startDate,
          request.endDate,
          request.personalityTimerSeconds,
          request.sjtTimerSeconds,
        ]
      );

      const sessionId = sessionResult.rows[0]!.id;

      // Insert session-candidate associations
      if (request.candidateIds.length > 0) {
        const values = request.candidateIds
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        const params = [sessionId, ...request.candidateIds];

        await client.query(
          `INSERT INTO session_candidates (session_id, candidate_id) VALUES ${values}`,
          params
        );
      }

      return {
        sessionId,
        name: request.name.trim(),
        startDate: request.startDate,
        endDate: request.endDate,
        candidateCount: request.candidateIds.length,
      };
    });
  }

  /**
   * Lists all assessment sessions with summary statistics.
   *
   * Validates: Requirement 12.1
   */
  async listSessions(): Promise<SessionSummaryDto[]> {
    const result = await this.db.query<{
      id: string;
      name: string;
      start_date: string;
      end_date: string;
      status: string;
      total_candidates: string;
      completed_count: string;
      in_progress_count: string;
      not_started_count: string;
    }>(
      `SELECT
        s.id,
        s.name,
        s.start_date,
        s.end_date,
        s.status,
        COUNT(DISTINCT sc.candidate_id)::text AS total_candidates,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.candidate_id END)::text AS completed_count,
        COUNT(DISTINCT CASE WHEN a.status = 'in_progress' THEN a.candidate_id END)::text AS in_progress_count,
        (COUNT(DISTINCT sc.candidate_id) -
         COUNT(DISTINCT CASE WHEN a.status IN ('completed', 'in_progress', 'interrupted', 'expired') THEN a.candidate_id END)
        )::text AS not_started_count
      FROM assessment_sessions s
      LEFT JOIN session_candidates sc ON sc.session_id = s.id
      LEFT JOIN assessments a ON a.session_id = s.id AND a.candidate_id = sc.candidate_id
      GROUP BY s.id, s.name, s.start_date, s.end_date, s.status
      ORDER BY s.created_at DESC`
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      startDate: new Date(row.start_date).toISOString(),
      endDate: new Date(row.end_date).toISOString(),
      status: row.status,
      totalCandidates: parseInt(row.total_candidates, 10),
      completedCount: parseInt(row.completed_count, 10),
      inProgressCount: parseInt(row.in_progress_count, 10),
      notStartedCount: parseInt(row.not_started_count, 10),
    }));
  }

  /**
   * Gets candidate progress for a specific session.
   * Progress is derived from the assessments table which is updated
   * as candidates interact with the system (within 30 seconds of status change).
   *
   * Validates: Requirement 12.3
   */
  async getSessionCandidates(sessionId: string): Promise<CandidateProgressDto[]> {
    const result = await this.db.query<{
      candidate_id: string;
      candidate_name: string;
      employee_id: string;
      personality_status: string | null;
      sjt_status: string | null;
      started_at: string | null;
      completed_at: string | null;
    }>(
      `SELECT
        c.id AS candidate_id,
        c.name AS candidate_name,
        c.employee_id,
        MAX(CASE WHEN a.section_type = 'personality' THEN a.status END) AS personality_status,
        MAX(CASE WHEN a.section_type = 'sjt' THEN a.status END) AS sjt_status,
        MIN(a.started_at)::text AS started_at,
        MAX(a.completed_at)::text AS completed_at
      FROM session_candidates sc
      JOIN candidates c ON c.id = sc.candidate_id
      LEFT JOIN assessments a ON a.candidate_id = c.id AND a.session_id = sc.session_id
      WHERE sc.session_id = $1
      GROUP BY c.id, c.name, c.employee_id
      ORDER BY c.name ASC`,
      [sessionId]
    );

    return result.rows.map((row) => {
      const personalityStatus = (row.personality_status as AssessmentStatus) || AssessmentStatus.NotStarted;
      const sjtStatus = (row.sjt_status as AssessmentStatus) || AssessmentStatus.NotStarted;

      // Derive overall status from section statuses
      const overallStatus = this.deriveOverallStatus(personalityStatus, sjtStatus);

      return {
        candidateId: row.candidate_id,
        candidateName: row.candidate_name,
        employeeId: row.employee_id,
        personalityStatus,
        sjtStatus,
        overallStatus,
        startedAt: row.started_at || null,
        completedAt: row.completed_at || null,
      };
    });
  }

  /**
   * Checks if a session exists.
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM assessment_sessions WHERE id = $1) AS exists`,
      [sessionId]
    );
    return result.rows[0]?.exists ?? false;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Derives the overall assessment status from individual section statuses.
   */
  private deriveOverallStatus(
    personalityStatus: AssessmentStatus,
    sjtStatus: AssessmentStatus
  ): AssessmentStatus {
    // If both completed, overall is completed
    if (
      personalityStatus === AssessmentStatus.Completed &&
      sjtStatus === AssessmentStatus.Completed
    ) {
      return AssessmentStatus.Completed;
    }

    // If either is in progress, overall is in progress
    if (
      personalityStatus === AssessmentStatus.InProgress ||
      sjtStatus === AssessmentStatus.InProgress
    ) {
      return AssessmentStatus.InProgress;
    }

    // If either is interrupted, overall is interrupted
    if (
      personalityStatus === AssessmentStatus.Interrupted ||
      sjtStatus === AssessmentStatus.Interrupted
    ) {
      return AssessmentStatus.Interrupted;
    }

    // If one is completed and the other not started, overall is in progress
    if (
      personalityStatus === AssessmentStatus.Completed ||
      sjtStatus === AssessmentStatus.Completed
    ) {
      return AssessmentStatus.InProgress;
    }

    // Default: not started
    return AssessmentStatus.NotStarted;
  }
}
