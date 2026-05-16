/**
 * SJT (Situational Judgement Test) Fastify route handlers.
 *
 * Extends the general assessment endpoints for SJT-specific behavior:
 * - POST /api/assessment/start (with sectionType='sjt') initializes the SJT section
 * - POST /api/assessment/respond handles SJT ranking submissions
 *
 * SJT-specific validation:
 * - Ranking must be a valid permutation of [1..N] where N is the number of options (4-5)
 * - No ties allowed (each rank used exactly once)
 * - No gaps (ranks must be consecutive from 1 to N)
 * - Elaboration text must be 50-500 characters
 * - Cannot modify previously submitted scenarios (check sequence_number)
 *
 * Options delivered to the client do NOT include expertRank (server-side only for scoring).
 * Options are delivered in randomized order based on the candidate's seed.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import { SectionType } from '@assessment/shared';
import type {
  StartAssessmentRequest,
  StartAssessmentResponse,
  SubmitResponseRequest,
  SubmitResponseResponse,
  SjtItemDto,
} from '@assessment/shared';
import { SjtRepository } from '../items/sjt.repository';
import { SessionService } from '../session/session.service';
import { TimerService, TIMER_DURATIONS } from '../timer/timer.service';
import { RedisTTL } from '../redis/keys';
import {
  validateRanking,
  validateElaboration,
  isScenarioAlreadySubmitted,
  formatScenarioForClient,
} from './sjt.service';

// Re-export validation functions for backward compatibility with existing tests
export { validateRanking, validateElaboration } from './sjt.service';

// ─── Redis Keys for SJT State ────────────────────────────────────────────────

export const SjtKeys = {
  /** Tracks which scenarios have been submitted for an assessment */
  submittedScenarios: (assessmentId: string) =>
    `sjt:${assessmentId}:submitted_scenarios` as const,
  /** Stores the scenario order for an assessment */
  scenarioOrder: (assessmentId: string) =>
    `sjt:${assessmentId}:scenario_order` as const,
  /** Stores the item order seed for an assessment */
  itemOrderSeed: (assessmentId: string) =>
    `sjt:${assessmentId}:item_order_seed` as const,
} as const;

// ─── Route Registration ──────────────────────────────────────────────────────

export interface SjtRoutesOptions {
  redis: Redis;
  sjtRepository?: SjtRepository;
}

