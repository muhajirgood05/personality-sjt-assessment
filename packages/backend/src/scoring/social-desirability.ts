/**
 * Social Desirability Detection and Adjustment Module.
 *
 * Implements anti-faking mechanisms for detecting impression management:
 * - Calculates SD score from 10 embedded social desirability items
 * - Compares against normative sample 90th percentile
 * - Flags "impression management concern" when threshold exceeded
 * - Applies SD score as covariate to adjust personality scores (max ±1 SD shift)
 * - Generates both raw and adjusted personality scores
 * - Warns when normative sample size < 200
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface SdItemResponse {
  itemId: string;
  response: number; // 1-5 graded scale
  keyedSide: 'left' | 'right'; // which side is the socially desirable response
}

export interface NormativeSdData {
  percentile90: number; // the 90th percentile SD score value
  sampleSize: number;
  mean: number;
  stdDev: number;
}

export interface SdAnalysisResult {
  sdScore: number; // 0-10 count of keyed responses
  percentileExceeded: boolean; // true if > 90th percentile
  impressionManagementConcern: boolean;
  normativeSampleWarning: boolean; // true if sample < 200
  adjustedScores: AdjustedScore[];
}

export interface AdjustedScore {
  dimension: string;
  rawScore: number;
  adjustedScore: number;
  adjustmentAmount: number;
}

export interface RawDimensionScore {
  dimension: string;
  score: number;
  stdDev: number;
}

// ─── SD Score Calculation ────────────────────────────────────────────────────

/**
 * Calculates the social desirability score by counting keyed responses.
 *
 * A response is "keyed" if the candidate chose the socially desirable side:
 * - For a 5-point scale: response 1-2 = strongly left, 3 = neutral, 4-5 = strongly right
 * - If keyedSide is 'left', responses 1-2 count as keyed
 * - If keyedSide is 'right', responses 4-5 count as keyed
 *
 * @param responses - Array of SD item responses (expected 10 items)
 * @returns SD score from 0 to 10 (count of keyed responses)
 */
export function calculateSdScore(responses: SdItemResponse[]): number {
  let keyedCount = 0;

  for (const item of responses) {
    if (isKeyedResponse(item.response, item.keyedSide)) {
      keyedCount++;
    }
  }

  return keyedCount;
}

/**
 * Determines if a single response is keyed (socially desirable).
 */
function isKeyedResponse(response: number, keyedSide: 'left' | 'right'): boolean {
  if (keyedSide === 'left') {
    return response <= 2;
  }
  // keyedSide === 'right'
  return response >= 4;
}

// ─── Percentile Comparison ───────────────────────────────────────────────────

/**
 * Checks whether the SD score exceeds the 90th percentile of the normative sample.
 *
 * @param sdScore - The candidate's social desirability score (0-10)
 * @param normativeData - Normative sample statistics
 * @returns true if sdScore > normativeData.percentile90
 */
export function exceedsPercentile90(
  sdScore: number,
  normativeData: NormativeSdData
): boolean {
  return sdScore > normativeData.percentile90;
}

// ─── Score Adjustment ────────────────────────────────────────────────────────

/**
 * Adjusts personality scores using the SD score as a covariate.
 *
 * Adjustment formula: adjusted = raw - (beta * (sdScore - normMean))
 * Where beta is calculated as the correlation between SD and the trait,
 * approximated here as: beta = (normativeData.stdDev / dimensionStdDev) * correlationEstimate
 *
 * For simplicity, we use a fixed correlation estimate of 0.3 (moderate positive
 * correlation between SD and personality traits, typical in the literature).
 *
 * The adjustment is capped at ±1 standard deviation from the raw score.
 *
 * @param rawScores - Array of raw dimension scores with their standard deviations
 * @param sdScore - The candidate's SD score (0-10)
 * @param normativeData - Normative sample statistics for SD
 * @returns Array of adjusted scores with adjustment amounts
 */
export function adjustScoresForSd(
  rawScores: RawDimensionScore[],
  sdScore: number,
  normativeData: NormativeSdData
): AdjustedScore[] {
  const SD_TRAIT_CORRELATION = 0.3; // moderate correlation estimate
  const sdDeviation = sdScore - normativeData.mean;

  return rawScores.map((dimensionScore) => {
    // Calculate beta: how much to adjust per unit of SD deviation
    const beta = SD_TRAIT_CORRELATION * (dimensionScore.stdDev / (normativeData.stdDev || 1));

    // Calculate raw adjustment
    let adjustment = -(beta * sdDeviation);

    // Cap adjustment at ±1 standard deviation
    const maxAdjustment = dimensionScore.stdDev;
    adjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, adjustment));

    // Normalize -0 to 0
    if (adjustment === 0) adjustment = 0;

    const adjustedScore = dimensionScore.score + adjustment;

    return {
      dimension: dimensionScore.dimension,
      rawScore: dimensionScore.score,
      adjustedScore,
      adjustmentAmount: adjustment,
    };
  });
}

// ─── Full Analysis ───────────────────────────────────────────────────────────

/**
 * Performs complete social desirability analysis.
 *
 * Combines SD score calculation, percentile comparison, impression management
 * flagging, score adjustment, and normative sample reliability warning.
 *
 * @param responses - Array of SD item responses (10 items)
 * @param rawScores - Array of raw personality dimension scores
 * @param normativeData - Normative sample statistics for SD
 * @returns Complete SD analysis result
 */
export function analyzeSocialDesirability(
  responses: SdItemResponse[],
  rawScores: RawDimensionScore[],
  normativeData: NormativeSdData
): SdAnalysisResult {
  const sdScore = calculateSdScore(responses);
  const percentileExceeded = exceedsPercentile90(sdScore, normativeData);
  const normativeSampleWarning = normativeData.sampleSize < 200;
  const adjustedScores = adjustScoresForSd(rawScores, sdScore, normativeData);

  return {
    sdScore,
    percentileExceeded,
    impressionManagementConcern: percentileExceeded,
    normativeSampleWarning,
    adjustedScores,
  };
}
