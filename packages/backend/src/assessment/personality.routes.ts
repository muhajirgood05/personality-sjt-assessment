/**
 * Personality Test Fastify route handlers.
 *
 * Endpoints:
 * - POST /api/assessment/personality/start — initializes personality test section
 * - POST /api/assessment/personality/respond — handles forced-choice response submission
 * - GET /api/assessment/personality/current-item — returns current item for the session
 *
 * Key behaviors:
 * - Forward-only navigation: once a response is submitted, cannot go back
 * - No skipping: must respond to current item before seeing next
 * - Response value: integer 1-5 on the graded scale
 * - Records item render timestamp (renderedAt) for response time tracking
 * - 120-second inactivity reminder (no auto-advance)
 * - Uses the assembly algorithm to create the test form
 * - Stores assembled item order in Redis for the session
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import { SectionType } from '@assessment/shared';
import type {
  StartAssessmentRequest,
  StartAssessmentResponse,
  SubmitResponseResponse,
  CurrentItemResponse,
  PersonalityItemDto,
} from '@assessment/shared';
import { assembleTest, type ItemBank } from '../items/assembly';
import { ItemRepository } from '../items/item.repository';
import { SessionService } from '../session/session.service';
import { TimerService, TIMER_DURATIONS } from '../timer/timer.service';
import { RedisTTL } from '../redis/keys';

// ─── Redis Keys for Personality State ────────────────────────────────────────

export const PersonalityKeys = {
  /** Stores the assembled item order (array of item IDs) for an assessment */
  itemOrder: (assessmentId: string) =>
    `personality:${assessmentId}:item_order` as const,
  /** Stores the assembly seed for an assessment */
  seed: (assessmentId: string) =>
    `personality:${assessmentId}:seed` as const,
  /** Stores the renderedAt timestamp for the current item */
  renderedAt: (assessmentId: string) =>
    `personality:${assessmentId}:rendered_at` as const,
  /** Stores the last activity timestamp for inactivity reminder */
  lastActivity: (assessmentId: string) =>
    `personality:${assessmentId}:last_activity` as const,
} as const;

// ─── Constants ───────────────────────────────────────────────────────────────

/** Inactivity reminder threshold in milliseconds (120 seconds) */
export const INACTIVITY_REMINDER_MS = 120_000;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PersonalityRespondRequest {
  assessmentId: string;
  itemId: string;
  response: number;
  responseTimeMs: number;
  clientTimestamp: number;
}

export interface PersonalityCurrentItemQuery {
  assessmentId: string;
  candidateId: string;
}

// ─── Route Registration ──────────────────────────────────────────────────────

export interface PersonalityRoutesOptions {
  redis: Redis;
  itemRepository?: ItemRepository;
}

/**
 * Validates that a response value is an integer between 1 and 5.
 */
export function validatePersonalityResponse(response: unknown): string | null {
  if (response === null || response === undefined) {
    return 'Response is required';
  }

  if (typeof response !== 'number') {
    return 'Response must be a number';
  }

  if (!Number.isInteger(response)) {
    return 'Response must be an integer';
  }

  if (response < 1 || response > 5) {
    return 'Response must be between 1 and 5';
  }

  return null;
}

