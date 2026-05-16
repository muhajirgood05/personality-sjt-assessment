/**
 * Composite Suitability Score
 *
 * Calculates a composite suitability score combining personality-value alignment
 * (40% weight) and SJT-value alignment (60% weight). Classifies candidates into
 * suitability categories based on the composite score.
 *
 * Formula: composite = 0.4 × personality_sub_score + 0.6 × sjt_sub_score
 *
 * Categories:
 * - Highly Suitable: score ≥ 80
 * - Suitable: 60 ≤ score < 80
 * - Conditionally Suitable: 40 ≤ score < 60
 * - Not Suitable: score < 40
 *
 * Validates: Requirements 10.1, 10.2
 */

import { SuitabilityCategory } from '@assessment/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompositeScoreInput {
  personalityValueAlignmentScores: { value: string; score: number }[]; // sten 1-10
  sjtValueScores: { value: string; score: number }[]; // 0-100
}

export interface CompositeScoreResult {
  suitabilityScore: number; // 0-100
  category: SuitabilityCategory;
  personalitySubScore: number; // 0-100
  sjtSubScore: number; // 0-100
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Normalizes personality-value alignment scores from sten scale (1-10) to 0-100.
 *
 * Formula: ((avg_sten - 1) / 9) × 100
 *
 * This maps sten 1 → 0 and sten 10 → 100 linearly.
 *
 * @param scores - Array of personality-value alignment scores (sten 1-10)
 * @returns Normalized score on 0-100 scale
 */
export function normalizePersonalitySubScore(
  scores: { value: string; score: number }[]
): number {
  if (scores.length === 0) return 0;

  const avgSten =
    scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

  // Normalize: ((avg_sten - 1) / 9) × 100
  const normalized = ((avgSten - 1) / 9) * 100;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(normalized * 100) / 100));
}

/**
 * Normalizes SJT-value alignment scores by averaging them.
 * SJT scores are already on a 0-100 scale, so we just compute the mean.
 *
 * @param scores - Array of SJT value scores (0-100)
 * @returns Average score on 0-100 scale
 */
export function normalizeSjtSubScore(
  scores: { value: string; score: number }[]
): number {
  if (scores.length === 0) return 0;

  const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(avg * 100) / 100));
}

/**
 * Classifies a suitability score into a category.
 *
 * - Highly Suitable: score ≥ 80
 * - Suitable: 60 ≤ score < 80
 * - Conditionally Suitable: 40 ≤ score < 60
 * - Not Suitable: score < 40
 *
 * @param score - Composite suitability score (0-100)
 * @returns Suitability category
 */
export function classifySuitability(score: number): SuitabilityCategory {
  if (score >= 80) return 'Highly Suitable';
  if (score >= 60) return 'Suitable';
  if (score >= 40) return 'Conditionally Suitable';
  return 'Not Suitable';
}

/**
 * Calculates the full composite suitability score.
 *
 * 1. Normalizes personality-value alignment scores (sten 1-10) to 0-100
 * 2. Averages SJT-value scores (already 0-100)
 * 3. Computes composite: 0.4 × personality + 0.6 × SJT
 * 4. Classifies into suitability category
 *
 * @param input - Personality and SJT value alignment scores
 * @returns Complete composite score result
 */
export function calculateCompositeScore(
  input: CompositeScoreInput
): CompositeScoreResult {
  const personalitySubScore = normalizePersonalitySubScore(
    input.personalityValueAlignmentScores
  );
  const sjtSubScore = normalizeSjtSubScore(input.sjtValueScores);

  // Composite: 0.4 × personality + 0.6 × SJT
  const rawComposite = 0.4 * personalitySubScore + 0.6 * sjtSubScore;

  // Round to 2 decimal places and clamp to 0-100
  const suitabilityScore = Math.max(
    0,
    Math.min(100, Math.round(rawComposite * 100) / 100)
  );

  const category = classifySuitability(suitabilityScore);

  return {
    suitabilityScore,
    category,
    personalitySubScore,
    sjtSubScore,
  };
}
