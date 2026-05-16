/**
 * IRT-based OCEAN Scoring
 *
 * Calculates OCEAN personality dimension and facet scores from forced-choice
 * Graded Paired Comparisons (GPC) responses. Normalizes raw scores to sten
 * scale (1-10) using normative sample statistics.
 *
 * Scoring logic for forced-choice GPC:
 * - Response 1-2: favors left statement (left dimension gets positive score)
 * - Response 3: neutral
 * - Response 4-5: favors right statement (right dimension gets positive score)
 * - For each item: left_score += (3 - response), right_score += (response - 3)
 * - If reverse-scored: invert the scoring direction
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.6
 */

import { OceanDimension } from '@assessment/shared';
import type { OCEANScore, FacetScore } from '@assessment/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ForcedChoiceResponse {
  itemId: string;
  response: number; // 1-5 graded scale
  dimensionLeft: OceanDimension;
  dimensionRight: OceanDimension;
  facetLeft: string;
  facetRight: string;
  isReverseScored: boolean;
}

export interface NormativeData {
  dimensions: Map<OceanDimension, { mean: number; stdDev: number }>;
  facets: Map<string, { mean: number; stdDev: number }>;
}

export interface OceanProfile {
  dimensions: OCEANScore[];
  facets: FacetScore[];
  valid: boolean;
  errors: string[];
}

/** Minimum valid responses per dimension required for scoring */
const MIN_RESPONSES_PER_DIMENSION = 5;

/** All OCEAN facets organized by dimension (minimum 6 per dimension) */
export const OCEAN_FACETS: Record<OceanDimension, string[]> = {
  [OceanDimension.Openness]: [
    'fantasy',
    'aesthetics',
    'feelings',
    'actions',
    'ideas',
    'values',
  ],
  [OceanDimension.Conscientiousness]: [
    'competence',
    'order',
    'dutifulness',
    'achievement_striving',
    'self_discipline',
    'deliberation',
  ],
  [OceanDimension.Extraversion]: [
    'warmth',
    'gregariousness',
    'assertiveness',
    'activity',
    'excitement_seeking',
    'positive_emotions',
  ],
  [OceanDimension.Agreeableness]: [
    'trust',
    'straightforwardness',
    'altruism',
    'compliance',
    'modesty',
    'tender_mindedness',
  ],
  [OceanDimension.Neuroticism]: [
    'anxiety',
    'angry_hostility',
    'depression',
    'self_consciousness',
    'impulsiveness',
    'vulnerability',
  ],
};

// ─── Core Scoring Functions ──────────────────────────────────────────────────

/**
 * Calculates the score contribution for a single forced-choice response.
 * Returns the left and right dimension score contributions.
 *
 * Normal scoring:
 *   left_score = 3 - response (positive when response < 3)
 *   right_score = response - 3 (positive when response > 3)
 *
 * Reverse scoring:
 *   left_score = response - 3 (inverted)
 *   right_score = 3 - response (inverted)
 */
export function calculateItemScores(
  response: number,
  isReverseScored: boolean
): { leftScore: number; rightScore: number } {
  if (isReverseScored) {
    return {
      leftScore: response - 3,
      rightScore: 3 - response,
    };
  }
  return {
    leftScore: 3 - response,
    rightScore: response - 3,
  };
}

/**
 * Aggregates raw scores for each OCEAN dimension from forced-choice responses.
 * Each response contributes to both the left and right dimensions.
 */
export function calculateRawDimensionScores(
  responses: ForcedChoiceResponse[]
): Map<OceanDimension, number> {
  const scores = new Map<OceanDimension, number>();

  // Initialize all dimensions to 0
  for (const dim of Object.values(OceanDimension)) {
    scores.set(dim, 0);
  }

  for (const resp of responses) {
    const { leftScore, rightScore } = calculateItemScores(
      resp.response,
      resp.isReverseScored
    );

    scores.set(
      resp.dimensionLeft,
      (scores.get(resp.dimensionLeft) ?? 0) + leftScore
    );
    scores.set(
      resp.dimensionRight,
      (scores.get(resp.dimensionRight) ?? 0) + rightScore
    );
  }

  return scores;
}

/**
 * Aggregates raw scores for each facet from forced-choice responses.
 * Each response contributes to both the left and right facets.
 */
