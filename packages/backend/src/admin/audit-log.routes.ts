/**
 * Audit log Fastify route handlers.
 *
 * Endpoints:
 * - GET /api/admin/audit-log — Query audit log entries with filtering
 *
 * All routes require Administrator role.
 *
 * Validates: Requirement 14.5
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Database } from '../db/connection';
import { AuditLogService } from './audit-log.service';
import { requireAdmin } from '../auth/rbac.middleware';
import type { AuditLogResponse } from '@assessment/shared';

// ─── Route Registration ──────────────────────────────────────────────────────

export interface AuditLogRoutesOptions {
  db: Database;
}

interface AuditLogQueryParams {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  pageSize?: string;
}

export async function auditLogRoutes(
  app: FastifyInstance,
  options: AuditLogRoutesOptions
): Promise<void> {
  const service = new AuditLogService(options.db);
  const adminGuard = requireAdmin();

  /**
   * GET /api/admin/audit-log
   *
   * Queries audit log entries with optional filtering.
   *
   * Query parameters:
   * - userId: Filter by accessor identity (UUID)
   * - action: Filter by action performed (e.g., "view_report", "export_results")
   * - resourceType: Filter by resource type (e.g., "assessment", "report", "session")
   * - startDate: Filter entries from this date (ISO 8601)
   * - endDate: Filter entries up to this date (ISO 8601)
   * - page: Page number (default: 1)
   * - pageSize: Entries per page (default: 20, max: 100)
   *
   * Validates: Requirement 14.5
   */
  app.get(
    '/api/admin/audit-log',
    { preHandler: [adminGuard] },
    async (
      request: FastifyRequest<{ Querystring: AuditLogQueryParams }>,
      reply: FastifyReply
    ) => {
      try {
        const query = request.query;

        const result = await service.queryEntries({
          userId: query.userId,
          action: query.action,
          resourceType: query.resourceType,
          startDate: query.startDate,
          endDate: query.endDate,
          page: query.page ? parseInt(query.page, 10) : undefined,
          pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
        });

        const response: AuditLogResponse = {
          entries: result.entries,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
        };

        return reply.status(200).send({
          success: true,
          data: response,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Admin] Audit log query failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve audit log entries',
          },
        });
      }
    }
  );
}
