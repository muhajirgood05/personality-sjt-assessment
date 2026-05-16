/**
 * Timer-related Fastify route handlers.
 *
 * Endpoints:
 * - GET /api/assessment/timer/:assessmentId — Get timer sync data for an assessment
 *
 * Note: Timer sync is also returned via the heartbeat response (session.routes.ts).
 * This dedicated endpoint allows clients to fetch timer state independently.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import { TimerService } from './timer.service';
import { SessionKeys } from '../redis/keys';
import type { SessionState } from '../session/session.service';

// ─── Route Registration ──────────────────────────────────────────────────────

export interface TimerRoutesOptions {
  redis: Redis;
}

export async function timerRoutes(
  app: FastifyInstance,
  options: TimerRoutesOptions
): Promise<void> {
  const timerService = new TimerService(options.redis);

  /**
   * GET /api/assessment/timer/:assessmentId
   *
   * Returns the current timer sync data for an assessment.
   * Looks up the section type from the session state to calculate remaining time.
   */
  app.get(
    '/api/assessment/timer/:assessmentId',
    async (
      request: FastifyRequest<{ Params: { assessmentId: string } }>,
      reply: FastifyReply
    ) => {
      const { assessmentId } = request.params;

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
        // Find the section type for this assessment by scanning session state
        const sectionType = await findSectionTypeForAssessment(options.redis, assessmentId);

        if (!sectionType) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'TIMER_NOT_FOUND',
              message: 'No active timer found for this assessment',
            },
          });
        }

        const timerSync = await timerService.syncTimer(assessmentId, sectionType);

        return reply.status(200).send({
          success: true,
          data: {
            timerSync,
            expired: timerSync.remainingMs <= 0,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Timer] Timer sync failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve timer state',
          },
        });
      }
    }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Finds the section type for an assessment by scanning session state keys.
 * In production, a reverse index (assessmentId -> sectionType) would be more efficient.
 */
async function findSectionTypeForAssessment(
  redis: Redis,
  assessmentId: string
): Promise<string | null> {
  const keys = await redis.keys('session:*:state');

  for (const key of keys) {
    const stateStr = await redis.get(key);
    if (stateStr) {
      const state = JSON.parse(stateStr) as SessionState;
      if (state.assessmentId === assessmentId) {
        return state.sectionType;
      }
    }
  }

  return null;
}
