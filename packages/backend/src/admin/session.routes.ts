/**
 * Admin session management Fastify route handlers.
 *
 * Endpoints:
 * - POST /api/admin/sessions — Create a new assessment session
 * - GET /api/admin/sessions — List all sessions with summary stats
 * - GET /api/admin/sessions/:id/candidates — Get candidate progress for a session
 *
 * All routes require Administrator role.
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.7
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Database } from '../db/connection';
import { AdminSessionService } from './session.service';
import { requireAdmin } from '../auth/rbac.middleware';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  SessionCandidatesResponse,
} from '@assessment/shared';

// ─── Route Registration ──────────────────────────────────────────────────────

export interface AdminSessionRoutesOptions {
  db: Database;
}

export async function adminSessionRoutes(
  app: FastifyInstance,
  options: AdminSessionRoutesOptions
): Promise<void> {
  const service = new AdminSessionService(options.db);
  const adminGuard = requireAdmin();

  /**
   * POST /api/admin/sessions
   *
   * Creates a new assessment session with validation:
   * - End date must be after start date
   * - Candidate list must not be empty (max 500)
   * - Timer durations must be between 60 and 7200 seconds
   *
   * Validates: Requirements 12.2, 12.7
   */
  app.post(
    '/api/admin/sessions',
    { preHandler: [adminGuard] },
    async (
      request: FastifyRequest<{ Body: CreateSessionRequest }>,
      reply: FastifyReply
    ) => {
      const body = request.body;

      // Validate the request
      const errors = service.validateCreateSession(body);
      if (errors.length > 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: errors[0]!.message,
            details: Object.fromEntries(errors.map((e) => [e.field, e.message])),
          },
        });
      }

      try {
        // Extract admin ID from JWT payload
        const user = request.user as { sub: string };
        const adminId = user.sub;

        const result = await service.createSession(adminId, body);

        const response: CreateSessionResponse = {
          sessionId: result.sessionId,
          name: result.name,
          startDate: result.startDate,
          endDate: result.endDate,
          candidateCount: result.candidateCount,
        };

        return reply.status(201).send({
          success: true,
          data: response,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Admin] Session creation failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create assessment session',
          },
        });
      }
    }
  );

  /**
   * GET /api/admin/sessions
   *
   * Lists all assessment sessions with summary statistics including:
   * - Active assessments count
   * - Candidate completion status summary
   * - Aggregate statistics
   *
   * Validates: Requirement 12.1
   */
  app.get(
    '/api/admin/sessions',
    { preHandler: [adminGuard] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessions = await service.listSessions();

        const response: ListSessionsResponse = {
          sessions,
        };

        return reply.status(200).send({
          success: true,
          data: response,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Admin] List sessions failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to list assessment sessions',
          },
        });
      }
    }
  );

  /**
   * GET /api/admin/sessions/:id/candidates
   *
   * Returns candidate progress for a specific session.
   * Progress is updated within 30 seconds of status change (real-time from DB).
   *
   * Validates: Requirement 12.3
   */
  app.get(
    '/api/admin/sessions/:id/candidates',
    { preHandler: [adminGuard] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id: sessionId } = request.params;

      try {
        // Check if session exists
        const exists = await service.sessionExists(sessionId);
        if (!exists) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SESSION_NOT_FOUND',
              message: 'Assessment session not found',
            },
          });
        }

        const candidates = await service.getSessionCandidates(sessionId);

        const response: SessionCandidatesResponse = {
          sessionId,
          candidates,
        };

        return reply.status(200).send({
          success: true,
          data: response,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Admin] Get session candidates failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve candidate progress',
          },
        });
      }
    }
  );
}
