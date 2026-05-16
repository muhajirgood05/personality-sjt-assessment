/**
 * Unit tests for Social Desirability Detection and Adjustment.
 *
 * Tests cover:
 * - SD score calculation from 10 embedded items (count of keyed responses, 0–10)
 * - Percentile comparison against normative sample 90th percentile
 * - Impression management concern flagging
 * - SD score covariate adjustment (max ±1 SD shift)
 * - Raw and adjusted personality score generation
 * - Normative sample reliability warning (n < 200)
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSdScore,
  exceedsPercentile90,
  adjustScoresForSd,
  analyzeSocialDesirability,
  SdItemResponse,
  NormativeSdData,
  RawDimensionScore,
} from './social-desirability';

// ─── Helper Factories ────────────────────────────────────────────────────────

function createSdResponse(
  response: number,
  keyedSide: 'left' | 'right',
  itemId?: string
): SdItemResponse {
  return {
    itemId: itemId ?? `sd-item-${Math.random().toString(36).slice(2)}`,
    response,
    keyedSide,
  };
}

function createNormativeData(overrides?: Partial<NormativeSdData>): NormativeSdData {
  return {
    percentile90: 7,
    sampleSize: 500,
    mean: 4.5,
    stdDev: 2.0,
    ...overrides,
  };
}

function createRawScores(count = 5): RawDimensionScore[] {
  const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  return dimensions.slice(0, count).map((dim) => ({
    dimension: dim,
    score: 50,
    stdDev: 10,
  }));
}

// ─── calculateSdScore ────────────────────────────────────────────────────────

describe('calculateSdScore', () => {
  describe('keyed left responses', () => {
    it('should count response=1 as keyed when keyedSide is left', () => {
      const responses = [createSdResponse(1, 'left')];
      expect(calculateSdScore(responses)).toBe(1);
    });

    it('should count response=2 as keyed when keyedSide is left', () => {
      const responses = [createSdResponse(2, 'left')];
      expect(calculateSdScore(responses)).toBe(1);
    });

    it('should NOT count response=3 as keyed when keyedSide is left', () => {
      const responses = [createSdResponse(3, 'left')];
      expect(calculateSdScore(responses)).toBe(0);
    });

    it('should NOT count response=4 as keyed when keyedSide is left', () => {
      const responses = [createSdResponse(4, 'left')];
      expect(calculateSdScore(responses)).toBe(0);
    });

    it('should NOT count response=5 as keyed when keyedSide is left', () => {
      const responses = [createSdResponse(5, 'left')];
      expect(calculateSdScore(responses)).toBe(0);
    });
  });

  describe('keyed right responses', () => {
    it('should count response=4 as keyed when keyedSide is right', () => {
      const responses = [createSdResponse(4, 'right')];
      expect(calculateSdScore(responses)).toBe(1);
    });

    it('should count response=5 as keyed when keyedSide is right', () => {
      const responses = [createSdResponse(5, 'right')];
      expect(calculateSdScore(responses)).toBe(1);
    });

    it('should NOT count response=3 as keyed when keyedSide is right', () => {
      const responses = [createSdResponse(3, 'right')];
      expect(calculateSdScore(responses)).toBe(0);
    });

    it('should NOT count response=2 as keyed when keyedSide is right', () => {
      const responses = [createSdResponse(2, 'right')];
      expect(calculateSdScore(responses)).toBe(0);
    });

    it('should NOT count response=1 as keyed when keyedSide is right', () => {
      const responses = [createSdResponse(1, 'right')];
      expect(calculateSdScore(responses)).toBe(0);
    });
  });

  describe('score range (0-10)', () => {
    it('should return 0 when no responses are keyed', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(3, 'left') // neutral, not keyed
      );
      expect(calculateSdScore(responses)).toBe(0);
    });

    it('should return 10 when all 10 responses are keyed', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(1, 'left') // strongly left, keyed
      );
      expect(calculateSdScore(responses)).toBe(10);
    });

    it('should return correct count for mixed responses', () => {
      const responses: SdItemResponse[] = [
        createSdResponse(1, 'left'),   // keyed
        createSdResponse(2, 'left'),   // keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(4, 'right'),  // keyed
        createSdResponse(5, 'right'),  // keyed
        createSdResponse(3, 'right'),  // not keyed
        createSdResponse(1, 'right'),  // not keyed
        createSdResponse(5, 'left'),   // not keyed
        createSdResponse(2, 'left'),   // keyed
        createSdResponse(4, 'right'),  // keyed
      ];
      expect(calculateSdScore(responses)).toBe(6);
    });

    it('should handle empty responses array', () => {
      expect(calculateSdScore([])).toBe(0);
    });
  });

  describe('mixed keyed sides', () => {
    it('should correctly count with alternating keyed sides', () => {
      const responses: SdItemResponse[] = [
        createSdResponse(1, 'left'),   // keyed (left, response 1)
        createSdResponse(5, 'right'),  // keyed (right, response 5)
        createSdResponse(4, 'left'),   // NOT keyed (left, response 4)
        createSdResponse(2, 'right'),  // NOT keyed (right, response 2)
        createSdResponse(2, 'left'),   // keyed (left, response 2)
      ];
      expect(calculateSdScore(responses)).toBe(3);
    });
  });
});

// ─── exceedsPercentile90 ─────────────────────────────────────────────────────

describe('exceedsPercentile90', () => {
  const normativeData = createNormativeData({ percentile90: 7 });

  it('should return true when sdScore > 90th percentile', () => {
    expect(exceedsPercentile90(8, normativeData)).toBe(true);
  });

  it('should return true when sdScore is 10 (maximum)', () => {
    expect(exceedsPercentile90(10, normativeData)).toBe(true);
  });

  it('should return false when sdScore equals 90th percentile', () => {
    expect(exceedsPercentile90(7, normativeData)).toBe(false);
  });

  it('should return false when sdScore < 90th percentile', () => {
    expect(exceedsPercentile90(6, normativeData)).toBe(false);
  });

  it('should return false when sdScore is 0', () => {
    expect(exceedsPercentile90(0, normativeData)).toBe(false);
  });

  it('should handle percentile90 of 0 (very low threshold)', () => {
    const lowThreshold = createNormativeData({ percentile90: 0 });
    expect(exceedsPercentile90(1, lowThreshold)).toBe(true);
    expect(exceedsPercentile90(0, lowThreshold)).toBe(false);
  });

  it('should handle percentile90 of 10 (very high threshold)', () => {
    const highThreshold = createNormativeData({ percentile90: 10 });
    expect(exceedsPercentile90(10, highThreshold)).toBe(false);
  });
});

// ─── adjustScoresForSd ───────────────────────────────────────────────────────

describe('adjustScoresForSd', () => {
  const normativeData = createNormativeData({ mean: 5, stdDev: 2 });

  describe('adjustment direction', () => {
    it('should reduce scores when SD score is above normative mean', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
      ];
      const result = adjustScoresForSd(rawScores, 8, normativeData);
      // SD score 8 > mean 5, so adjustment should be negative (reduce score)
      expect(result[0]!.adjustmentAmount).toBeLessThan(0);
      expect(result[0]!.adjustedScore).toBeLessThan(50);
    });

    it('should increase scores when SD score is below normative mean', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
      ];
      const result = adjustScoresForSd(rawScores, 2, normativeData);
      // SD score 2 < mean 5, so adjustment should be positive (increase score)
      expect(result[0]!.adjustmentAmount).toBeGreaterThan(0);
      expect(result[0]!.adjustedScore).toBeGreaterThan(50);
    });

    it('should not adjust when SD score equals normative mean', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
      ];
      const result = adjustScoresForSd(rawScores, 5, normativeData);
      expect(result[0]!.adjustmentAmount).toBe(0);
      expect(result[0]!.adjustedScore).toBe(50);
    });
  });

  describe('max adjustment cap (±1 SD)', () => {
    it('should cap positive adjustment at 1 standard deviation', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
      ];
      // Very low SD score to trigger large positive adjustment
      const result = adjustScoresForSd(rawScores, 0, createNormativeData({ mean: 10, stdDev: 1 }));
      expect(result[0]!.adjustmentAmount).toBeLessThanOrEqual(10);
    });

    it('should cap negative adjustment at -1 standard deviation', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
      ];
      // Very high SD score to trigger large negative adjustment
      const result = adjustScoresForSd(rawScores, 10, createNormativeData({ mean: 0, stdDev: 1 }));
      expect(result[0]!.adjustmentAmount).toBeGreaterThanOrEqual(-10);
    });

    it('should never shift any score by more than 1 SD from raw', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
        { dimension: 'conscientiousness', score: 60, stdDev: 8 },
        { dimension: 'extraversion', score: 40, stdDev: 12 },
        { dimension: 'agreeableness', score: 55, stdDev: 9 },
        { dimension: 'neuroticism', score: 45, stdDev: 11 },
      ];

      // Extreme SD score
      const result = adjustScoresForSd(rawScores, 10, createNormativeData({ mean: 0, stdDev: 0.5 }));

      for (const score of result) {
        const correspondingRaw = rawScores.find((r) => r.dimension === score.dimension)!;
        const absoluteAdjustment = Math.abs(score.adjustedScore - score.rawScore);
        expect(absoluteAdjustment).toBeLessThanOrEqual(correspondingRaw.stdDev + 0.001); // small epsilon for floating point
      }
    });
  });

  describe('output structure', () => {
    it('should return one adjusted score per input dimension', () => {
      const rawScores = createRawScores(5);
      const result = adjustScoresForSd(rawScores, 6, normativeData);
      expect(result).toHaveLength(5);
    });

    it('should preserve dimension names', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
        { dimension: 'conscientiousness', score: 60, stdDev: 8 },
      ];
      const result = adjustScoresForSd(rawScores, 6, normativeData);
      expect(result[0]!.dimension).toBe('openness');
      expect(result[1]!.dimension).toBe('conscientiousness');
    });

    it('should preserve raw scores in output', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
      ];
      const result = adjustScoresForSd(rawScores, 6, normativeData);
      expect(result[0]!.rawScore).toBe(50);
    });

    it('should have adjustedScore = rawScore + adjustmentAmount', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
        { dimension: 'conscientiousness', score: 60, stdDev: 8 },
      ];
      const result = adjustScoresForSd(rawScores, 7, normativeData);
      for (const score of result) {
        expect(score.adjustedScore).toBeCloseTo(score.rawScore + score.adjustmentAmount, 10);
      }
    });

    it('should handle empty raw scores array', () => {
      const result = adjustScoresForSd([], 5, normativeData);
      expect(result).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle normative stdDev of 0 without crashing', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
      ];
      const zeroStdDev = createNormativeData({ stdDev: 0 });
      // Should not throw
      const result = adjustScoresForSd(rawScores, 7, zeroStdDev);
      expect(result).toHaveLength(1);
    });

    it('should handle dimension stdDev of 0', () => {
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 0 },
      ];
      const result = adjustScoresForSd(rawScores, 7, normativeData);
      // With stdDev 0, beta is 0, so no adjustment
      expect(result[0]!.adjustmentAmount).toBe(0);
      expect(result[0]!.adjustedScore).toBe(50);
    });
  });
});

// ─── analyzeSocialDesirability ───────────────────────────────────────────────

describe('analyzeSocialDesirability', () => {
  describe('complete analysis', () => {
    it('should return correct SD score', () => {
      const responses: SdItemResponse[] = [
        createSdResponse(1, 'left'),   // keyed
        createSdResponse(2, 'left'),   // keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(4, 'right'),  // keyed
        createSdResponse(5, 'right'),  // keyed
        createSdResponse(3, 'right'),  // not keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(3, 'right'),  // not keyed
        createSdResponse(1, 'left'),   // keyed
        createSdResponse(5, 'right'),  // keyed
      ];
      const normativeData = createNormativeData({ percentile90: 7 });
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      expect(result.sdScore).toBe(6);
    });

    it('should flag impression management when exceeding 90th percentile', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(1, 'left') // all keyed
      );
      const normativeData = createNormativeData({ percentile90: 7 });
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      expect(result.sdScore).toBe(10);
      expect(result.percentileExceeded).toBe(true);
      expect(result.impressionManagementConcern).toBe(true);
    });

    it('should NOT flag impression management when at or below 90th percentile', () => {
      const responses: SdItemResponse[] = [
        createSdResponse(1, 'left'),   // keyed
        createSdResponse(2, 'left'),   // keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(3, 'right'),  // not keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(3, 'right'),  // not keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(3, 'right'),  // not keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(3, 'right'),  // not keyed
      ];
      const normativeData = createNormativeData({ percentile90: 7 });
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      expect(result.sdScore).toBe(2);
      expect(result.percentileExceeded).toBe(false);
      expect(result.impressionManagementConcern).toBe(false);
    });
  });

  describe('normative sample warning', () => {
    it('should show warning when sample size < 200', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(3, 'left')
      );
      const normativeData = createNormativeData({ sampleSize: 199 });
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      expect(result.normativeSampleWarning).toBe(true);
    });

    it('should NOT show warning when sample size = 200', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(3, 'left')
      );
      const normativeData = createNormativeData({ sampleSize: 200 });
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      expect(result.normativeSampleWarning).toBe(false);
    });

    it('should NOT show warning when sample size > 200', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(3, 'left')
      );
      const normativeData = createNormativeData({ sampleSize: 500 });
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      expect(result.normativeSampleWarning).toBe(false);
    });

    it('should show warning when sample size is 0', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(3, 'left')
      );
      const normativeData = createNormativeData({ sampleSize: 0 });
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      expect(result.normativeSampleWarning).toBe(true);
    });
  });

  describe('adjusted scores generation', () => {
    it('should generate adjusted scores for all dimensions', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(1, 'left')
      );
      const normativeData = createNormativeData();
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      expect(result.adjustedScores).toHaveLength(5);
    });

    it('should include both raw and adjusted scores for each dimension', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(1, 'left')
      );
      const normativeData = createNormativeData();
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      for (const score of result.adjustedScores) {
        expect(score).toHaveProperty('dimension');
        expect(score).toHaveProperty('rawScore');
        expect(score).toHaveProperty('adjustedScore');
        expect(score).toHaveProperty('adjustmentAmount');
      }
    });

    it('should not adjust scores when SD score equals normative mean', () => {
      const normativeData = createNormativeData({ mean: 5 });
      // Create responses that produce SD score of 5
      const responses: SdItemResponse[] = [
        createSdResponse(1, 'left'),   // keyed
        createSdResponse(1, 'left'),   // keyed
        createSdResponse(1, 'left'),   // keyed
        createSdResponse(4, 'right'),  // keyed
        createSdResponse(5, 'right'),  // keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(3, 'right'),  // not keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(3, 'right'),  // not keyed
        createSdResponse(3, 'left'),   // not keyed
      ];
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      for (const score of result.adjustedScores) {
        expect(score.adjustmentAmount).toBe(0);
        expect(score.adjustedScore).toBe(score.rawScore);
      }
    });

    it('should never shift any score by more than 1 SD from raw', () => {
      // Maximum SD score with extreme normative data
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(1, 'left')
      );
      const normativeData = createNormativeData({ mean: 0, stdDev: 0.5, percentile90: 3 });
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 50, stdDev: 10 },
        { dimension: 'conscientiousness', score: 60, stdDev: 8 },
        { dimension: 'extraversion', score: 40, stdDev: 12 },
      ];

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);
      for (let i = 0; i < result.adjustedScores.length; i++) {
        const adjusted = result.adjustedScores[i]!;
        const raw = rawScores[i]!;
        expect(Math.abs(adjusted.adjustedScore - adjusted.rawScore)).toBeLessThanOrEqual(raw.stdDev + 0.001);
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle a typical moderate SD score correctly', () => {
      const responses: SdItemResponse[] = [
        createSdResponse(1, 'left'),   // keyed
        createSdResponse(2, 'left'),   // keyed
        createSdResponse(4, 'right'),  // keyed
        createSdResponse(5, 'right'),  // keyed
        createSdResponse(3, 'left'),   // not keyed
        createSdResponse(3, 'right'),  // not keyed
        createSdResponse(4, 'left'),   // not keyed
        createSdResponse(2, 'right'),  // not keyed
        createSdResponse(1, 'left'),   // keyed
        createSdResponse(3, 'right'),  // not keyed
      ];
      const normativeData = createNormativeData({
        percentile90: 7,
        sampleSize: 300,
        mean: 4.5,
        stdDev: 2.0,
      });
      const rawScores: RawDimensionScore[] = [
        { dimension: 'openness', score: 55, stdDev: 10 },
        { dimension: 'conscientiousness', score: 62, stdDev: 9 },
      ];

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);

      expect(result.sdScore).toBe(5);
      expect(result.percentileExceeded).toBe(false);
      expect(result.impressionManagementConcern).toBe(false);
      expect(result.normativeSampleWarning).toBe(false);
      expect(result.adjustedScores).toHaveLength(2);
    });

    it('should handle high SD score with small normative sample', () => {
      const responses: SdItemResponse[] = Array.from({ length: 10 }, () =>
        createSdResponse(1, 'left') // all keyed
      );
      const normativeData = createNormativeData({
        percentile90: 8,
        sampleSize: 50,
        mean: 4,
        stdDev: 2.5,
      });
      const rawScores = createRawScores(5);

      const result = analyzeSocialDesirability(responses, rawScores, normativeData);

      expect(result.sdScore).toBe(10);
      expect(result.percentileExceeded).toBe(true);
      expect(result.impressionManagementConcern).toBe(true);
      expect(result.normativeSampleWarning).toBe(true);
    });
  });
});
