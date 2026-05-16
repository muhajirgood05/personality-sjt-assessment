/**
 * Tests for response time tracking and analysis.
 * Validates anti-faking response time detection logic.
 */

import { describe, it, expect } from 'vitest';
import {
  isFlaggedFast,
  shouldExcludeFromCv,
  calculateCoefficientOfVariation,
  analyzeResponseTimes,
  hasResponseTimeConcern,
  ResponseTimeData,
  PERSONALITY_MIN_TIME_MS,
  SJT_MIN_TIME_MS,
  MAX_TIME_FOR_CV_MS,
  CONCERN_THRESHOLD_PERCENTAGE,
} from './response-time';

// ─── isFlaggedFast ───────────────────────────────────────────────────────────

describe('isFlaggedFast', () => {
  describe('personality items', () => {
    it('should flag responses below 1500ms', () => {
      expect(isFlaggedFast(0, 'personality')).toBe(true);
      expect(isFlaggedFast(500, 'personality')).toBe(true);
      expect(isFlaggedFast(1000, 'personality')).toBe(true);
      expect(isFlaggedFast(1499, 'personality')).toBe(true);
    });

    it('should not flag responses at or above 1500ms', () => {
      expect(isFlaggedFast(1500, 'personality')).toBe(false);
      expect(isFlaggedFast(1501, 'personality')).toBe(false);
      expect(isFlaggedFast(3000, 'personality')).toBe(false);
      expect(isFlaggedFast(10000, 'personality')).toBe(false);
    });

    it('should flag at the exact boundary (1499ms)', () => {
      expect(isFlaggedFast(PERSONALITY_MIN_TIME_MS - 1, 'personality')).toBe(true);
      expect(isFlaggedFast(PERSONALITY_MIN_TIME_MS, 'personality')).toBe(false);
    });
  });

  describe('SJT items', () => {
    it('should flag responses below 8000ms', () => {
      expect(isFlaggedFast(0, 'sjt')).toBe(true);
      expect(isFlaggedFast(1000, 'sjt')).toBe(true);
      expect(isFlaggedFast(5000, 'sjt')).toBe(true);
      expect(isFlaggedFast(7999, 'sjt')).toBe(true);
    });

    it('should not flag responses at or above 8000ms', () => {
      expect(isFlaggedFast(8000, 'sjt')).toBe(false);
      expect(isFlaggedFast(8001, 'sjt')).toBe(false);
      expect(isFlaggedFast(15000, 'sjt')).toBe(false);
      expect(isFlaggedFast(60000, 'sjt')).toBe(false);
    });

    it('should flag at the exact boundary (7999ms)', () => {
      expect(isFlaggedFast(SJT_MIN_TIME_MS - 1, 'sjt')).toBe(true);
      expect(isFlaggedFast(SJT_MIN_TIME_MS, 'sjt')).toBe(false);
    });
  });
});

// ─── shouldExcludeFromCv ─────────────────────────────────────────────────────

describe('shouldExcludeFromCv', () => {
  it('should exclude responses above 300000ms (5 minutes)', () => {
    expect(shouldExcludeFromCv(300001)).toBe(true);
    expect(shouldExcludeFromCv(400000)).toBe(true);
    expect(shouldExcludeFromCv(600000)).toBe(true);
  });

  it('should not exclude responses at or below 300000ms', () => {
    expect(shouldExcludeFromCv(300000)).toBe(false);
    expect(shouldExcludeFromCv(299999)).toBe(false);
    expect(shouldExcludeFromCv(1500)).toBe(false);
    expect(shouldExcludeFromCv(0)).toBe(false);
  });

  it('should handle the exact boundary (300000ms)', () => {
    expect(shouldExcludeFromCv(MAX_TIME_FOR_CV_MS)).toBe(false);
    expect(shouldExcludeFromCv(MAX_TIME_FOR_CV_MS + 1)).toBe(true);
  });
});

// ─── calculateCoefficientOfVariation ─────────────────────────────────────────

