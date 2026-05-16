/**
 * Tests for the test assembly algorithm.
 * Verifies all psychometric constraints are satisfied.
 */

import { describe, it, expect } from 'vitest';
import { ItemEntity, OceanDimension, SectionType } from '@assessment/shared';
import {
  assembleTest,
  validateAssembly,
  mulberry32,
  ItemBank,
} from './assembly';

// ─── Test Helpers ────────────────────────────────────────────────────────────

const DIMENSIONS = Object.values(OceanDimension);

let itemIdCounter = 0;

function createForcedChoiceItem(opts: {
  dimensionLeft: OceanDimension;
  dimensionRight: OceanDimension;
  isReverseScored?: boolean;
  isConsistencyCheck?: boolean;
  matchedPairId?: string | null;
  isSocialDesirabilityItem?: boolean;
}): ItemEntity {
  itemIdCounter++;
  return {
    id: `item-${itemIdCounter}`,
    sectionType: SectionType.Personality,
    dimension: opts.dimensionLeft,
    facet: 'test_facet',
    itemPosition: itemIdCounter,
    content: {
      type: 'forced_choice',
      statementLeft: `Statement left ${itemIdCounter}`,
      statementRight: `Statement right ${itemIdCounter}`,
      dimensionLeft: opts.dimensionLeft,
      dimensionRight: opts.dimensionRight,
      facetLeft: 'facet_a',
      facetRight: 'facet_b',
      socialDesirabilityLeft: 3.0,
      socialDesirabilityRight: 3.5,
    },
    socialDesirabilityRating: 3.0,
    isReverseScored: opts.isReverseScored ?? false,
    isConsistencyCheck: opts.isConsistencyCheck ?? false,
    matchedPairId: opts.matchedPairId ?? null,
    isSocialDesirabilityItem: opts.isSocialDesirabilityItem ?? false,
    expertRanking: null,
  };
}

/**
 * Create a realistic item bank matching the spec:
 * - 150 regular items (30 per dimension)
 * - 30 consistency items (15 pairs)
 * - 10 social desirability items
 */