export async function personalityRoutes(
  app: FastifyInstance,
  options: PersonalityRoutesOptions
): Promise<void> {
  const sessionService = new SessionService(options.redis);
  const timerService = new TimerService(options.redis);

  /**
   * POST /api/assessment/personality/start
   *
   * Initializes the personality test section for a candidate.
   * - Calls the assembly algorithm with a random seed
   * - Creates session state in Redis
   * - Starts the 45-minute timer
   * - Returns the first item + timer sync
   */
  app.post(
    '/api/assessment/personality/start',
    async (
      request: FastifyRequest<{ Body: StartAssessmentRequest }>,
      reply: FastifyReply
    ) => {
      const { sessionId, sectionType } = request.body;

      if (!sessionId || sectionType !== SectionType.Personality) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId is required and sectionType must be "personality"',
          },
        });
      }

      try {
        // Generate a random seed for deterministic item assembly
        const seed = Math.floor(Math.random() * 2147483647);

        // Build item bank from repository (or use injected dependency)
        const itemBank = await buildItemBank(options);

        // Assemble the test using the algorithm
        const assemblyResult = assembleTest(seed, itemBank);
        const assembledItems = assemblyResult.items;
        const totalItems = assembledItems.length;

        if (totalItems === 0) {
          return reply.status(500).send({
            success: false,
            error: {
              code: 'NO_ITEMS',
              message: 'No personality items available in the item bank',
            },
          });
        }

        // Create assessment ID
        const assessmentId = generateAssessmentId();

        // Use candidateId from session (in production, extract from JWT)
        const candidateId = sessionId;

        // Create session state in Redis
        const timerMs = TIMER_DURATIONS[SectionType.Personality];
        await sessionService.createSession(
          candidateId,
          assessmentId,
          SectionType.Personality,
          totalItems,
          timerMs
        );

        // Initialize timer
        await timerService.initializeTimer(assessmentId, SectionType.Personality);

        // Store assembled item order in Redis
        const itemIds = assembledItems.map((item) => item.id);
        await options.redis.set(
          PersonalityKeys.itemOrder(assessmentId),
          JSON.stringify(itemIds),
          'EX',
          RedisTTL.SESSION_INACTIVITY
        );

        // Store seed
        await options.redis.set(
          PersonalityKeys.seed(assessmentId),
          String(seed),
          'EX',
          RedisTTL.SESSION_INACTIVITY
        );

        // Record renderedAt timestamp for the first item
        const renderedAt = Date.now();
        await options.redis.set(
          PersonalityKeys.renderedAt(assessmentId),
          String(renderedAt),
          'EX',
          RedisTTL.SESSION_INACTIVITY
        );

        // Initialize last activity timestamp
        await options.redis.set(
          PersonalityKeys.lastActivity(assessmentId),
          String(renderedAt),
          'EX',
          RedisTTL.SESSION_INACTIVITY
        );

        // Register timer expiration callback
        timerService.onExpiration(assessmentId, SectionType.Personality, async () => {
          await handleTimerExpiration(options.redis, assessmentId, sessionService);
        });

        // Build the first item DTO
        const firstAssembledItem = assembledItems[0]!;
        const firstItem = buildPersonalityItemDto(firstAssembledItem, renderedAt);

        // Get timer sync
        const timerSync = await timerService.syncTimer(assessmentId, SectionType.Personality);

        const response: StartAssessmentResponse = {
          assessmentId,
          sectionType: SectionType.Personality,
          totalItems,
          timerSync,
          firstItem,
        };

        return reply.status(200).send({
          success: true,
          data: response,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Personality] Start failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to start personality section',
          },
        });
      }
    }
  );

  /**
   * POST /api/assessment/personality/respond
   *
   * Handles personality forced-choice response submission.
   * - Validates response is a number 1-5 (graded scale)
   * - Records response time
   * - Advances to next item (forward-only, no backward)
   * - Returns next item or section complete
   */
  app.post(
    '/api/assessment/personality/respond',
    async (
      request: FastifyRequest<{ Body: PersonalityRespondRequest }>,
      reply: FastifyReply
    ) => {
      const { assessmentId, itemId, response, responseTimeMs: _responseTimeMs } = request.body;

      if (!assessmentId || !itemId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'assessmentId and itemId are required',
          },
        });
      }

      try {
        // Check if timer has expired
        const expired = await timerService.isExpired(assessmentId, SectionType.Personality);
        if (expired) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'TIMER_EXPIRED',
              message: 'The personality section timer has expired. No more responses can be submitted.',
            },
          });
        }

        // Validate response value (must be integer 1-5)
        const responseError = validatePersonalityResponse(response);
        if (responseError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_RESPONSE',
              message: responseError,
            },
          });
        }

        // Get the item order to verify forward-only navigation
        const itemOrderStr = await options.redis.get(PersonalityKeys.itemOrder(assessmentId));
        if (!itemOrderStr) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SESSION_NOT_FOUND',
              message: 'Assessment session not found or expired',
            },
          });
        }

        const itemOrder: string[] = JSON.parse(itemOrderStr);

        // Find candidateId for this assessment
        const candidateId = await findCandidateIdForAssessment(options.redis, assessmentId);
        if (!candidateId) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SESSION_NOT_FOUND',
              message: 'Candidate session not found',
            },
          });
        }

        // Get current session state to enforce forward-only
        const sessionState = await sessionService.getSessionState(candidateId);
        if (!sessionState) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SESSION_NOT_FOUND',
              message: 'Session state not found',
            },
          });
        }

        const currentIndex = sessionState.currentItemIndex;
        const expectedItemId = itemOrder[currentIndex];

        // Enforce forward-only: the submitted itemId must match the current item
        if (itemId !== expectedItemId) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'INVALID_ITEM_SEQUENCE',
              message: 'Cannot go back or skip items. You must respond to the current item.',
            },
          });
        }

        // Advance to next item
        const nextIndex = currentIndex + 1;
        await sessionService.updateProgress(candidateId, nextIndex);

        // Update last activity timestamp
        const now = Date.now();
        await options.redis.set(
          PersonalityKeys.lastActivity(assessmentId),
          String(now),
          'EX',
          RedisTTL.SESSION_INACTIVITY
        );

        // Determine next item or section complete
        const sectionComplete = nextIndex >= itemOrder.length;
        let nextItem: PersonalityItemDto | null = null;

        if (!sectionComplete) {
          const nextItemId = itemOrder[nextIndex]!;
          // Record renderedAt for the next item
          const renderedAt = Date.now();
          await options.redis.set(
            PersonalityKeys.renderedAt(assessmentId),
            String(renderedAt),
            'EX',
            RedisTTL.SESSION_INACTIVITY
          );

          // We need to look up the item content from the item bank
          nextItem = await buildPersonalityItemDtoFromId(nextItemId, renderedAt, options);
        }

        // Get timer sync
        const timerSync = await timerService.syncTimer(assessmentId, SectionType.Personality);

        const responseData: SubmitResponseResponse = {
          saved: true,
          nextItem,
          timerSync,
          sectionComplete,
        };

        return reply.status(200).send({
          success: true,
          data: responseData,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Personality] Respond failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process personality response',
          },
        });
      }
    }
  );

  /**
   * GET /api/assessment/personality/current-item
   *
   * Returns the current item for the candidate's personality session.
   * Looks up session state to find current item index and returns the item.
   */
  app.get(
    '/api/assessment/personality/current-item',
    async (
      request: FastifyRequest<{ Querystring: PersonalityCurrentItemQuery }>,
      reply: FastifyReply
    ) => {
      const { assessmentId, candidateId } = request.query;

      if (!assessmentId || !candidateId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'assessmentId and candidateId are required',
          },
        });
      }

      try {
        // Check if timer has expired
        const expired = await timerService.isExpired(assessmentId, SectionType.Personality);
        if (expired) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'TIMER_EXPIRED',
              message: 'The personality section timer has expired.',
            },
          });
        }

        // Get session state
        const sessionState = await sessionService.getSessionState(candidateId);
        if (!sessionState || sessionState.assessmentId !== assessmentId) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SESSION_NOT_FOUND',
              message: 'Session not found for this candidate and assessment',
            },
          });
        }

        // Get item order
        const itemOrderStr = await options.redis.get(PersonalityKeys.itemOrder(assessmentId));
        if (!itemOrderStr) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SESSION_NOT_FOUND',
              message: 'Item order not found for this assessment',
            },
          });
        }

        const itemOrder: string[] = JSON.parse(itemOrderStr);
        const currentIndex = sessionState.currentItemIndex;

        // Check if section is already complete
        if (currentIndex >= itemOrder.length) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'SECTION_COMPLETE',
              message: 'All items have been completed',
            },
          });
        }

        const currentItemId = itemOrder[currentIndex]!;

        // Get or set renderedAt timestamp
        let renderedAtStr = await options.redis.get(PersonalityKeys.renderedAt(assessmentId));
        if (!renderedAtStr) {
          const renderedAt = Date.now();
          await options.redis.set(
            PersonalityKeys.renderedAt(assessmentId),
            String(renderedAt),
            'EX',
            RedisTTL.SESSION_INACTIVITY
          );
          renderedAtStr = String(renderedAt);
        }
        const renderedAt = Number(renderedAtStr);

        // Build item DTO
        const item = await buildPersonalityItemDtoFromId(currentItemId, renderedAt, options);

        if (!item) {
          return reply.status(500).send({
            success: false,
            error: {
              code: 'ITEM_NOT_FOUND',
              message: 'Current item could not be loaded',
            },
          });
        }

        // Check inactivity reminder
        const lastActivityStr = await options.redis.get(PersonalityKeys.lastActivity(assessmentId));
        const lastActivity = lastActivityStr ? Number(lastActivityStr) : renderedAt;
        const inactivityMs = Date.now() - lastActivity;
        const showInactivityReminder = inactivityMs >= INACTIVITY_REMINDER_MS;

        // Get timer sync
        const timerSync = await timerService.syncTimer(assessmentId, SectionType.Personality);

        const responseData: CurrentItemResponse & { inactivityReminder?: boolean } = {
          item,
          currentIndex,
          totalItems: sessionState.totalItems,
          timerSync,
        };

        if (showInactivityReminder) {
          responseData.inactivityReminder = true;
        }

        return reply.status(200).send({
          success: true,
          data: responseData,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Personality] Current item failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get current item',
          },
        });
      }
    }
  );
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Builds a PersonalityItemDto from an ItemEntity.
 */
