/**
 * Assessment Security Events Route Handler.
 *
 * Handles logging of security events during active assessment sessions:
 * - Navigation away attempts (Req 15.4)
 * - Tab/window focus loss with focus_loss_count increment (Req 15.6)
 * - Copy/print/screenshot attempts (Req 15.3)
 *
 * Also provides middleware to prevent access to assessment content
 * outside of active authenticated sessions (Req 15.2).
 *
 * Validates: Requirements 15.2, 15.3, 15.4, 15.6
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import type { Pool } from 'pg';
import { RedisTTL } from '../redis/keys';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SecurityEventType =
  | 'navigation_attempt'
  | 'focus_loss'
  | 'copy_attempt'
  | 'print_attempt';

export interface SecurityEventRequest {
  assessmentId: string;
  eventType: SecurityEventType;
  timestamp: number;
  details?: string;
}

export interface SecurityEventsRoutesOptions {
  redis: Redis;
  db?: Pool;
}

// ─── Redis Keys for Security State ──────────────────────────────────────────

export const SecurityKeys = {
  /** Focus loss counter for an assessment */
  focusLossCount: (assessmentId: string) =>
    `security:${assessmentId}:focus_loss_count` as const,
  /** Navigation attempts log for an assessment */
  navigationAttempts: (assessmentId: string) =>
    `security:${assessmentId}:navigation_attempts` as const,
} as const;

// ─── Validation ──────────────────────────────────────────────────────────────

const VALID_EVENT_TYPES: SecurityEventType[] = [
  'navigation_attempt',
  'focus_loss',
  'copy_attempt',
  'print_attempt',
];

function validateSecurityEventRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'Request body is required';
  }

  const { assessmentId, eventType, timestamp } = body as Record<string, unknown>;

  if (!assessmentId || typeof assessmentId !== 'string') {
    return 'assessmentId is required and must be a string';
  }

  if (!eventType || typeof eventType !== 'string') {
    return 'eventType is required and must be a string';
  }

  if (!VALID_EVENT_TYPES.includes(eventType as SecurityEventType)) {
    return `eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`;
  }

  if (!timestamp || typeof timestamp !== 'number') {
    return 'timestamp is required and must be a number';
  }

  return null;
}

// ─── Route Registration ──────────────────────────────────────────────────────