function createTestItemBank(): ItemBank {
  itemIdCounter = 0;

  // Regular items: 150 total, 30 per dimension
  // Each item is a forced-choice pair between two dimensions
  const regular: ItemEntity[] = [];
  for (let d = 0; d < DIMENSIONS.length; d++) {
    const dim = DIMENSIONS[d]!;
    const otherDim = DIMENSIONS[(d + 1) % DIMENSIONS.length]!;
    for (let i = 0; i < 30; i++) {
      regular.push(
        createForcedChoiceItem({
          dimensionLeft: dim,
          dimensionRight: otherDim,
          // ~40% reverse scored to ensure we can meet the 30% threshold
          isReverseScored: i % 3 === 0,
        }),
      );
    }
  }

  // Consistency items: 30 total = 15 pairs
  const consistency: ItemEntity[] = [];
  for (let p = 0; p < 15; p++) {
    const pairId = `pair-${p}`;
    const dim = DIMENSIONS[p % DIMENSIONS.length]!;
    const otherDim = DIMENSIONS[(p + 2) % DIMENSIONS.length]!;
    consistency.push(
      createForcedChoiceItem({
        dimensionLeft: dim,
        dimensionRight: otherDim,
        isConsistencyCheck: true,
        matchedPairId: pairId,
        isReverseScored: p % 4 === 0,
      }),
    );
    consistency.push(
      createForcedChoiceItem({
        dimensionLeft: dim,
        dimensionRight: otherDim,
        isConsistencyCheck: true,
        matchedPairId: pairId,
        isReverseScored: p % 4 === 0,
      }),
    );
  }

  // Social desirability items: 10 total
  const socialDesirability: ItemEntity[] = [];
  for (let i = 0; i < 10; i++) {
    const dim = DIMENSIONS[i % DIMENSIONS.length]!;
    const otherDim = DIMENSIONS[(i + 1) % DIMENSIONS.length]!;
    socialDesirability.push(
      createForcedChoiceItem({
        dimensionLeft: dim,
        dimensionRight: otherDim,
        isSocialDesirabilityItem: true,
        isReverseScored: i % 3 === 0,
      }),
    );
  }

  return { regular, consistency, socialDesirability };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('assembleTest', () => {
  const itemBank = createTestItemBank();

  it('should produce a deterministic result for the same seed', () => {
    const result1 = assembleTest(12345, itemBank);
    const result2 = assembleTest(12345, itemBank);

    expect(result1.items.map((i) => i.id)).toEqual(
      result2.items.map((i) => i.id),
    );
  });

  it('should produce different results for different seeds', () => {
    const result1 = assembleTest(12345, itemBank);
    const result2 = assembleTest(67890, itemBank);

    // The item IDs should differ in order (very unlikely to be identical)
    const ids1 = result1.items.map((i) => i.id);
    const ids2 = result2.items.map((i) => i.id);
    expect(ids1).not.toEqual(ids2);
  });

  it('should select between 120 and 180 items total', () => {
    const result = assembleTest(42, itemBank);
    expect(result.items.length).toBeGreaterThanOrEqual(120);
    expect(result.items.length).toBeLessThanOrEqual(180);
  });

  it('should include all 10 social desirability items', () => {
    const result = assembleTest(42, itemBank);
    const sdItems = result.items.filter((i) => i.isSocialDesirabilityItem);
    expect(sdItems.length).toBe(10);
  });

  it('should include all 30 consistency-check items', () => {
    const result = assembleTest(42, itemBank);
    const consistencyItems = result.items.filter((i) => i.isConsistencyCheck);
    expect(consistencyItems.length).toBe(30);
  });

  it('should have at least 24 items per OCEAN dimension', () => {
    const result = assembleTest(42, itemBank);

    for (const dim of DIMENSIONS) {
      let count = 0;
      for (const item of result.items) {
        if (item.content.type === 'forced_choice') {
          if (
            item.content.dimensionLeft === dim ||
            item.content.dimensionRight === dim
          ) {
            count++;
          }
        }
      }
      expect(count).toBeGreaterThanOrEqual(24);
    }
  });

  it('should have each dimension appear 10–14 times per test half', () => {
    const result = assembleTest(42, itemBank);
    const halfPoint = Math.floor(result.items.length / 2);
    const firstHalf = result.items.slice(0, halfPoint);
    const secondHalf = result.items.slice(halfPoint);

    for (const dim of DIMENSIONS) {
      let firstCount = 0;
      let secondCount = 0;

      // Count by primary dimension (entity's dimension field)
      for (const item of firstHalf) {
        if (item.dimension === dim) {
          firstCount++;
        }
      }

      for (const item of secondHalf) {
        if (item.dimension === dim) {
          secondCount++;
        }
      }

      expect(firstCount).toBeGreaterThanOrEqual(10);
      expect(firstCount).toBeLessThanOrEqual(14);
      expect(secondCount).toBeGreaterThanOrEqual(10);
      expect(secondCount).toBeLessThanOrEqual(14);
    }
  });

  it('should place consistency-check pairs at least 20 positions apart', () => {
    const result = assembleTest(42, itemBank);

    // Group by matchedPairId
    const pairPositions = new Map<string, number[]>();
    for (let i = 0; i < result.items.length; i++) {
      const item = result.items[i]!;
      if (item.isConsistencyCheck && item.matchedPairId) {
        if (!pairPositions.has(item.matchedPairId)) {
          pairPositions.set(item.matchedPairId, []);
        }
        pairPositions.get(item.matchedPairId)!.push(i);
      }
    }

    for (const [_pairId, positions] of pairPositions) {
      if (positions.length === 2) {
        const distance = Math.abs(positions[1]! - positions[0]!);
        expect(distance).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('should place social desirability items at least 5 positions apart', () => {
    const result = assembleTest(42, itemBank);

    const sdPositions: number[] = [];
    for (let i = 0; i < result.items.length; i++) {
      if (result.items[i]!.isSocialDesirabilityItem) {
        sdPositions.push(i);
      }
    }

    for (let i = 1; i < sdPositions.length; i++) {
      const distance = sdPositions[i]! - sdPositions[i - 1]!;
      expect(distance).toBeGreaterThanOrEqual(5);
    }
  });

  it('should have reverse-scored items comprising at least 30% of total', () => {
    const result = assembleTest(42, itemBank);
    const reverseCount = result.items.filter((i) => i.isReverseScored).length;
    const ratio = reverseCount / result.items.length;
    expect(ratio).toBeGreaterThanOrEqual(0.3);
  });

  it('should pass full validation for multiple seeds', () => {
    const seeds = [1, 42, 100, 999, 12345, 54321, 99999];
    for (const seed of seeds) {
      const result = assembleTest(seed, itemBank);
      const validation = validateAssembly(result);
      if (!validation.valid) {
        console.log(`Seed ${seed} violations:`, validation.violations);
      }
      expect(validation.valid).toBe(true);
    }
  });

  it('should not contain duplicate items', () => {
    const result = assembleTest(42, itemBank);
    const ids = result.items.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('mulberry32', () => {
  it('should produce deterministic output for the same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('should produce values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('should produce different sequences for different seeds', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});

describe('validateAssembly', () => {
  const itemBank = createTestItemBank();

  it('should report violations for an empty assembly', () => {
    const result = { items: [], seed: 0 };
    const validation = validateAssembly(result);
    expect(validation.valid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);
  });

  it('should validate a correctly assembled test', () => {
    const result = assembleTest(42, itemBank);
    const validation = validateAssembly(result);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toEqual([]);
  });
});
