/**
 * Unit tests for AuditLogService.
 *
 * Tests audit event recording and query/filtering capabilities.
 *
 * Validates: Requirement 14.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogService } from './audit-log.service';
import type { Database } from '../db/connection';

// ─── Mock Database ───────────────────────────────────────────────────────────

function createMockDb(): Database {
  return {
    query: vi.fn(),
    transaction: vi.fn(),
    getClient: vi.fn(),
    healthCheck: vi.fn(),
    close: vi.fn(),
    getStats: vi.fn(),
    getPool: vi.fn(),
  } as unknown as Database;
}

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockDb: Database;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new AuditLogService(mockDb);
  });

  describe('recordEvent', () => {
    it('should insert an audit log entry and return the generated id', async () => {
      const mockId = '550e8400-e29b-41d4-a716-446655440000';
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{ id: mockId }],
        rowCount: 1,
      });

      const result = await service.recordEvent({
        userId: 'user-123',
        userRole: 'administrator',
        action: 'view_report',
        resourceType: 'report',
        resourceId: 'report-456',
        details: { candidateId: 'cand-789' },
        ipAddress: '192.168.1.100',
      });

      expect(result).toBe(mockId);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        [
          'user-123',
          'administrator',
          'view_report',
          'report',
          'report-456',
          JSON.stringify({ candidateId: 'cand-789' }),
          '192.168.1.100',
        ]
      );
    });

    it('should handle null resourceId and details', async () => {
      const mockId = 'abc-123';
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{ id: mockId }],
        rowCount: 1,
      });

      await service.recordEvent({
        userId: 'user-123',
        userRole: 'candidate',
        action: 'login',
        resourceType: 'session',
        ipAddress: '10.0.0.1',
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        [
          'user-123',
          'candidate',
          'login',
          'session',
          null,
          null,
          '10.0.0.1',
        ]
      );
    });

    it('should store IP address with each log entry', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{ id: 'id-1' }],
        rowCount: 1,
      });

      await service.recordEvent({
        userId: 'user-1',
        userRole: 'administrator',
        action: 'export_results',
        resourceType: 'session',
        resourceId: 'session-1',
        ipAddress: '203.0.113.42',
      });

      const callArgs = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[0]![1] as unknown[];
      // IP address is the last parameter
      expect(callArgs[6]).toBe('203.0.113.42');
    });
  });

  describe('queryEntries', () => {
    it('should return paginated entries with defaults (page 1, pageSize 20)', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'entry-1',
              user_id: 'user-1',
              user_role: 'administrator',
              action: 'view_report',
              resource_type: 'report',
              resource_id: 'report-1',
              details: { foo: 'bar' },
              ip_address: '192.168.1.1',
              created_at: '2024-01-15T10:00:00.000Z',
            },
            {
              id: 'entry-2',
              user_id: 'user-2',
              user_role: 'administrator',
              action: 'export_results',
              resource_type: 'session',
              resource_id: 'session-1',
              details: null,
              ip_address: '10.0.0.5',
              created_at: '2024-01-14T09:00:00.000Z',
            },
          ],
          rowCount: 2,
        });

      const result = await service.queryEntries();

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toEqual({
        id: 'entry-1',
        userId: 'user-1',
        userRole: 'administrator',
        action: 'view_report',
        resourceType: 'report',
        resourceId: 'report-1',
        details: { foo: 'bar' },
        ipAddress: '192.168.1.1',
        createdAt: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should filter by userId', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.queryEntries({ userId: 'user-abc' });

      const countCall = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(countCall[0]).toContain('WHERE user_id = $1');
      expect(countCall[1]).toContain('user-abc');
    });

    it('should filter by action', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.queryEntries({ action: 'view_report' });

      const countCall = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(countCall[0]).toContain('WHERE action = $1');
      expect(countCall[1]).toContain('view_report');
    });

    it('should filter by resourceType', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.queryEntries({ resourceType: 'assessment' });

      const countCall = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(countCall[0]).toContain('WHERE resource_type = $1');
      expect(countCall[1]).toContain('assessment');
    });

    it('should filter by date range', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.queryEntries({
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      });

      const countCall = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(countCall[0]).toContain('created_at >= $1');
      expect(countCall[0]).toContain('created_at <= $2');
      expect(countCall[1]).toContain('2024-01-01T00:00:00Z');
      expect(countCall[1]).toContain('2024-01-31T23:59:59Z');
    });

    it('should combine multiple filters', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.queryEntries({
        userId: 'user-1',
        action: 'view_report',
        resourceType: 'report',
      });

      const countCall = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(countCall[0]).toContain('user_id = $1');
      expect(countCall[0]).toContain('action = $2');
      expect(countCall[0]).toContain('resource_type = $3');
    });

    it('should respect page and pageSize parameters', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '50' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.queryEntries({ page: 3, pageSize: 10 });

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);

      // Check LIMIT and OFFSET in the entries query
      const entriesCall = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[1]!;
      const params = entriesCall[1] as unknown[];
      // LIMIT = 10, OFFSET = 20 (page 3, pageSize 10 → offset = (3-1)*10 = 20)
      expect(params[params.length - 2]).toBe(10);
      expect(params[params.length - 1]).toBe(20);
    });

    it('should clamp pageSize to max 100', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.queryEntries({ pageSize: 500 });

      expect(result.pageSize).toBe(100);
    });

    it('should clamp page to minimum 1', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.queryEntries({ page: -1 });

      expect(result.page).toBe(1);
    });

    it('should order entries by created_at DESC (most recent first)', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.queryEntries();

      const entriesCall = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[1]!;
      expect(entriesCall[0]).toContain('ORDER BY created_at DESC');
    });
  });
});
