/**
 * OCEAN to Kemenkeu Values Mapping
 *
 * Maps Big Five (OCEAN) personality dimension sten scores to Kemenkeu's
 * five core values alignment scores. Each Kemenkeu value is derived from
 * specific OCEAN dimensions using averaging.
 *
 * Mapping:
 * - Integritas = avg(reverse(Neuroticism))
 * - Profesionalisme = avg(Conscientiousness, reverse(Neuroticism))
 * - Sinergi = avg(Agreeableness, Extraversion)
 * - Pelayanan = avg(Agreeableness, Extraversion)
 * - Kesempurnaan = avg(Conscientiousness, Openness)
 *
 * Reverse scoring: 11 - stenScore (sten 1-4 = high emotional stability)
 *
 * Validates: Requirements 8.5, 8.7
 */

import { KemenkeuValue } from '@assessment/shared';

export interface OceanStenScores {
  openness: number; // sten 1-10
  conscientiousness: number; // sten 1-10
  extraversion: number; // sten 1-10
  agreeableness: number; // sten 1-10
  neuroticism: number; // sten 1-10
}

export interface KemenkeuValueAlignment {
  value: KemenkeuValue;
  score: number; // sten 1-10
  contributingDimensions: string[];
}

/**
 * Reverses a Neuroticism sten score to represent Emotional Stability.
 * Low Neuroticism (sten 1-4) indicates high emotional stability.
 * Formula: 11 - stenScore
 *
 * @param neuroticism - Neuroticism sten score (1-10)
 * @returns Reversed score representing emotional stability (1-10)
 */
export function reverseNeuroticism(neuroticism: number): number {
  return 11 - neuroticism;
}

/**
 * Calculates the alignment score for a single Kemenkeu value
 * based on the contributing OCEAN dimension sten scores.
 *
 * @param value - The Kemenkeu value to calculate alignment for
 * @param oceanStens - The candidate's OCEAN sten scores
 * @returns Alignment score (sten 1-10), clamped to valid range
 */
export function calculateValueAlignment(
  value: KemenkeuValue,
  oceanStens: OceanStenScores
): number {
  let score: number;

  switch (value) {
    case KemenkeuValue.Integritas:
      // Integritas = avg(reverse(Neuroticism))
      score = reverseNeuroticism(oceanStens.neuroticism);
      break;

    case KemenkeuValue.Profesionalisme:
      // Profesionalisme = avg(Conscientiousness, reverse(Neuroticism))
      score =
        (oceanStens.conscientiousness +
          reverseNeuroticism(oceanStens.neuroticism)) /
        2;
      break;

    case KemenkeuValue.Sinergi:
      // Sinergi = avg(Agreeableness, Extraversion)
      score = (oceanStens.agreeableness + oceanStens.extraversion) / 2;
      break;

    case KemenkeuValue.Pelayanan:
      // Pelayanan = avg(Agreeableness, Extraversion)
      score = (oceanStens.agreeableness + oceanStens.extraversion) / 2;
      break;

    case KemenkeuValue.Kesempurnaan:
      // Kesempurnaan = avg(Conscientiousness, Openness)
      score = (oceanStens.conscientiousness + oceanStens.openness) / 2;
      break;

    default:
      throw new Error(`Unknown Kemenkeu value: ${value}`);
  }

  // Clamp to valid sten range 1-10
  return Math.max(1, Math.min(10, score));
}

/**
 * Returns the list of contributing OCEAN dimensions for a Kemenkeu value.
 */
function getContributingDimensions(value: KemenkeuValue): string[] {
  switch (value) {
    case KemenkeuValue.Integritas:
      return ['neuroticism (reversed)'];
    case KemenkeuValue.Profesionalisme:
      return ['conscientiousness', 'neuroticism (reversed)'];
    case KemenkeuValue.Sinergi:
      return ['agreeableness', 'extraversion'];
    case KemenkeuValue.Pelayanan:
      return ['agreeableness', 'extraversion'];
    case KemenkeuValue.Kesempurnaan:
      return ['conscientiousness', 'openness'];
    default:
      return [];
  }
}

/**
 * Maps all five OCEAN sten scores to Kemenkeu value alignment scores.
 *
 * @param oceanStens - The candidate's OCEAN sten scores (each 1-10)
 * @returns Array of 5 KemenkeuValueAlignment objects, one per value
 */
export function mapOceanToKemenkeuValues(
  oceanStens: OceanStenScores
): KemenkeuValueAlignment[] {
  const values = [
    KemenkeuValue.Integritas,
    KemenkeuValue.Profesionalisme,
    KemenkeuValue.Sinergi,
    KemenkeuValue.Pelayanan,
    KemenkeuValue.Kesempurnaan,
  ];

  return values.map((value) => ({
    value,
    score: calculateValueAlignment(value, oceanStens),
    contributingDimensions: getContributingDimensions(value),
  }));
}
