/**
 * Admin module exports.
 * Provides session management and audit log APIs for administrators.
 */

export { AdminSessionService } from './session.service';
export type { CreateSessionResult, ValidationError } from './session.service';

export { adminSessionRoutes } from './session.routes';
export type { AdminSessionRoutesOptions } from './session.routes';

export { AuditLogService } from './audit-log.service';
export type {
  AuditLogEntry,
  RecordAuditEventParams,
  AuditLogFilter,
  AuditLogQueryResult,
} from './audit-log.service';

export { auditLogRoutes } from './audit-log.routes';
export type { AuditLogRoutesOptions } from './audit-log.routes';
