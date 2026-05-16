/**
 * Unit tests for AdminSessionService.
 *
 * Tests session management validation and business logic including:
 * - Session creation validation (end > start, non-empty candidates, timer bounds)
 * - Session listing with summary statistics
 * - Candidate progress retrieval
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdminSessionService, ValidationError } from './session.service';
import type { CreateSessionRequest } from '@assessment/shared';

// ─── Database Mock ───────────────────────────────────────────────────────────

class DatabaseMock {
  public queries: Array<{ text: string; params?: unknown[] }> = [];
  public queryResults: Array<{ rows: unknown[]; rowCount: number | null }> = [];
  public transactionFn: ((client: unknown) => Promise<unknown>) | null = null;

  private queryIndex = 0;

  async query<T>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }> {
    this.queries.push({ text, params });
    const result = this.queryResults[this.queryIndex] || { rows: [], rowCount: 0 };
    this.queryIndex++;
    return result as { rows: T[]; rowCount: number | null };
  }

  async transaction<T>(fn: (client: unknown) => Promise<T>): Promise<T> {
    const client = {
      query: async (text: string, params?: unknown[]) => {
        this.queries.push({ text, params });
        const result = this.queryResults[this.queryIndex] || { rows: [], rowCount: 0 };
        this.queryIndex++;
        return result;
      },
    };
    return fn(client);
  }

  reset(): void {
    this.queries = [];
    this.queryResults = [];
    this.queryIndex = 0;
  }

  setQueryResults(results: Array<{ rows: unknown[]; rowCount: number | null }>): void {
    this.queryResults = results;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminSessionService', () => {
  let db: DatabaseMock;
  let service: AdminSessionService;

  beforeEach(() => {
    db = new DatabaseMock();
    service = new AdminSessionService(db as unknown as import('../db/connection').Database);
  });

  describe('validateCreateSession', () => {
    const validRequest: CreateSessionRequest = {
      name: 'MINTS Batch 2024',
      startDate: '2024-06-01T00:00:00.000Z',
      endDate: '2024-06-30T23:59:59.000Z',
      candidateIds: ['candidate-1', 'candidate-2'],
      personalityTimerSeconds: 2700,
      sjtTimerSeconds: 3600,
    };

    it('should return no errors for a valid request', () => {
      const errors = service.validateCreateSession(validRequest);
      expect(errors).toHaveLength(0);
    });

    it('should reject when end date is before start date (Requirement 12.7)', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        startDate: '2024-06-30T00:00:00.000Z',
        endDate: '2024-06-01T00:00:00.000Z',
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'endDate',
          message: 'End date must be after start date',
        })
      );
    });

    it('should reject when end date equals start date (Requirement 12.7)', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        startDate: '2024-06-15T10:00:00.000Z',
        endDate: '2024-06-15T10:00:00.000Z',
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'endDate',
          message: 'End date must be after start date',
        })
      );
    });

    it('should reject when candidate list is empty (Requirement 12.7)', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        candidateIds: [],
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'candidateIds',
          message: 'Candidate list must not be empty',
        })
      );
    });

    it('should reject when candidate list exceeds 500', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        candidateIds: Array.from({ length: 501 }, (_, i) => `candidate-${i}`),
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'candidateIds',
          message: 'Candidate list must not exceed 500 candidates',
        })
      );
    });

    it('should accept candidate list of exactly 500', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        candidateIds: Array.from({ length: 500 }, (_, i) => `candidate-${i}`),
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toHaveLength(0);
    });

    it('should accept candidate list of exactly 1', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        candidateIds: ['candidate-1'],
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toHaveLength(0);
    });

    it('should reject personality timer below 60 seconds', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        personalityTimerSeconds: 59,
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'personalityTimerSeconds',
        })
      );
    });

    it('should reject personality timer above 7200 seconds', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        personalityTimerSeconds: 7201,
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'personalityTimerSeconds',
        })
      );
    });

    it('should accept personality timer at exactly 60 seconds', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        personalityTimerSeconds: 60,
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toHaveLength(0);
    });

    it('should accept personality timer at exactly 7200 seconds', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        personalityTimerSeconds: 7200,
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toHaveLength(0);
    });

    it('should reject SJT timer below 60 seconds', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        sjtTimerSeconds: 59,
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'sjtTimerSeconds',
        })
      );
    });

    it('should reject SJT timer above 7200 seconds', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        sjtTimerSeconds: 7201,
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'sjtTimerSeconds',
        })
      );
    });

    it('should accept SJT timer at exactly 60 seconds', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        sjtTimerSeconds: 60,
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toHaveLength(0);
    });

    it('should accept SJT timer at exactly 7200 seconds', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        sjtTimerSeconds: 7200,
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty session name', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        name: '',
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          message: 'Session name is required',
        })
      );
    });

    it('should reject whitespace-only session name', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        name: '   ',
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
        })
      );
    });

    it('should reject invalid start date format', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        startDate: 'not-a-date',
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'startDate',
          message: 'Invalid start date format',
        })
      );
    });

    it('should reject invalid end date format', () => {
      const request: CreateSessionRequest = {
        ...validRequest,
        endDate: 'not-a-date',
      };

      const errors = service.validateCreateSession(request);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'endDate',
          message: 'Invalid end date format',
        })
      );
    });

    it('should return multiple errors when multiple fields are invalid', () => {
      const request: CreateSessionRequest = {
        name: '',
        startDate: '2024-06-30T00:00:00.000Z',
        endDate: '2024-06-01T00:00:00.000Z',
        candidateIds: [],
        personalityTimerSeconds: 30,
        sjtTimerSeconds: 10000,
      };

      const errors = service.validateCreateSession(request);
      expect(errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('createSession', () => {
    const validRequest: CreateSessionRequest = {
      name: 'MINTS Batch 2024',
      startDate: '2024-06-01T00:00:00.000Z',
      endDate: '2024-06-30T23:59:59.000Z',
      candidateIds: ['candidate-1', 'candidate-2'],
      personalityTimerSeconds: 2700,
      sjtTimerSeconds: 3600,
    };

    it('should create a session and return the result', async () => {
      db.setQueryResults([
        // INSERT session
        { rows: [{ id: 'session-uuid-123' }], rowCount: 1 },
        // INSERT session_candidates
        { rows: [], rowCount: 2 },
      ]);

      const result = await service.createSession('admin-1', validRequest);

      expect(result.sessionId).toBe('session-uuid-123');
      expect(result.name).toBe('MINTS Batch 2024');
      expect(result.startDate).toBe('2024-06-01T00:00:00.000Z');
      expect(result.endDate).toBe('2024-06-30T23:59:59.000Z');
      expect(result.candidateCount).toBe(2);
    });

    it('should trim the session name', async () => {
      db.setQueryResults([
        { rows: [{ id: 'session-uuid-123' }], rowCount: 1 },
        { rows: [], rowCount: 1 },
      ]);

      const request = { ...validRequest, name: '  MINTS Batch 2024  ' };
      const result = await service.createSession('admin-1', request);

      expect(result.name).toBe('MINTS Batch 2024');
    });
  });

  describe('listSessions', () => {
    it('should return sessions with summary statistics', async () => {
      db.setQueryResults([
        {
          rows: [
            {
              id: 'session-1',
              name: 'Batch 2024-A',
              start_date: '2024-06-01T00:00:00.000Z',
              end_date: '2024-06-30T23:59:59.000Z',
              status: 'active',
              total_candidates: '10',
              completed_count: '3',
              in_progress_count: '2',
              not_started_count: '5',
            },
            {
              id: 'session-2',
              name: 'Batch 2024-B',
              start_date: '2024-07-01T00:00:00.000Z',
              end_date: '2024-07-31T23:59:59.000Z',
              status: 'draft',
              total_candidates: '5',
              completed_count: '0',
              in_progress_count: '0',
              not_started_count: '5',
            },
          ],
          rowCount: 2,
        },
      ]);

      const sessions = await service.listSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toEqual({
        id: 'session-1',
        name: 'Batch 2024-A',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-06-30T23:59:59.000Z',
        status: 'active',
        totalCandidates: 10,
        completedCount: 3,
        inProgressCount: 2,
        notStartedCount: 5,
      });
    });

    it('should return empty array when no sessions exist', async () => {
      db.setQueryResults([{ rows: [], rowCount: 0 }]);

      const sessions = await service.listSessions();
      expect(sessions).toHaveLength(0);
    });
  });

  describe('getSessionCandidates', () => {
    it('should return candidate progress with derived overall status', async () => {
      db.setQueryResults([
        {
          rows: [
            {
              candidate_id: 'c-1',
              candidate_name: 'John Doe',
              employee_id: 'EMP001',
              personality_status: 'completed',
              sjt_status: 'in_progress',
              started_at: '2024-06-15T10:00:00.000Z',
              completed_at: null,
            },
            {
              candidate_id: 'c-2',
              candidate_name: 'Jane Smith',
              employee_id: 'EMP002',
              personality_status: null,
              sjt_status: null,
              started_at: null,
              completed_at: null,
            },
          ],
          rowCount: 2,
        },
      ]);

      const candidates = await service.getSessionCandidates('session-1');

      expect(candidates).toHaveLength(2);

      // First candidate: personality completed, SJT in progress → overall in_progress
      expect(candidates[0]).toEqual({
        candidateId: 'c-1',
        candidateName: 'John Doe',
        employeeId: 'EMP001',
        personalityStatus: 'completed',
        sjtStatus: 'in_progress',
        overallStatus: 'in_progress',
        startedAt: '2024-06-15T10:00:00.000Z',
        completedAt: null,
      });

      // Second candidate: no assessments → overall not_started
      expect(candidates[1]).toEqual({
        candidateId: 'c-2',
        candidateName: 'Jane Smith',
        employeeId: 'EMP002',
        personalityStatus: 'not_started',
        sjtStatus: 'not_started',
        overallStatus: 'not_started',
        startedAt: null,
        completedAt: null,
      });
    });

    it('should derive completed status when both sections are completed', async () => {
      db.setQueryResults([
        {
          rows: [
            {
              candidate_id: 'c-1',
              candidate_name: 'John Doe',
              employee_id: 'EMP001',
              personality_status: 'completed',
              sjt_status: 'completed',
              started_at: '2024-06-15T10:00:00.000Z',
              completed_at: '2024-06-15T12:00:00.000Z',
            },
          ],
          rowCount: 1,
        },
      ]);

      const candidates = await service.getSessionCandidates('session-1');
      expect(candidates[0]!.overallStatus).toBe('completed');
    });

    it('should derive interrupted status when a section is interrupted', async () => {
      db.setQueryResults([
        {
          rows: [
            {
              candidate_id: 'c-1',
              candidate_name: 'John Doe',
              employee_id: 'EMP001',
              personality_status: 'interrupted',
              sjt_status: null,
              started_at: '2024-06-15T10:00:00.000Z',
              completed_at: null,
            },
          ],
          rowCount: 1,
        },
      ]);

      const candidates = await service.getSessionCandidates('session-1');
      expect(candidates[0]!.overallStatus).toBe('interrupted');
    });
  });

  describe('sessionExists', () => {
    it('should return true when session exists', async () => {
      db.setQueryResults([{ rows: [{ exists: true }], rowCount: 1 }]);

      const exists = await service.sessionExists('session-1');
      expect(exists).toBe(true);
    });

    it('should return false when session does not exist', async () => {
      db.setQueryResults([{ rows: [{ exists: false }], rowCount: 1 }]);

      const exists = await service.sessionExists('nonexistent');
      expect(exists).toBe(false);
    });
  });
});