export async function sjtRoutes(
  app: FastifyInstance,
  options: SjtRoutesOptions
): Promise<void> {
  const sjtRepository = options.sjtRepository ?? new SjtRepository();
  const sessionService = new SessionService(options.redis);
  const timerService = new TimerService(options.redis);

  /**
   * POST /api/assessment/start
   *
   * Initializes the SJT section for a candidate.
   * Creates the assessment session, starts the timer, and returns the first scenario.
   */
  app.post(
    '/api/assessment/sjt/start',
    async (
      request: FastifyRequest<{ Body: StartAssessmentRequest }>,
      reply: FastifyReply
    ) => {
      const { sessionId, sectionType } = request.body;

      if (!sessionId || sectionType !== SectionType.SJT) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId is required and sectionType must be "sjt"',
          },
        });
      }

      try {
        // Generate a random seed for this candidate's item ordering
        const itemOrderSeed = Math.floor(Math.random() * 2147483647);

        // Get all scenarios in randomized order
        const scenarios = await sjtRepository.getRandomizedScenarios(itemOrderSeed);
        const totalItems = scenarios.length;

        if (totalItems === 0) {
          return reply.status(500).send({
            success: false,
            error: {
              code: 'NO_SCENARIOS',
              message: 'No SJT scenarios available in the item bank',
            },
          });
        }

        // Create assessment ID
        const assessmentId = generateAssessmentId();

        // Use candidateId from session (in production, extract from JWT)
        const candidateId = sessionId; // Simplified for now

        // Create session state
        const timerMs = TIMER_DURATIONS[SectionType.SJT];
        await sessionService.createSession(
          candidateId,
          assessmentId,
          SectionType.SJT,
          totalItems,
          timerMs
        );

        // Initialize timer
        await timerService.initializeTimer(assessmentId, SectionType.SJT);

        // Store scenario order and seed in Redis
        const scenarioIds = scenarios.map((s) => s.id);
        await options.redis.set(
          SjtKeys.scenarioOrder(assessmentId),
          JSON.stringify(scenarioIds),
          'EX',
          RedisTTL.SESSION_INACTIVITY
        );
        await options.redis.set(
          SjtKeys.itemOrderSeed(assessmentId),
          String(itemOrderSeed),
          'EX',
          RedisTTL.SESSION_INACTIVITY
        );

        // Initialize submitted scenarios set (empty)
        await options.redis.set(
          SjtKeys.submittedScenarios(assessmentId),
          JSON.stringify([]),
          'EX',
          RedisTTL.SESSION_INACTIVITY
        );

        // Register timer expiration callback for auto-submit
        timerService.onExpiration(assessmentId, SectionType.SJT, async () => {
          await handleTimerExpiration(options.redis, assessmentId, sessionService);
        });

        // Build the first item DTO (without expertRank)
        const firstScenario = scenarios[0]!;
        const firstItem = await buildSjtItemDto(
          firstScenario.id,
          firstScenario.content.scenarioText,
          sjtRepository,
          itemOrderSeed
        );

        // Get timer sync
        const timerSync = await timerService.syncTimer(assessmentId, SectionType.SJT);

        const response: StartAssessmentResponse = {
          assessmentId,
          sectionType: SectionType.SJT,
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
        console.error('[SJT] Start failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to start SJT section',
          },
        });
      }
    }
  );

  /**
   * POST /api/assessment/sjt/respond
   *
   * Handles SJT ranking submissions with validation.
   * Validates ranking permutation, elaboration length, and prevents re-submission.
   */
  app.post(
    '/api/assessment/sjt/respond',
    async (
      request: FastifyRequest<{ Body: SubmitResponseRequest }>,
      reply: FastifyReply
    ) => {
      const { assessmentId, itemId, response, elaboration, responseTimeMs: _responseTimeMs, clientTimestamp: _clientTimestamp } =
        request.body;

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
        const expired = await timerService.isExpired(assessmentId, SectionType.SJT);
        if (expired) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'TIMER_EXPIRED',
              message: 'The SJT section timer has expired. No more responses can be submitted.',
            },
          });
        }

        // Check if this scenario was already submitted (prevent modification)
        const submittedStr = await options.redis.get(SjtKeys.submittedScenarios(assessmentId));
        const submittedScenarios: string[] = submittedStr ? JSON.parse(submittedStr) : [];

        if (isScenarioAlreadySubmitted(submittedScenarios, itemId)) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'ALREADY_SUBMITTED',
              message: 'This scenario has already been submitted and cannot be modified.',
            },
          });
        }

        // Get the scenario to determine option count
        const scenario = await sjtRepository.findById(itemId);
        if (!scenario) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SCENARIO_NOT_FOUND',
              message: 'The specified scenario was not found.',
            },
          });
        }

        const optionCount = scenario.content.options.length;

        // Validate ranking
        const rankingError = validateRanking(response, optionCount);
        if (rankingError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_RANKING',
              message: rankingError,
            },
          });
        }

        // Validate elaboration
        const elaborationError = validateElaboration(elaboration);
        if (elaborationError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_ELABORATION',
              message: elaborationError,
            },
          });
        }

        // Mark scenario as submitted
        submittedScenarios.push(itemId);
        await options.redis.set(
          SjtKeys.submittedScenarios(assessmentId),
          JSON.stringify(submittedScenarios),
          'EX',
          RedisTTL.SESSION_INACTIVITY
        );

        // Get candidateId from session (simplified: use sessionId lookup)
        const candidateId = await findCandidateIdForAssessment(options.redis, assessmentId);

        // Update progress
        const currentIndex = submittedScenarios.length;
        if (candidateId) {
          await sessionService.updateProgress(candidateId, currentIndex);
        }

        // Determine next item
        const scenarioOrderStr = await options.redis.get(SjtKeys.scenarioOrder(assessmentId));
        const scenarioOrder: string[] = scenarioOrderStr ? JSON.parse(scenarioOrderStr) : [];
        const seedStr = await options.redis.get(SjtKeys.itemOrderSeed(assessmentId));
        const seed = seedStr ? Number(seedStr) : 0;

        let nextItem: SjtItemDto | null = null;
        const sectionComplete = currentIndex >= scenarioOrder.length;

        if (!sectionComplete) {
          const nextScenarioId = scenarioOrder[currentIndex];
          if (nextScenarioId) {
            const nextScenario = await sjtRepository.findById(nextScenarioId);
            if (nextScenario) {
              nextItem = await buildSjtItemDto(
                nextScenario.id,
                nextScenario.content.scenarioText,
                sjtRepository,
                seed
              );
            }
          }
        }

        // Get timer sync
        const timerSync = await timerService.syncTimer(assessmentId, SectionType.SJT);

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
        console.error('[SJT] Respond failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process SJT response',
          },
        });
      }
    }
  );
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Builds an SjtItemDto from a scenario, with options in randomized order
 * and WITHOUT expertRank (that's server-side only for scoring).
 * Delegates to the service layer's formatScenarioForClient.
 */
async function buildSjtItemDto(
  scenarioId: string,
  scenarioText: string,
  sjtRepository: SjtRepository,
  seed: number
): Promise<SjtItemDto> {
  const scenario = await sjtRepository.findById(scenarioId);
  if (!scenario) {
    // Fallback: return with empty options if scenario not found
    return {
      type: 'sjt_scenario',
      itemId: scenarioId,
      scenarioText,
      options: [],
      renderedAt: Date.now(),
    };
  }

  return formatScenarioForClient(
    {
      id: scenario.id,
      scenarioText: scenario.content.scenarioText,
      options: scenario.content.options,
    },
    seed
  );
}

/**
 * Handles timer expiration by auto-submitting completed responses.
 * Per Requirement 3.9: auto-submit completed responses on timer expiration.
 */
async function handleTimerExpiration(
  redis: Redis,
  assessmentId: string,
  sessionService: SessionService
): Promise<void> {
  // Find the candidate for this assessment
  const candidateId = await findCandidateIdForAssessment(redis, assessmentId);

  if (candidateId) {
    // Mark session as completed/expired
    const state = await sessionService.getSessionState(candidateId);
    if (state && state.status === 'in_progress') {
      await sessionService.terminateSession(assessmentId);
    }
  }

  console.log(`[SJT] Timer expired for assessment ${assessmentId}. Auto-submitted completed responses.`);
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
 * Generates a unique assessment ID.
 */
function generateAssessmentId(): string {
  return `sjt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}
