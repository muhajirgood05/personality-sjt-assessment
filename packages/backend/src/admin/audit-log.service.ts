/**
 * Audit log service.
 *
 * Records all data access events and provides query capabilities with filtering.
 * Each log entry captures: accessor identity, timestamp, action performed,
 * resource accessed, and IP address.
 *
 * Validates: Requirement 14.5
 */

import type { Database } from '../db/connection';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
}

export interface RecordAuditEventParams {
  userId: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress: string;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogQueryResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AuditLogService {
  constructor(private readonly db: Database) {}

  /**
   * Records a data access event in the audit log.
   *
   * Validates: Requirement 14.5
   */
  async recordEvent(params: RecordAuditEventParams): Promise<string> {
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO audit_log (user_id, user_role, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        params.userId,
        params.userRole,
        params.action,
        params.resourceType,
        params.resourceId ?? null,
        params.details ? JSON.stringify(params.details) : null,
        params.ipAddress,
      ]
    );

    return result.rows[0]!.id;
  }

  /**
   * Queries audit log entries with optional filtering and pagination.
   *
   * Supports filtering by:
   * - userId: filter by accessor identity
   * - action: filter by action performed
   * - resourceType: filter by resource type accessed
   * - startDate/endDate: filter by time range
   *
   * Results are paginated and ordered by most recent first.
   */
  async queryEntries(filter: AuditLogFilter = {}): Promise<AuditLogQueryResult> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(filter.userId);
      paramIndex++;
    }

    if (filter.action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(filter.action);
      paramIndex++;
    }

    if (filter.resourceType) {
      conditions.push(`resource_type = $${paramIndex}`);
      params.push(filter.resourceType);
      paramIndex++;
    }

    if (filter.startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(filter.startDate);
      paramIndex++;
    }

    if (filter.endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(filter.endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_log ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Get paginated entries
    const entriesResult = await this.db.query<{
      id: string;
      user_id: string;
      user_role: string;
      action: string;
      resource_type: string;
      resource_id: string | null;
      details: Record<string, unknown> | null;
      ip_address: string;
      created_at: string;
    }>(
      `SELECT id, user_id, user_role, action, resource_type, resource_id, details, ip_address, created_at
       FROM audit_log
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSize, offset]
    );

    const entries: AuditLogEntry[] = entriesResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userRole: row.user_role,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      ipAddress: row.ip_address,
      createdAt: new Date(row.created_at).toISOString(),
    }));

    return {
      entries,
      total,
      page,
      pageSize,
    };
  }
}
