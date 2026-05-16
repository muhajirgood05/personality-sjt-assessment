/**
 * SJT Concordance Scoring
 *
 * Calculates concordance scores by comparing candidate rankings to expert-determined
 * rankings for SJT scenarios. Scores are weighted (2× for most/least effective positions,
 * 1× for middle positions) and normalized to a 0–100 scale per Kemenkeu value.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.6
 */

import { KemenkeuValue } from '@assessment/shared';
import { KemenkeuValueScore } from '@assessment/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoredScenario {
  scenarioId: string;
  kemenkeuValue: KemenkeuValue;
  candidateRanking: number[]; // [1..N] candidate's ranking for each position
  expertRanking: number[]; // [1..N] expert's ranking for each position
  completed: boolean;
}

export interface SjtScoringResult {
  valueScores: KemenkeuValueScore[];
  overallScore: number; // 0-100
  completedScenarios: number;
  totalScenarios: number;
  partialValues: KemenkeuValue[]; // values with incomplete data
}

// ─── Core Scoring Functions ──────────────────────────────────────────────────

/**
 * Calculates the concordance score for a single scenario.
 *
 * Algorithm:
 * 1. For each position, compare candidate's rank to expert's rank
 * 2. Weight: position 1 (most effective) and position N (least effective) get 2× weight
 * 3. Middle positions get 1× weight
 * 4. Score per position: max(0, 1 - |candidate_rank - expert_rank| / (N - 1))
 * 5. Weighted score = sum(position_score × weight) / sum(weights) × 100
 *
 * @param candidateRanking - Candidate's ranking array (rank assigned to each option)
 * @param expertRanking - Expert's ranking array (rank assigned to each option)
 * @returns Concordance score normalized to 0-100
 */
export function calculateScenarioConcordance(
  candidateRanking: number[],
  expertRanking: number[]
): number {
  const N = candidateRanking.length;

  // Edge cases
  if (N === 0) return 0;
  if (N === 1) return candidateRanking[0] === expertRanking[0] ? 100 : 0;

  let weightedScoreSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < N; i++) {
    const candidateRank = candidateRanking[i]!;
    const expertRank = expertRanking[i]!;

    // Determine weight: 2× for most effective (rank 1) and least effective (rank N) positions
    const weight = expertRank === 1 || expertRank === N ? 2 : 1;

    // Score per position: how close the candidate's rank is to the expert's rank
    const distance = Math.abs(candidateRank - expertRank);
    const positionScore = Math.max(0, 1 - distance / (N - 1));

    weightedScoreSum += positionScore * weight;
    totalWeight += weight;
  }

  // Normalize to 0-100
  return totalWeight === 0 ? 0 : (weightedScoreSum / totalWeight) * 100;
}

/**
 * Aggregates per-value scores from completed scenarios.
 * Per-value score = average of all scenario concordance scores for that value.
 * Values with 0 completed scenarios get a score of 0.
 *
 * @param scenarios - Array of scored scenarios (both completed and incomplete)
 * @returns Array of scores per Kemenkeu value
 */
export function calculateValueScores(
  scenarios: ScoredScenario[]
): KemenkeuValueScore[] {
  // Group completed scenarios by value
  const valueGroups = new Map<KemenkeuValue, number[]>();

  // Initialize all values
  for (const value of Object.values(KemenkeuValue)) {
    valueGroups.set(value, []);
  }

  // Calculate concordance for each completed scenario and group by value
  for (const scenario of scenarios) {
    if (!scenario.completed) continue;

    const score = calculateScenarioConcordance(
      scenario.candidateRanking,
      scenario.expertRanking
    );

    const scores = valueGroups.get(scenario.kemenkeuValue);
    if (scores) {
      scores.push(score);
    }
  }

  // Calculate average per value
  const valueScores: KemenkeuValueScore[] = [];
  for (const [value, scores] of valueGroups) {
    const avgScore =
      scores.length === 0
        ? 0
        : scores.reduce((sum, s) => sum + s, 0) / scores.length;

    valueScores.push({
      value,
      score: Math.round(avgScore * 100) / 100, // Round to 2 decimal places
    });
  }

  return valueScores;
}

/**
 * Full SJT scoring pipeline.
 * - Only scores completed scenarios
 * - Reports which values have partial data (incomplete scenarios)
 * - Calculates overall score as average of all value scores (only counting values with data)
 *
 * @param scenarios - All scenarios for the candidate
 * @returns Complete SJT scoring result
 */
export function calculateSjtScores(
  scenarios: ScoredScenario[]
): SjtScoringResult {
  const completedScenarios = scenarios.filter((s) => s.completed);
  const totalScenarios = scenarios.length;

  // Calculate per-value scores
  const valueScores = calculateValueScores(scenarios);

  // Determine which values have partial data
  const partialValues: KemenkeuValue[] = [];

  // A value is partial if it has any scenarios mapped to it but not all are completed,
  // or if it has 0 completed scenarios
  const valueTotalCounts = new Map<KemenkeuValue, number>();
  const valueCompletedCounts = new Map<KemenkeuValue, number>();

  for (const value of Object.values(KemenkeuValue)) {
    valueTotalCounts.set(value, 0);
    valueCompletedCounts.set(value, 0);
  }

  for (const scenario of scenarios) {
    valueTotalCounts.set(
      scenario.kemenkeuValue,
      (valueTotalCounts.get(scenario.kemenkeuValue) ?? 0) + 1
    );
    if (scenario.completed) {
      valueCompletedCounts.set(
        scenario.kemenkeuValue,
        (valueCompletedCounts.get(scenario.kemenkeuValue) ?? 0) + 1
      );
    }
  }

  for (const [value, totalCount] of valueTotalCounts) {
    const completedCount = valueCompletedCounts.get(value) ?? 0;
    if (totalCount > 0 && completedCount < totalCount) {
      partialValues.push(value);
    } else if (totalCount === 0) {
      // No scenarios mapped to this value at all — mark as partial
      partialValues.push(value);
    }
  }

  // Calculate overall score: average of value scores that have at least one completed scenario
  const scoredValues = valueScores.filter((vs) => {
    const completedCount = valueCompletedCounts.get(vs.value) ?? 0;
    return completedCount > 0;
  });

  const overallScore =
    scoredValues.length === 0
      ? 0
      : Math.round(
          (scoredValues.reduce((sum, vs) => sum + vs.score, 0) /
            scoredValues.length) *
            100
        ) / 100;

  return {
    valueScores,
    overallScore,
    completedScenarios: completedScenarios.length,
    totalScenarios,
    partialValues,
  };
}
