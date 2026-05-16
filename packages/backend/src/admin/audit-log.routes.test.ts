/**
 * Unit tests for audit log routes.
 *
 * Tests the GET /api/admin/audit-log endpoint behavior including
 * query parameter parsing, admin authorization, and error handling.
 *
 * Validates: Requirement 14.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { auditLogRoutes } from './audit-log.routes';
import type { Database } from '../db/connection';

// ─── Mock Setup ──────────────────────────────────────────────────────────────

// Mock the requireAdmin middleware to allow all requests in tests
vi.mock('../auth/rbac.middleware', () => ({
  requireAdmin: () => async () => {},
}));

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

describe('GET /api/admin/audit-log', () => {
  let app: FastifyInstance;
  let mockDb: Database;

  beforeEach(async () => {
    mockDb = createMockDb();
    app = Fastify();
    await app.register(auditLogRoutes, { db: mockDb });
    await app.ready();
  });

  it('should return 200 with paginated audit log entries', async () => {
    (mockDb.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'entry-1',
            user_id: 'user-1',
            user_role: 'administrator',
            action: 'view_report',
            resource_type: 'report',
            resource_id: 'report-1',
            details: { candidateId: 'cand-1' },
            ip_address: '192.168.1.1',
            created_at: '2024-01-15T10:00:00.000Z',
          },
        ],
        rowCount: 1,
      });

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-log',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.entries).toHaveLength(1);
    expect(body.data.total).toBe(1);
    expect(body.data.page).toBe(1);
    expect(body.data.pageSize).toBe(20);
    expect(body.data.entries[0].userId).toBe('user-1');
    expect(body.data.entries[0].ipAddress).toBe('192.168.1.1');
  });

  it('should pass query parameters as filters', async () => {
    (mockDb.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-log?userId=user-1&action=view_report&resourceType=report&page=2&pageSize=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.page).toBe(2);
    expect(body.data.pageSize).toBe(10);

    // Verify the count query includes filters
    const countCall = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(countCall[0]).toContain('user_id = $1');
    expect(countCall[0]).toContain('action = $2');
    expect(countCall[0]).toContain('resource_type = $3');
  });

  it('should pass date range filters', async () => {
    (mockDb.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-log?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z',
    });

    expect(response.statusCode).toBe(200);
    const countCall = (mockDb.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(countCall[0]).toContain('created_at >= $1');
    expect(countCall[0]).toContain('created_at <= $2');
  });

  it('should return 500 on database error', async () => {
    (mockDb.query as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Connection refused')
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-log',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should return empty entries when no records match', async () => {
    (mockDb.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-log?action=nonexistent_action',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.entries).toHaveLength(0);
    expect(body.data.total).toBe(0);
  });
});