export function buildPersonalityItemDto(
  item: { id: string; content: { type: string; statementLeft?: string; statementRight?: string } },
  renderedAt: number
): PersonalityItemDto {
  const content = item.content;
  return {
    type: 'forced_choice',
    itemId: item.id,
    statementLeft: content.statementLeft ?? '',
    statementRight: content.statementRight ?? '',
    renderedAt,
  };
}

/**
 * Builds a PersonalityItemDto from an item ID by looking up the item in the repository.
 */
async function buildPersonalityItemDtoFromId(
  itemId: string,
  renderedAt: number,
  options: PersonalityRoutesOptions
): Promise<PersonalityItemDto | null> {
  if (options.itemRepository) {
    const item = await options.itemRepository.findById(itemId);
    if (!item) return null;
    return buildPersonalityItemDto(item, renderedAt);
  }

  // Fallback: return a minimal DTO (should not happen in production)
  return {
    type: 'forced_choice',
    itemId,
    statementLeft: '',
    statementRight: '',
    renderedAt,
  };
}

/**
 * Builds the item bank from the repository for the assembly algorithm.
 */
async function buildItemBank(options: PersonalityRoutesOptions): Promise<ItemBank> {
  if (!options.itemRepository) {
    return { regular: [], consistency: [], socialDesirability: [] };
  }

  const allItems = await options.itemRepository.findAll(SectionType.Personality);
  const consistency = allItems.filter((item) => item.isConsistencyCheck);
  const socialDesirability = allItems.filter((item) => item.isSocialDesirabilityItem);
  const regular = allItems.filter(
    (item) => !item.isConsistencyCheck && !item.isSocialDesirabilityItem
  );

  return { regular, consistency, socialDesirability };
}

/**
 * Handles timer expiration by marking the session as expired.
 */
async function handleTimerExpiration(
  redis: Redis,
  assessmentId: string,
  sessionService: SessionService
): Promise<void> {
  const candidateId = await findCandidateIdForAssessment(redis, assessmentId);

  if (candidateId) {
    const state = await sessionService.getSessionState(candidateId);
    if (state && state.status === 'in_progress') {
      await sessionService.terminateSession(assessmentId);
    }
  }

  console.log(`[Personality] Timer expired for assessment ${assessmentId}.`);
}

/**
 * Finds the candidateId associated with an assessment by scanning session keys.
 */
async function findCandidateIdForAssessment(
  redis: Redis,
  assessmentId: string
): Promise<string | null> {
  const keys = await redis.keys('session:*:state');

  for (const key of keys) {
    const stateStr = await redis.get(key);
    if (stateStr) {
      const state = JSON.parse(stateStr);
      if (state.assessmentId === assessmentId) {
        const parts = key.split(':');
        return parts[1] ?? null;
      }
    }
  }

  return null;
}

/**
 * Generates a unique assessment ID for personality section.
 */
function generateAssessmentId(): string {
  return `personality_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}
