/**
 * Tests for data retention service.
 * Validates: Requirements 14.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataRetentionService, RetentionPolicy } from './data-retention.service.js';

// Mock database
function createMockDb() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ count: '0' }], rowCount: 0 }),
      };
      return fn(mockClient);
    }),
  };
}

describe('DataRetentionService', () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default policy values', () => {
      const service = new DataRetentionService(mockDb as never);
      const policy = service.getPolicy();

      expect(policy.maxRetentionDays).toBe(730);
      expect(policy.action).toBe('archive');
      expect(policy.batchSize).toBe(100);
      expect(policy.dryRun).toBe(false);
    });

    it('should accept custom policy values', () => {
      const service = new DataRetentionService(mockDb as never, {
        maxRetentionDays: 365,
        action: 'delete',
        batchSize: 50,
        dryRun: true,
      });
      const policy = service.getPolicy();

      expect(policy.maxRetentionDays).toBe(365);
      expect(policy.action).toBe('delete');
      expect(policy.batchSize).toBe(50);
      expect(policy.dryRun).toBe(true);
    });

    it('should cap maxRetentionDays at 730 (2 years)', () => {
      const service = new DataRetentionService(mockDb as never, {
        maxRetentionDays: 1000,
      });
      const policy = service.getPolicy();

      expect(policy.maxRetentionDays).toBe(730);
    });
  });

  describe('executeRetentionPolicy', () => {
    it('should return zero counts when no expired assessments exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const service = new DataRetentionService(mockDb as never);
      const result = await service.executeRetentionPolicy();

      expect(result.assessmentsProcessed).toBe(0);
      expect(result.responsesProcessed).toBe(0);
      expect(result.scoringResultsProcessed).toBe(0);
      expect(result.antiFakingResultsProcessed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should query for assessments older than retention period', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const service = new DataRetentionService(mockDb as never, {
        maxRetentionDays: 365,
      });
      await service.executeRetentionPolicy();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('completed_at < $1'),
        expect.arrayContaining([expect.any(Date)])
      );

      // Verify the cutoff date is approximately 365 days ago
      const callArgs = mockDb.query.mock.calls[0];
      const cutoffDate = callArgs![1]![0] as Date;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 365);

      // Allow 1 second tolerance
      expect(Math.abs(cutoffDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    it('should process expired assessments in batches', async () => {
      // Return 3 expired assessments
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 'a1', completed_at: new Date('2020-01-01') },
          { id: 'a2', completed_at: new Date('2020-02-01') },
          { id: 'a3', completed_at: new Date('2020-03-01') },
        ],
        rowCount: 3,
      });

      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ count: '5' }], rowCount: 1 }),
      };
      mockDb.transaction.mockImplementation(async (fn) => fn(mockClient));

      const service = new DataRetentionService(mockDb as never, {
        batchSize: 2, // Process 2 at a time
        action: 'archive',
      });
      const result = await service.executeRetentionPolicy();

      // Should have called transaction twice (batch of 2 + batch of 1)
      expect(mockDb.transaction).toHaveBeenCalledTimes(2);
      expect(result.assessmentsProcessed).toBe(3);
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'a1', completed_at: new Date('2020-01-01') }],
        rowCount: 1,
      });
      mockDb.transaction.mockRejectedValue(new Error('DB connection lost'));

      const service = new DataRetentionService(mockDb as never);
      const result = await service.executeRetentionPolicy();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('DB connection lost');
    });

    it('should set dryRun flag in result', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const service = new DataRetentionService(mockDb as never, { dryRun: true });
      const result = await service.executeRetentionPolicy();

      expect(result.dryRun).toBe(true);
    });

    it('should include executedAt timestamp', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const before = new Date();
      const service = new DataRetentionService(mockDb as never);
      const result = await service.executeRetentionPolicy();
      const after = new Date();

      expect(result.executedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.executedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('dry-run mode', () => {
    it('should count but not modify records in dry-run mode', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'a1', completed_at: new Date('2020-01-01') }],
          rowCount: 1,
        })
        // responses count
        .mockResolvedValueOnce({ rows: [{ count: '10' }], rowCount: 1 })
        // scoring count
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        // anti-faking count
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });

      const service = new DataRetentionService(mockDb as never, { dryRun: true });
      const result = await service.executeRetentionPolicy();

      expect(result.assessmentsProcessed).toBe(1);
      expect(result.responsesProcessed).toBe(10);
      expect(result.scoringResultsProcessed).toBe(1);
      expect(result.antiFakingResultsProcessed).toBe(1);
      // Should NOT have called transaction (no actual modifications)
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });
  });

  describe('scheduler', () => {
    it('should start and stop the scheduler', () => {
      vi.useFakeTimers();
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const service = new DataRetentionService(mockDb as never);
      service.startScheduler(60000); // 1 minute interval

      // Should have run immediately
      expect(mockDb.query).toHaveBeenCalled();

      service.stopScheduler();
      vi.useRealTimers();
    });

    it('should not start multiple schedulers', () => {
      vi.useFakeTimers();
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const service = new DataRetentionService(mockDb as never);
      service.startScheduler(60000);
      service.startScheduler(60000); // Should be a no-op

      service.stopScheduler();
      vi.useRealTimers();
    });
  });
});
