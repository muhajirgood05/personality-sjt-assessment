/**
 * Response time tracking and analysis for anti-faking detection.
 *
 * Tracks per-item response times and flags suspiciously fast responses
 * that may indicate faking or inattentive responding.
 *
 * Key thresholds:
 * - Personality items: < 1500ms flagged as fast
 * - SJT items: < 8000ms flagged as fast
 * - Items > 300000ms (5 min): excluded from CV calculation
 * - > 20% flagged: "response time concern" indicator
 *
 * @module scoring/response-time
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ResponseTimeData {
  itemId: string;
  responseTimeMs: number;
  itemType: 'personality' | 'sjt';
}

export interface ResponseTimeAnalysis {
  flaggedFastCount: number;
  totalResponses: number;
  flaggedPercentage: number;
  responseTimeConcern: boolean;
  coefficientOfVariation: number;
  personalityCv: number;
  sjtCv: number;
  excludedCount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum response time for personality items (ms) */
export const PERSONALITY_MIN_TIME_MS = 1500;

/** Minimum response time for SJT items (ms) */
export const SJT_MIN_TIME_MS = 8000;

/** Maximum response time before exclusion from CV calculation (ms) */
export const MAX_TIME_FOR_CV_MS = 300000;

/** Percentage threshold for response time concern */
export const CONCERN_THRESHOLD_PERCENTAGE = 20;

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Determines if a response time is flagged as suspiciously fast.
 *
 * @param responseTimeMs - The response time in milliseconds
 * @param itemType - The type of item ('personality' or 'sjt')
 * @returns true if the response time is below the threshold for the item type
 */
export function isFlaggedFast(
  responseTimeMs: number,
  itemType: 'personality' | 'sjt',
): boolean {
  if (itemType === 'personality') {
    return responseTimeMs < PERSONALITY_MIN_TIME_MS;
  }
  return responseTimeMs < SJT_MIN_TIME_MS;
}

/**
 * Determines if a response time should be excluded from CV calculation.
 * Items taking longer than 5 minutes (300000ms) are excluded.
 *
 * @param responseTimeMs - The response time in milliseconds
 * @returns true if the response time exceeds the maximum threshold
 */
export function shouldExcludeFromCv(responseTimeMs: number): boolean {
  return responseTimeMs > MAX_TIME_FOR_CV_MS;
}

/**
 * Calculates the coefficient of variation (CV) for a set of response times.
 * CV = standard deviation / mean
 *
 * @param responseTimes - Array of response times in milliseconds
 * @returns The coefficient of variation, or 0 if fewer than 2 values provided
 */
export function calculateCoefficientOfVariation(
  responseTimes: number[],
): number {
  if (responseTimes.length < 2) {
    return 0;
  }

  const mean =
    responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;

  if (mean === 0) {
    return 0;
  }

  const squaredDiffs = responseTimes.map((t) => (t - mean) ** 2);
  const variance =
    squaredDiffs.reduce((sum, d) => sum + d, 0) / responseTimes.length;
  const stdDev = Math.sqrt(variance);

  return stdDev / mean;
}

/**
 * Determines if the assessment has a response time concern.
 * A concern is raised when more than 20% of responses are flagged.
 *
 * @param flaggedPercentage - The percentage of flagged responses (0-100)
 * @returns true if the flagged percentage exceeds 20%
 */
export function hasResponseTimeConcern(flaggedPercentage: number): boolean {
  return flaggedPercentage > CONCERN_THRESHOLD_PERCENTAGE;
}

/**
 * Performs a full response time analysis on a set of responses.
 *
 * Calculates:
 * - Number and percentage of flagged fast responses
 * - Whether a response time concern exists (>20% flagged)
 * - Coefficient of variation for all non-excluded items
 * - Separate CV for personality and SJT items
 * - Count of excluded items (>300000ms)
 *
 * @param responses - Array of response time data
 * @returns Complete response time analysis
 */
export function analyzeResponseTimes(
  responses: ResponseTimeData[],
): ResponseTimeAnalysis {
  if (responses.length === 0) {
    return {
      flaggedFastCount: 0,
      totalResponses: 0,
      flaggedPercentage: 0,
      responseTimeConcern: false,
      coefficientOfVariation: 0,
      personalityCv: 0,
      sjtCv: 0,
      excludedCount: 0,
    };
  }

  // Count flagged responses
  const flaggedFastCount = responses.filter((r) =>
    isFlaggedFast(r.responseTimeMs, r.itemType),
  ).length;

  const totalResponses = responses.length;
  const flaggedPercentage = (flaggedFastCount / totalResponses) * 100;
  const responseTimeConcern = hasResponseTimeConcern(flaggedPercentage);

  // Separate by type and exclude items > 300000ms
  const personalityTimes = responses
    .filter(
      (r) => r.itemType === 'personality' && !shouldExcludeFromCv(r.responseTimeMs),
    )
    .map((r) => r.responseTimeMs);

  const sjtTimes = responses
    .filter(
      (r) => r.itemType === 'sjt' && !shouldExcludeFromCv(r.responseTimeMs),
    )
    .map((r) => r.responseTimeMs);

  // Count excluded items
  const excludedCount = responses.filter((r) =>
    shouldExcludeFromCv(r.responseTimeMs),
  ).length;

  // Calculate CVs
  const personalityCv = calculateCoefficientOfVariation(personalityTimes);
  const sjtCv = calculateCoefficientOfVariation(sjtTimes);

  // Overall CV from all non-excluded items
  const allNonExcludedTimes = [...personalityTimes, ...sjtTimes];
  const coefficientOfVariation =
    calculateCoefficientOfVariation(allNonExcludedTimes);

  return {
    flaggedFastCount,
    totalResponses,
    flaggedPercentage,
    responseTimeConcern,
    coefficientOfVariation,
    personalityCv,
    sjtCv,
    excludedCount,
  };
}