export async function securityEventsRoutes(
  app: FastifyInstance,
  options: SecurityEventsRoutesOptions
): Promise<void> {
  /**
   * POST /api/assessment/security-event
   *
   * Logs a security event during an active assessment session.
   * - Validates the assessment session is active
   * - Increments focus_loss_count for focus_loss events
   * - Appends navigation attempts to the assessment record
   * - Logs all events for audit purposes
   */
  app.post(
    '/api/assessment/security-event',
    async (
      request: FastifyRequest<{ Body: SecurityEventRequest }>,
      reply: FastifyReply
    ) => {
      const validationError = validateSecurityEventRequest(request.body);
      if (validationError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: validationError,
          },
        });
      }

      const { assessmentId, eventType, timestamp, details } = request.body;

      try {
        // Verify the assessment session is active by checking Redis
        const sessionActive = await isAssessmentSessionActive(options.redis, assessmentId);
        if (!sessionActive) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'SESSION_NOT_ACTIVE',
              message: 'Security events can only be reported for active assessment sessions',
            },
          });
        }

        // Handle the event based on type
        switch (eventType) {
          case 'focus_loss': {
            // Increment focus loss counter in Redis
            const newCount = await options.redis.incr(SecurityKeys.focusLossCount(assessmentId));
            // Set TTL if this is the first increment
            if (newCount === 1) {
              await options.redis.expire(
                SecurityKeys.focusLossCount(assessmentId),
                RedisTTL.SESSION_INACTIVITY
              );
            }

            // Also update the database if available
            if (options.db) {
              await options.db.query(
                'UPDATE assessments SET focus_loss_count = focus_loss_count + 1 WHERE id = $1::text::uuid OR id::text = $1',
                [assessmentId]
              );
            }

            app.log.info(
              { assessmentId, eventType, count: newCount, details },
              'Focus loss detected'
            );
            break;
          }

          case 'navigation_attempt': {
            // Append to navigation attempts log in Redis
            const attemptEntry = JSON.stringify({
              timestamp,
              details: details || 'Navigation attempt',
            });
            await options.redis.rpush(
              SecurityKeys.navigationAttempts(assessmentId),
              attemptEntry
            );
            await options.redis.expire(
              SecurityKeys.navigationAttempts(assessmentId),
              RedisTTL.SESSION_INACTIVITY
            );

            // Also update the database if available
            if (options.db) {
              await options.db.query(
                `UPDATE assessments 
                 SET navigation_attempts = navigation_attempts || $2::jsonb 
                 WHERE id = $1::text::uuid OR id::text = $1`,
                [
                  assessmentId,
                  JSON.stringify([{ timestamp, details: details || 'Navigation attempt' }]),
                ]
              );
            }

            app.log.info(
              { assessmentId, eventType, timestamp, details },
              'Navigation attempt detected'
            );
            break;
          }

          case 'copy_attempt':
          case 'print_attempt': {
            // Log the attempt (these don't have dedicated DB columns)
            app.log.warn(
              { assessmentId, eventType, timestamp, details },
              `${eventType} detected during active session`
            );
            break;
          }
        }

        return reply.status(200).send({
          success: true,
          data: {
            logged: true,
            eventType,
            timestamp,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        app.log.error({ assessmentId, eventType, error: message }, 'Failed to log security event');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to log security event',
          },
        });
      }
    }
  );

  /**
   * GET /api/assessment/security-event/:assessmentId/summary
   *
   * Returns a summary of security events for an assessment.
   * Intended for administrator reports.
   */
  app.get(
    '/api/assessment/security-event/:assessmentId/summary',
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
        // Get focus loss count from Redis
        const focusLossCountStr = await options.redis.get(
          SecurityKeys.focusLossCount(assessmentId)
        );
        const focusLossCount = focusLossCountStr ? Number(focusLossCountStr) : 0;

        // Get navigation attempts from Redis
        const navigationAttemptsRaw = await options.redis.lrange(
          SecurityKeys.navigationAttempts(assessmentId),
          0,
          -1
        );
        const navigationAttempts = navigationAttemptsRaw.map((entry) => {
          try {
            return JSON.parse(entry);
          } catch {
            return { timestamp: 0, details: entry };
          }
        });

        return reply.status(200).send({
          success: true,
          data: {
            assessmentId,
            focusLossCount,
            navigationAttemptCount: navigationAttempts.length,
            navigationAttempts,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        app.log.error({ assessmentId, error: message }, 'Failed to get security event summary');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get security event summary',
          },
        });
      }
    }
  );
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Checks if an assessment session is currently active by looking up session state in Redis.
 * An active session is one that exists and has status 'in_progress'.
 *
 * Validates: Requirement 15.2 — prevents access outside active authenticated sessions.
 */
async function isAssessmentSessionActive(
  redis: Redis,
  assessmentId: string
): Promise<boolean> {
  // Scan session keys to find one matching this assessmentId
  const keys = await redis.keys('session:*:state');

  for (const key of keys) {
    const stateStr = await redis.get(key);
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr);
        if (state.assessmentId === assessmentId && state.status === 'in_progress') {
          return true;
        }
      } catch {
        continue;
      }
    }
  }

  return false;
}

// ─── Middleware: Active Session Guard ────────────────────────────────────────

/**
 * Creates a Fastify preHandler hook that ensures assessment content
 * is only accessible during an active, authenticated session.
 *
 * This middleware should be applied to all assessment content endpoints
 * (current-item, respond, etc.) to enforce Requirement 15.2.
 *
 * Validates: Requirement 15.2
 */
export function createActiveSessionGuard(redis: Redis) {
  return async function activeSessionGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Extract assessmentId from body or query
    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, unknown> | undefined;
    const assessmentId =
      (body?.assessmentId as string) || (query?.assessmentId as string);

    if (!assessmentId) {
      // If no assessmentId provided, let the route handler deal with validation
      return;
    }

    const isActive = await isAssessmentSessionActive(redis, assessmentId);
    if (!isActive) {
      reply.status(403).send({
        success: false,
        error: {
          code: 'SESSION_NOT_ACTIVE',
          message: 'Assessment content is only accessible during an active, authenticated session',
        },
      });
    }
  };
}

export { isAssessmentSessionActive };