describe('calculateCoefficientOfVariation', () => {
  it('should return 0 for empty array', () => {
    expect(calculateCoefficientOfVariation([])).toBe(0);
  });

  it('should return 0 for single value', () => {
    expect(calculateCoefficientOfVariation([5000])).toBe(0);
  });

  it('should return 0 for identical values', () => {
    expect(calculateCoefficientOfVariation([3000, 3000, 3000])).toBe(0);
  });

  it('should calculate CV correctly for known values', () => {
    // Values: [2, 4, 4, 4, 5, 5, 7, 9]
    // Mean = 5, StdDev = sqrt(4) = 2, CV = 2/5 = 0.4
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const cv = calculateCoefficientOfVariation(values);
    expect(cv).toBeCloseTo(0.4, 5);
  });

  it('should calculate CV for two values', () => {
    // Values: [1000, 3000]
    // Mean = 2000, StdDev = sqrt(((1000-2000)^2 + (3000-2000)^2)/2) = sqrt(1000000) = 1000
    // CV = 1000/2000 = 0.5
    const cv = calculateCoefficientOfVariation([1000, 3000]);
    expect(cv).toBeCloseTo(0.5, 5);
  });

  it('should return 0 when mean is 0', () => {
    expect(calculateCoefficientOfVariation([0, 0, 0])).toBe(0);
  });

  it('should handle large response time values', () => {
    const times = [50000, 60000, 55000, 58000, 52000];
    const cv = calculateCoefficientOfVariation(times);
    expect(cv).toBeGreaterThan(0);
    expect(cv).toBeLessThan(1);
  });
});

// ─── hasResponseTimeConcern ──────────────────────────────────────────────────

describe('hasResponseTimeConcern', () => {
  it('should return true when flagged percentage exceeds 20%', () => {
    expect(hasResponseTimeConcern(20.1)).toBe(true);
    expect(hasResponseTimeConcern(21)).toBe(true);
    expect(hasResponseTimeConcern(50)).toBe(true);
    expect(hasResponseTimeConcern(100)).toBe(true);
  });

  it('should return false when flagged percentage is 20% or below', () => {
    expect(hasResponseTimeConcern(0)).toBe(false);
    expect(hasResponseTimeConcern(10)).toBe(false);
    expect(hasResponseTimeConcern(19.9)).toBe(false);
    expect(hasResponseTimeConcern(20)).toBe(false);
  });

  it('should handle the exact boundary (20%)', () => {
    expect(hasResponseTimeConcern(CONCERN_THRESHOLD_PERCENTAGE)).toBe(false);
    expect(hasResponseTimeConcern(CONCERN_THRESHOLD_PERCENTAGE + 0.001)).toBe(true);
  });
});

// ─── analyzeResponseTimes ────────────────────────────────────────────────────

