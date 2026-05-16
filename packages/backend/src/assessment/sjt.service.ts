/**
 * SJT Service — Business logic for Situational Judgement Test delivery and response handling.
 *
 * Responsibilities:
 * - Validate ranking submissions (valid permutation of [1..N], no ties, no gaps)
 * - Validate elaboration text (50–500 characters)
 * - Check if a scenario was already submitted (prevent modification)
 * - Format scenario for client delivery (strip expertRank, randomize option order)
 *
 * Requirements: 3.3, 3.4, 3.7, 3.8, 3.9
 */

import type { SjtOptionDto, SjtItemDto } from '@assessment/shared';
import type { SjtOption } from '@assessment/shared';

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates that a ranking is a valid permutation of [1..N].
 * Rules:
 * - Must be an array of exactly `optionCount` integers
 * - Each rank used exactly once (no ties/duplicates)
 * - Ranks must be consecutive from 1 to N (no gaps, no zero-based)
 *
 * @param ranking - The ranking array to validate
 * @param optionCount - Expected number of options (N), typically 4 or 5
 * @returns null if valid, or an error message string if invalid
 */
export function validateRanking(ranking: unknown, optionCount: number): string | null {
  if (!Array.isArray(ranking)) {
    return 'Ranking must be an array';
  }

  if (ranking.length !== optionCount) {
    return `Ranking must contain exactly ${optionCount} values, got ${ranking.length}`;
  }

  // Check all values are integers
  for (const val of ranking) {
    if (typeof val !== 'number' || !Number.isInteger(val)) {
      return 'All ranking values must be integers';
    }
  }

  // Check it's a valid permutation of [1..N]
  const sorted = [...ranking].sort((a, b) => a - b);
  const expected = Array.from({ length: optionCount }, (_, i) => i + 1);

  for (let i = 0; i < optionCount; i++) {
    if (sorted[i] !== expected[i]) {
      return `Ranking must be a valid permutation of [1..${optionCount}] with no ties or gaps`;
    }
  }

  return null;
}

/**
 * Validates elaboration text meets the 50–500 character requirement.
 * The text is trimmed before length checking.
 *
 * @param text - The elaboration text to validate
 * @returns null if valid, or an error message string if invalid
 */
export function validateElaboration(text: unknown): string | null {
  if (text === undefined || text === null) {
    return 'Elaboration is required for SJT responses';
  }

  if (typeof text !== 'string') {
    return 'Elaboration must be a string';
  }

  const length = text.trim().length;

  if (length < 50) {
    return `Elaboration must be at least 50 characters (got ${length})`;
  }

  if (length > 500) {
    return `Elaboration must be at most 500 characters (got ${length})`;
  }

  return null;
}

// ─── Scenario State ──────────────────────────────────────────────────────────

/**
 * Checks if a scenario has already been submitted for a given assessment.
 * Once submitted, scenarios cannot be modified (Requirement 3.7).
 *
 * @param submittedScenarios - Array of already-submitted scenario IDs
 * @param itemId - The scenario ID to check
 * @returns true if the scenario was already submitted
 */
export function isScenarioAlreadySubmitted(
  submittedScenarios: string[],
  itemId: string
): boolean {
  return submittedScenarios.includes(itemId);
}

// ─── Scenario Formatting ─────────────────────────────────────────────────────

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Produces deterministic sequences for a given seed.
 */
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a seeded RNG for deterministic ordering.
 */
function seededShuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Simple string hash for combining with numeric seed.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}

/**
 * Formats a scenario for client delivery:
 * - Strips expertRank from options (server-side only for scoring)
 * - Randomizes option order using a deterministic seed
 *
 * The seed is combined with the scenario ID to produce unique per-scenario ordering.
 *
 * @param scenario - Object containing scenarioId, scenarioText, and options (with expertRank)
 * @param seed - The candidate's item order seed
 * @returns SjtItemDto ready for client delivery
 */
export function formatScenarioForClient(
  scenario: {
    id: string;
    scenarioText: string;
    options: SjtOption[];
  },
  seed: number
): SjtItemDto {
  // Combine scenario ID hash with seed for unique per-scenario randomization
  const combinedSeed = seed ^ hashString(scenario.id);
  const rng = seededRng(combinedSeed);

  // Shuffle options deterministically
  const shuffledOptions = seededShuffle(scenario.options, rng);

  // Strip expertRank from options before sending to client
  const clientOptions: SjtOptionDto[] = shuffledOptions.map((opt) => ({
    id: opt.id,
    text: opt.text,
  }));

  return {
    type: 'sjt_scenario',
    itemId: scenario.id,
    scenarioText: scenario.scenarioText,
    options: clientOptions,
    renderedAt: Date.now(),
  };
}