export function calculateRawFacetScores(
  responses: ForcedChoiceResponse[]
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const resp of responses) {
    const { leftScore, rightScore } = calculateItemScores(
      resp.response,
      resp.isReverseScored
    );

    scores.set(
      resp.facetLeft,
      (scores.get(resp.facetLeft) ?? 0) + leftScore
    );
    scores.set(
      resp.facetRight,
      (scores.get(resp.facetRight) ?? 0) + rightScore
    );
  }

  return scores;
}

/**
 * Normalizes a raw score to sten scale (1-10) using the formula:
 *   sten = round(2 × z-score + 5.5), clamped to [1, 10]
 *
 * Where z-score = (rawScore - mean) / stdDev
 *
 * If stdDev is 0, returns 5 (midpoint) to avoid division by zero.
 */
export function normalizeToSten(
  rawScore: number,
  mean: number,
  stdDev: number
): number {
  if (stdDev === 0) {
    return 5;
  }

  const zScore = (rawScore - mean) / stdDev;
  const sten = Math.round(2 * zScore + 5.5);

  return Math.max(1, Math.min(10, sten));
}

/**
 * Counts the number of valid responses per dimension.
 * A response contributes to both its left and right dimensions.
 */
export function countResponsesPerDimension(
  responses: ForcedChoiceResponse[]
): Map<OceanDimension, number> {
  const counts = new Map<OceanDimension, number>();

  for (const dim of Object.values(OceanDimension)) {
    counts.set(dim, 0);
  }

  for (const resp of responses) {
    counts.set(
      resp.dimensionLeft,
      (counts.get(resp.dimensionLeft) ?? 0) + 1
    );
    counts.set(
      resp.dimensionRight,
      (counts.get(resp.dimensionRight) ?? 0) + 1
    );
  }

  return counts;
}

/**
 * Full scoring pipeline: calculates OCEAN dimension and facet scores,
 * normalizes to sten scale, and validates sufficient responses.
 *
 * Returns an OceanProfile with:
 * - Dimension scores (raw + sten)
 * - Facet scores (raw + sten)
 * - Validity flag
 * - Error messages for dimensions with insufficient responses
 */
export function calculateOceanProfile(
  responses: ForcedChoiceResponse[],
  normativeData: NormativeData
): OceanProfile {
  const errors: string[] = [];

  // Validate response counts per dimension
  const responseCounts = countResponsesPerDimension(responses);
  const insufficientDimensions: OceanDimension[] = [];

  for (const [dimension, count] of responseCounts.entries()) {
    if (count < MIN_RESPONSES_PER_DIMENSION) {
      insufficientDimensions.push(dimension);
      errors.push(
        `Insufficient valid responses for ${dimension}: ${count} responses (minimum ${MIN_RESPONSES_PER_DIMENSION} required)`
      );
    }
  }

  // Calculate raw dimension scores
  const rawDimensionScores = calculateRawDimensionScores(responses);

  // Calculate dimension sten scores
  const dimensions: OCEANScore[] = [];
  for (const dim of Object.values(OceanDimension)) {
    const rawScore = rawDimensionScores.get(dim) ?? 0;
    const normative = normativeData.dimensions.get(dim);

    let stenScore: number;
    if (normative) {
      stenScore = normalizeToSten(rawScore, normative.mean, normative.stdDev);
    } else {
      stenScore = 5; // Default midpoint if no normative data
      errors.push(`No normative data available for dimension: ${dim}`);
    }

    dimensions.push({ dimension: dim, rawScore, stenScore });
  }

  // Calculate raw facet scores
  const rawFacetScores = calculateRawFacetScores(responses);

  // Calculate facet sten scores
  const facets: FacetScore[] = [];
  for (const [dim, facetNames] of Object.entries(OCEAN_FACETS)) {
    for (const facetName of facetNames) {
      const rawScore = rawFacetScores.get(facetName) ?? 0;
      const normative = normativeData.facets.get(facetName);

      let stenScore: number;
      if (normative) {
        stenScore = normalizeToSten(rawScore, normative.mean, normative.stdDev);
      } else {
        stenScore = 5; // Default midpoint if no normative data
      }

      facets.push({
        dimension: dim as OceanDimension,
        facet: facetName,
        rawScore,
        stenScore,
      });
    }
  }

  const valid = insufficientDimensions.length === 0 && errors.length === 0;

  return {
    dimensions,
    facets,
    valid,
    errors,
  };
}
