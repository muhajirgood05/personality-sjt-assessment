import { describe, it, expect } from 'vitest';
import {
  isPairConsistent,
  hasSignificantInconsistency,
  calculateConsistencyIndex,
  ConsistencyPairResponse,
} from './consistency-index';

describe('isPairConsistent', () => {
  it('returns true when responses are equal', () => {
    expect(isPairConsistent(3, 3)).toBe(true);
  });

  it('returns true when difference is exactly 1', () => {
    expect(isPairConsistent(2, 3)).toBe(true);
    expect(isPairConsistent(5, 4)).toBe(true);
  });

  it('returns true when difference is exactly 2', () => {
    expect(isPairConsistent(1, 3)).toBe(true);
    expect(isPairConsistent(5, 3)).toBe(true);
  });

  it('returns false when difference is 3', () => {
    expect(isPairConsistent(1, 4)).toBe(false);
    expect(isPairConsistent(5, 2)).toBe(false);
  });

  it('returns false when difference is 4', () => {
    expect(isPairConsistent(1, 5)).toBe(false);
    expect(isPairConsistent(5, 1)).toBe(false);
  });
});

describe('hasSignificantInconsistency', () => {
  it('returns true when index is below 60%', () => {
    expect(hasSignificantInconsistency(59)).toBe(true);
    expect(hasSignificantInconsistency(0)).toBe(true);
    expect(hasSignificantInconsistency(59.9)).toBe(true);
  });

  it('returns false when index is exactly 60%', () => {
    expect(hasSignificantInconsistency(60)).toBe(false);
  });

  it('returns false when index is above 60%', () => {
    expect(hasSignificantInconsistency(61)).toBe(false);
    expect(hasSignificantInconsistency(100)).toBe(false);
  });
});

