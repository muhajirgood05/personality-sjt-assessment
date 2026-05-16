/**
 * Consistency Index Calculation
 *
 * Calculates the consistency index for personality test responses by comparing
 * matched item pairs. A pair is inconsistent when the absolute difference
 * between responses exceeds 2 points on the 5-point scale.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

export interface ConsistencyPairResponse {
  pairId: string;
  firstResponse: number | null; // null if unanswered
  secondResponse: number | null; // null if unanswered
}

export interface ConsistencyIndexResult {
  consistencyIndex: number; // 0-100 percentage
  inconsistentPairCount: number;
  totalEvaluatedPairs: number;
  excludedPairCount: number;
  significantInconsistency: boolean; // true if < 60%
  pairDetails: PairDetail[];
}

export interface PairDetail {
  pairId: string;
  firstResponse: number | null;
  secondResponse: number | null;
  difference: number | null;
  isConsistent: boolean;
  isExcluded: boolean;
}

/**
 * Determines if a pair of responses is consistent.
 * A pair is consistent when the absolute difference between responses is ≤ 2.
 */
export function isPairConsistent(
  firstResponse: number,
  secondResponse: number
): boolean {
  return Math.abs(firstResponse - secondResponse) <= 2;
}

/**
 * Determines if the consistency index indicates significant inconsistency.
 * Returns true when the index falls below 60%.
 */
export function hasSignificantInconsistency(
  consistencyIndex: number
): boolean {
  return consistencyIndex < 60;
}

/**
 * Calculates the full consistency index from a set of matched pair responses.
 *
 * Rules:
 * - Pairs where either item is unanswered (null) are excluded from calculation
 * - A pair is inconsistent if |firstResponse - secondResponse| > 2
 * - Consistency Index = (consistent pairs / total evaluated pairs) × 100
 * - Assessment flagged when index < 60%
 * - If all pairs are excluded, consistency index is 100 (no evidence of inconsistency)
 */
export function calculateConsistencyIndex(
  pairs: ConsistencyPairResponse[]
): ConsistencyIndexResult {
  const pairDetails: PairDetail[] = [];
  let evaluatedPairs = 0;
  let inconsistentCount = 0;
  let excludedCount = 0;

  for (const pair of pairs) {
    const isExcluded =
      pair.firstResponse === null || pair.secondResponse === null;

    if (isExcluded) {
      excludedCount++;
      pairDetails.push({
        pairId: pair.pairId,
        firstResponse: pair.firstResponse,
        secondResponse: pair.secondResponse,
        difference: null,
        isConsistent: false,
        isExcluded: true,
      });
      continue;
    }

    const difference = Math.abs(pair.firstResponse - pair.secondResponse);
    const isConsistent = isPairConsistent(
      pair.firstResponse,
      pair.secondResponse
    );

    if (!isConsistent) {
      inconsistentCount++;
    }

    evaluatedPairs++;
    pairDetails.push({
      pairId: pair.pairId,
      firstResponse: pair.firstResponse,
      secondResponse: pair.secondResponse,
      difference,
      isConsistent,
      isExcluded: false,
    });
  }

  // If no pairs can be evaluated, return 100% (no evidence of inconsistency)
  const consistentPairs = evaluatedPairs - inconsistentCount;
  const consistencyIndex =
    evaluatedPairs === 0 ? 100 : (consistentPairs / evaluatedPairs) * 100;

  return {
    consistencyIndex,
    inconsistentPairCount: inconsistentCount,
    totalEvaluatedPairs: evaluatedPairs,
    excludedPairCount: excludedCount,
    significantInconsistency: hasSignificantInconsistency(consistencyIndex),
    pairDetails,
  };
}
