/**
 * Session management Fastify route handlers.
 *
 * Endpoints:
 * - POST /api/assessment/heartbeat — Client heartbeat for session monitoring
 * - POST /api/assessment/resume — Resume an interrupted session
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import { SessionService } from './session.service';
import { SectionType } from '@assessment/shared';
import type {
  HeartbeatRequest,
  HeartbeatResponse,
  ResumeAssessmentRequest,
  ResumeAssessmentResponse,
} from '@assessment/shared';

// ─── Route Registration ──────────────────────────────────────────────────────

export interface SessionRoutesOptions {
  redis: Redis;
}

export async function sessionRoutes(
  app: FastifyInstance,
  options: SessionRoutesOptions
): Promise<void> {
  const sessionService = new SessionService(options.redis);

  /**
   * POST /api/assessment/heartbeat
   *
   * Accepts { assessmentId, clientTimestamp } and returns TimerSync data.
   * Updates the last-seen timestamp in Redis to indicate the client is still connected.
   */
  app.post(
    '/api/assessment/heartbeat',
    async (
      request: FastifyRequest<{ Body: HeartbeatRequest }>,
      reply: FastifyReply
    ) => {
      const { assessmentId, clientTimestamp: _clientTimestamp } = request.body;

      if (!assessmentId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'assessmentId is required',
          },
        });
      }

      try {
        const result = await sessionService.updateHeartbeat(assessmentId);

        const response: HeartbeatResponse = {
          timerSync: {
            sectionId: assessmentId,
            remainingMs: result.remainingMs,
            serverTimestamp: result.serverTimestamp,
          },
          sessionValid: result.sessionValid,
        };

        return reply.status(200).send({
          success: true,
          data: response,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Session] Heartbeat update failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process heartbeat',
          },
        });
      }
    }
  );

  /**
   * POST /api/assessment/resume
   *
   * Accepts { assessmentId } and returns ResumeAssessmentResponse.
   * Restores session state with timer restored to pre-interruption value.
   */
  app.post(
    '/api/assessment/resume',
    async (
      request: FastifyRequest<{ Body: ResumeAssessmentRequest }>,
      reply: FastifyReply
    ) => {
      const { assessmentId } = request.body;

      if (!assessmentId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'assessmentId is required',
          },
        });
      }

      try {
        const result = await sessionService.resumeSession(assessmentId);

        if (!result) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SESSION_NOT_FOUND',
              message:
                'Session not found or resumption window has expired. The session may have been terminated.',
            },
          });
        }

        const response: ResumeAssessmentResponse = {
          assessmentId: result.sessionState.assessmentId,
          sectionType: result.sessionState.sectionType as SectionType,
          currentItem: {
            type: 'forced_choice',
            itemId: 'placeholder',
            statementLeft: '',
            statementRight: '',
            renderedAt: result.serverTimestamp,
          },
          currentIndex: result.sessionState.currentItemIndex,
          totalItems: result.sessionState.totalItems,
          timerSync: {
            sectionId: result.sessionState.assessmentId,
            remainingMs: result.remainingMs,
            serverTimestamp: result.serverTimestamp,
          },
        };

        return reply.status(200).send({
          success: true,
          data: response,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Session] Session resume failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to resume session',
          },
        });
      }
    }
  );
}