describe('analyzeResponseTimes', () => {
  it('should return zero values for empty responses', () => {
    const result = analyzeResponseTimes([]);
    expect(result).toEqual({
      flaggedFastCount: 0,
      totalResponses: 0,
      flaggedPercentage: 0,
      responseTimeConcern: false,
      coefficientOfVariation: 0,
      personalityCv: 0,
      sjtCv: 0,
      excludedCount: 0,
    });
  });

  it('should correctly count flagged fast personality responses', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 500, itemType: 'personality' },
      { itemId: '2', responseTimeMs: 1000, itemType: 'personality' },
      { itemId: '3', responseTimeMs: 2000, itemType: 'personality' },
      { itemId: '4', responseTimeMs: 3000, itemType: 'personality' },
      { itemId: '5', responseTimeMs: 4000, itemType: 'personality' },
    ];

    const result = analyzeResponseTimes(responses);
    expect(result.flaggedFastCount).toBe(2); // 500ms and 1000ms
    expect(result.totalResponses).toBe(5);
    expect(result.flaggedPercentage).toBe(40);
    expect(result.responseTimeConcern).toBe(true);
  });

  it('should correctly count flagged fast SJT responses', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 3000, itemType: 'sjt' },
      { itemId: '2', responseTimeMs: 5000, itemType: 'sjt' },
      { itemId: '3', responseTimeMs: 10000, itemType: 'sjt' },
      { itemId: '4', responseTimeMs: 15000, itemType: 'sjt' },
      { itemId: '5', responseTimeMs: 20000, itemType: 'sjt' },
    ];

    const result = analyzeResponseTimes(responses);
    expect(result.flaggedFastCount).toBe(2); // 3000ms and 5000ms
    expect(result.totalResponses).toBe(5);
    expect(result.flaggedPercentage).toBe(40);
    expect(result.responseTimeConcern).toBe(true);
  });

  it('should not flag concern when less than 20% are flagged', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 1000, itemType: 'personality' },
      { itemId: '2', responseTimeMs: 3000, itemType: 'personality' },
      { itemId: '3', responseTimeMs: 4000, itemType: 'personality' },
      { itemId: '4', responseTimeMs: 5000, itemType: 'personality' },
      { itemId: '5', responseTimeMs: 6000, itemType: 'personality' },
      { itemId: '6', responseTimeMs: 7000, itemType: 'personality' },
    ];

    const result = analyzeResponseTimes(responses);
    expect(result.flaggedFastCount).toBe(1); // only 1000ms
    expect(result.flaggedPercentage).toBeCloseTo(16.67, 1);
    expect(result.responseTimeConcern).toBe(false);
  });

  it('should exclude items > 300000ms from CV calculation', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 3000, itemType: 'personality' },
      { itemId: '2', responseTimeMs: 4000, itemType: 'personality' },
      { itemId: '3', responseTimeMs: 5000, itemType: 'personality' },
      { itemId: '4', responseTimeMs: 350000, itemType: 'personality' }, // excluded
    ];

    const result = analyzeResponseTimes(responses);
    expect(result.excludedCount).toBe(1);
    // CV should be calculated from [3000, 4000, 5000] only
    const expectedCv = calculateCoefficientOfVariation([3000, 4000, 5000]);
    expect(result.personalityCv).toBeCloseTo(expectedCv, 10);
  });

  it('should calculate separate CVs for personality and SJT', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 2000, itemType: 'personality' },
      { itemId: '2', responseTimeMs: 3000, itemType: 'personality' },
      { itemId: '3', responseTimeMs: 4000, itemType: 'personality' },
      { itemId: '4', responseTimeMs: 10000, itemType: 'sjt' },
      { itemId: '5', responseTimeMs: 20000, itemType: 'sjt' },
      { itemId: '6', responseTimeMs: 30000, itemType: 'sjt' },
    ];

    const result = analyzeResponseTimes(responses);

    const expectedPersonalityCv = calculateCoefficientOfVariation([2000, 3000, 4000]);
    const expectedSjtCv = calculateCoefficientOfVariation([10000, 20000, 30000]);

    expect(result.personalityCv).toBeCloseTo(expectedPersonalityCv, 10);
    expect(result.sjtCv).toBeCloseTo(expectedSjtCv, 10);
  });

  it('should calculate overall CV from all non-excluded items', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 2000, itemType: 'personality' },
      { itemId: '2', responseTimeMs: 3000, itemType: 'personality' },
      { itemId: '3', responseTimeMs: 10000, itemType: 'sjt' },
      { itemId: '4', responseTimeMs: 15000, itemType: 'sjt' },
    ];

    const result = analyzeResponseTimes(responses);
    const expectedCv = calculateCoefficientOfVariation([2000, 3000, 10000, 15000]);
    expect(result.coefficientOfVariation).toBeCloseTo(expectedCv, 10);
  });

  it('should handle mixed flagged and non-flagged responses', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 500, itemType: 'personality' },   // flagged
      { itemId: '2', responseTimeMs: 1499, itemType: 'personality' },  // flagged
      { itemId: '3', responseTimeMs: 1500, itemType: 'personality' },  // not flagged
      { itemId: '4', responseTimeMs: 7999, itemType: 'sjt' },         // flagged
      { itemId: '5', responseTimeMs: 8000, itemType: 'sjt' },         // not flagged
    ];

    const result = analyzeResponseTimes(responses);
    expect(result.flaggedFastCount).toBe(3);
    expect(result.totalResponses).toBe(5);
    expect(result.flaggedPercentage).toBe(60);
    expect(result.responseTimeConcern).toBe(true);
  });

  it('should handle all responses being excluded from CV', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 400000, itemType: 'personality' },
      { itemId: '2', responseTimeMs: 500000, itemType: 'personality' },
    ];

    const result = analyzeResponseTimes(responses);
    expect(result.excludedCount).toBe(2);
    expect(result.coefficientOfVariation).toBe(0);
    expect(result.personalityCv).toBe(0);
    expect(result.sjtCv).toBe(0);
  });

  it('should handle exactly 20% flagged (no concern)', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 500, itemType: 'personality' },   // flagged
      { itemId: '2', responseTimeMs: 3000, itemType: 'personality' },
      { itemId: '3', responseTimeMs: 4000, itemType: 'personality' },
      { itemId: '4', responseTimeMs: 5000, itemType: 'personality' },
      { itemId: '5', responseTimeMs: 6000, itemType: 'personality' },
    ];

    const result = analyzeResponseTimes(responses);
    expect(result.flaggedFastCount).toBe(1);
    expect(result.flaggedPercentage).toBe(20); // exactly 20%
    expect(result.responseTimeConcern).toBe(false); // > 20% required, not >=
  });

  it('should handle single response', () => {
    const responses: ResponseTimeData[] = [
      { itemId: '1', responseTimeMs: 3000, itemType: 'personality' },
    ];

    const result = analyzeResponseTimes(responses);
    expect(result.flaggedFastCount).toBe(0);
    expect(result.totalResponses).toBe(1);
    expect(result.flaggedPercentage).toBe(0);
    expect(result.responseTimeConcern).toBe(false);
    // Single value → CV = 0
    expect(result.personalityCv).toBe(0);
    expect(result.coefficientOfVariation).toBe(0);
  });
});