describe('calculateConsistencyIndex', () => {
  it('returns 100% when all pairs are consistent', () => {
    const pairs: ConsistencyPairResponse[] = Array.from(
      { length: 15 },
      (_, i) => ({
        pairId: `pair-${i + 1}`,
        firstResponse: 3,
        secondResponse: 4, // difference of 1, consistent
      })
    );

    const result = calculateConsistencyIndex(pairs);

    expect(result.consistencyIndex).toBe(100);
    expect(result.inconsistentPairCount).toBe(0);
    expect(result.totalEvaluatedPairs).toBe(15);
    expect(result.excludedPairCount).toBe(0);
    expect(result.significantInconsistency).toBe(false);
  });

  it('returns 0% when all pairs are inconsistent', () => {
    const pairs: ConsistencyPairResponse[] = Array.from(
      { length: 15 },
      (_, i) => ({
        pairId: `pair-${i + 1}`,
        firstResponse: 1,
        secondResponse: 5, // difference of 4, inconsistent
      })
    );

    const result = calculateConsistencyIndex(pairs);

    expect(result.consistencyIndex).toBe(0);
    expect(result.inconsistentPairCount).toBe(15);
    expect(result.totalEvaluatedPairs).toBe(15);
    expect(result.excludedPairCount).toBe(0);
    expect(result.significantInconsistency).toBe(true);
  });

  it('calculates mixed consistency correctly', () => {
    const pairs: ConsistencyPairResponse[] = [
      { pairId: 'pair-1', firstResponse: 3, secondResponse: 3 }, // consistent
      { pairId: 'pair-2', firstResponse: 2, secondResponse: 4 }, // consistent (diff=2)
      { pairId: 'pair-3', firstResponse: 1, secondResponse: 5 }, // inconsistent (diff=4)
      { pairId: 'pair-4', firstResponse: 4, secondResponse: 4 }, // consistent
      { pairId: 'pair-5', firstResponse: 1, secondResponse: 4 }, // inconsistent (diff=3)
    ];

    const result = calculateConsistencyIndex(pairs);

    // 3 consistent out of 5 evaluated = 60%
    expect(result.consistencyIndex).toBe(60);
    expect(result.inconsistentPairCount).toBe(2);
    expect(result.totalEvaluatedPairs).toBe(5);
    expect(result.excludedPairCount).toBe(0);
    expect(result.significantInconsistency).toBe(false);
  });

  it('excludes pairs with unanswered first item', () => {
    const pairs: ConsistencyPairResponse[] = [
      { pairId: 'pair-1', firstResponse: null, secondResponse: 3 },
      { pairId: 'pair-2', firstResponse: 2, secondResponse: 3 }, // consistent
      { pairId: 'pair-3', firstResponse: 1, secondResponse: 5 }, // inconsistent
    ];

    const result = calculateConsistencyIndex(pairs);

    // 1 consistent out of 2 evaluated = 50%
    expect(result.consistencyIndex).toBe(50);
    expect(result.inconsistentPairCount).toBe(1);
    expect(result.totalEvaluatedPairs).toBe(2);
    expect(result.excludedPairCount).toBe(1);
    expect(result.significantInconsistency).toBe(true);
  });

  it('excludes pairs with unanswered second item', () => {
    const pairs: ConsistencyPairResponse[] = [
      { pairId: 'pair-1', firstResponse: 3, secondResponse: null },
      { pairId: 'pair-2', firstResponse: 4, secondResponse: 4 }, // consistent
      { pairId: 'pair-3', firstResponse: 2, secondResponse: 2 }, // consistent
    ];

    const result = calculateConsistencyIndex(pairs);

    // 2 consistent out of 2 evaluated = 100%
    expect(result.consistencyIndex).toBe(100);
    expect(result.inconsistentPairCount).toBe(0);
    expect(result.totalEvaluatedPairs).toBe(2);
    expect(result.excludedPairCount).toBe(1);
    expect(result.significantInconsistency).toBe(false);
  });

  it('excludes pairs where both items are unanswered', () => {
    const pairs: ConsistencyPairResponse[] = [
      { pairId: 'pair-1', firstResponse: null, secondResponse: null },
      { pairId: 'pair-2', firstResponse: 3, secondResponse: 4 }, // consistent
    ];

    const result = calculateConsistencyIndex(pairs);

    expect(result.consistencyIndex).toBe(100);
    expect(result.totalEvaluatedPairs).toBe(1);
    expect(result.excludedPairCount).toBe(1);
  });

  it('handles all pairs excluded gracefully (returns 100%)', () => {
    const pairs: ConsistencyPairResponse[] = [
      { pairId: 'pair-1', firstResponse: null, secondResponse: 3 },
      { pairId: 'pair-2', firstResponse: 2, secondResponse: null },
      { pairId: 'pair-3', firstResponse: null, secondResponse: null },
    ];

    const result = calculateConsistencyIndex(pairs);

    expect(result.consistencyIndex).toBe(100);
    expect(result.inconsistentPairCount).toBe(0);
    expect(result.totalEvaluatedPairs).toBe(0);
    expect(result.excludedPairCount).toBe(3);
    expect(result.significantInconsistency).toBe(false);
  });

  it('handles empty pairs array', () => {
    const result = calculateConsistencyIndex([]);

    expect(result.consistencyIndex).toBe(100);
    expect(result.inconsistentPairCount).toBe(0);
    expect(result.totalEvaluatedPairs).toBe(0);
    expect(result.excludedPairCount).toBe(0);
    expect(result.significantInconsistency).toBe(false);
    expect(result.pairDetails).toHaveLength(0);
  });

  it('flags assessment at exactly 60% threshold (not flagged)', () => {
    // 9 consistent, 6 inconsistent out of 15 = 60%
    const pairs: ConsistencyPairResponse[] = [
      ...Array.from({ length: 9 }, (_, i) => ({
        pairId: `consistent-${i + 1}`,
        firstResponse: 3,
        secondResponse: 4, // diff=1, consistent
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        pairId: `inconsistent-${i + 1}`,
        firstResponse: 1,
        secondResponse: 5, // diff=4, inconsistent
      })),
    ];

    const result = calculateConsistencyIndex(pairs);

    expect(result.consistencyIndex).toBe(60);
    expect(result.significantInconsistency).toBe(false);
  });

  it('flags assessment just below 60% threshold', () => {
    // 8 consistent, 7 inconsistent out of 15 ≈ 53.33%
    const pairs: ConsistencyPairResponse[] = [
      ...Array.from({ length: 8 }, (_, i) => ({
        pairId: `consistent-${i + 1}`,
        firstResponse: 3,
        secondResponse: 4,
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        pairId: `inconsistent-${i + 1}`,
        firstResponse: 1,
        secondResponse: 5,
      })),
    ];

    const result = calculateConsistencyIndex(pairs);

    expect(result.consistencyIndex).toBeCloseTo(53.33, 1);
    expect(result.significantInconsistency).toBe(true);
  });

  it('provides correct pair details for each pair', () => {
    const pairs: ConsistencyPairResponse[] = [
      { pairId: 'pair-1', firstResponse: 2, secondResponse: 4 }, // consistent, diff=2
      { pairId: 'pair-2', firstResponse: 1, secondResponse: 5 }, // inconsistent, diff=4
      { pairId: 'pair-3', firstResponse: null, secondResponse: 3 }, // excluded
    ];

    const result = calculateConsistencyIndex(pairs);

    expect(result.pairDetails).toHaveLength(3);

    expect(result.pairDetails[0]).toEqual({
      pairId: 'pair-1',
      firstResponse: 2,
      secondResponse: 4,
      difference: 2,
      isConsistent: true,
      isExcluded: false,
    });

    expect(result.pairDetails[1]).toEqual({
      pairId: 'pair-2',
      firstResponse: 1,
      secondResponse: 5,
      difference: 4,
      isConsistent: false,
      isExcluded: false,
    });

    expect(result.pairDetails[2]).toEqual({
      pairId: 'pair-3',
      firstResponse: null,
      secondResponse: 3,
      difference: null,
      isConsistent: false,
      isExcluded: true,
    });
  });

  it('adjusts denominator when pairs are excluded', () => {
    // 15 total pairs, 5 excluded, 7 consistent out of 10 evaluated = 70%
    const pairs: ConsistencyPairResponse[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        pairId: `consistent-${i + 1}`,
        firstResponse: 3,
        secondResponse: 4,
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        pairId: `inconsistent-${i + 1}`,
        firstResponse: 1,
        secondResponse: 5,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        pairId: `excluded-${i + 1}`,
        firstResponse: null,
        secondResponse: 2,
      })),
    ];

    const result = calculateConsistencyIndex(pairs);

    expect(result.consistencyIndex).toBe(70);
    expect(result.totalEvaluatedPairs).toBe(10);
    expect(result.excludedPairCount).toBe(5);
    expect(result.inconsistentPairCount).toBe(3);
    expect(result.significantInconsistency).toBe(false);
  });
});
