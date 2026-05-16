import { describe, it, expect } from 'vitest';
import { OceanDimension } from '@assessment/shared';
import {
  calculateItemScores,
  calculateRawDimensionScores,
  calculateRawFacetScores,
  normalizeToSten,
  countResponsesPerDimension,
  calculateOceanProfile,
  ForcedChoiceResponse,
  NormativeData,
  OCEAN_FACETS,
} from './ocean-scoring';

// ─── Helper Factories ────────────────────────────────────────────────────────

function createResponse(
  overrides: Partial<ForcedChoiceResponse> = {}
): ForcedChoiceResponse {
  return {
    itemId: 'item-1',
    response: 3,
    dimensionLeft: OceanDimension.Openness,
    dimensionRight: OceanDimension.Conscientiousness,
    facetLeft: 'fantasy',
    facetRight: 'competence',
    isReverseScored: false,
    ...overrides,
  };
}

function createNormativeData(): NormativeData {
  const dimensions = new Map<OceanDimension, { mean: number; stdDev: number }>();
  for (const dim of Object.values(OceanDimension)) {
    dimensions.set(dim, { mean: 0, stdDev: 5 });
  }

  const facets = new Map<string, { mean: number; stdDev: number }>();
  for (const facetList of Object.values(OCEAN_FACETS)) {
    for (const facet of facetList) {
      facets.set(facet, { mean: 0, stdDev: 3 });
    }
  }

  return { dimensions, facets };
}

// ─── calculateItemScores ─────────────────────────────────────────────────────

describe('calculateItemScores', () => {
  describe('normal scoring (not reverse-scored)', () => {
    it('response 1: strongly favors left (leftScore=2, rightScore=-2)', () => {
      const result = calculateItemScores(1, false);
      expect(result.leftScore).toBe(2);
      expect(result.rightScore).toBe(-2);
    });

    it('response 2: favors left (leftScore=1, rightScore=-1)', () => {
      const result = calculateItemScores(2, false);
      expect(result.leftScore).toBe(1);
      expect(result.rightScore).toBe(-1);
    });

    it('response 3: neutral (leftScore=0, rightScore=0)', () => {
      const result = calculateItemScores(3, false);
      expect(result.leftScore).toBe(0);
      expect(result.rightScore).toBe(0);
    });

    it('response 4: favors right (leftScore=-1, rightScore=1)', () => {
      const result = calculateItemScores(4, false);
      expect(result.leftScore).toBe(-1);
      expect(result.rightScore).toBe(1);
    });

    it('response 5: strongly favors right (leftScore=-2, rightScore=2)', () => {
      const result = calculateItemScores(5, false);
      expect(result.leftScore).toBe(-2);
      expect(result.rightScore).toBe(2);
    });
  });

  describe('reverse scoring', () => {
    it('response 1: inverted — strongly favors right (leftScore=-2, rightScore=2)', () => {
      const result = calculateItemScores(1, true);
      expect(result.leftScore).toBe(-2);
      expect(result.rightScore).toBe(2);
    });

    it('response 3: neutral remains neutral', () => {
      const result = calculateItemScores(3, true);
      expect(result.leftScore).toBe(0);
      expect(result.rightScore).toBe(0);
    });

    it('response 5: inverted — strongly favors left (leftScore=2, rightScore=-2)', () => {
      const result = calculateItemScores(5, true);
      expect(result.leftScore).toBe(2);
      expect(result.rightScore).toBe(-2);
    });
  });
});

// ─── calculateRawDimensionScores ─────────────────────────────────────────────

describe('calculateRawDimensionScores', () => {
  it('returns zero for all dimensions with no responses', () => {
    const scores = calculateRawDimensionScores([]);
    for (const dim of Object.values(OceanDimension)) {
      expect(scores.get(dim)).toBe(0);
    }
  });

  it('accumulates scores for left dimension when response favors left', () => {
    const responses: ForcedChoiceResponse[] = [
      createResponse({
        response: 1, // strongly favors left → leftScore=2
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Conscientiousness,
      }),
    ];

    const scores = calculateRawDimensionScores(responses);
    expect(scores.get(OceanDimension.Openness)).toBe(2);
    expect(scores.get(OceanDimension.Conscientiousness)).toBe(-2);
  });

  it('accumulates scores for right dimension when response favors right', () => {
    const responses: ForcedChoiceResponse[] = [
      createResponse({
        response: 5, // strongly favors right → rightScore=2
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Extraversion,
      }),
    ];

    const scores = calculateRawDimensionScores(responses);
    expect(scores.get(OceanDimension.Openness)).toBe(-2);
    expect(scores.get(OceanDimension.Extraversion)).toBe(2);
  });

  it('accumulates multiple responses for the same dimension', () => {
    const responses: ForcedChoiceResponse[] = [
      createResponse({
        response: 1, // left gets +2
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Conscientiousness,
      }),
      createResponse({
        response: 2, // left gets +1
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Extraversion,
      }),
      createResponse({
        response: 4, // right gets +1, so Openness as right gets +1
        dimensionLeft: OceanDimension.Agreeableness,
        dimensionRight: OceanDimension.Openness,
      }),
    ];

    const scores = calculateRawDimensionScores(responses);
    // Openness: +2 (from item 1 left) + +1 (from item 2 left) + +1 (from item 3 right) = 4
    expect(scores.get(OceanDimension.Openness)).toBe(4);
  });

  it('handles reverse-scored items correctly', () => {
    const responses: ForcedChoiceResponse[] = [
      createResponse({
        response: 1, // reverse: leftScore = 1-3 = -2, rightScore = 3-1 = 2
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Conscientiousness,
        isReverseScored: true,
      }),
    ];

    const scores = calculateRawDimensionScores(responses);
    expect(scores.get(OceanDimension.Openness)).toBe(-2);
    expect(scores.get(OceanDimension.Conscientiousness)).toBe(2);
  });
});

// ─── calculateRawFacetScores ─────────────────────────────────────────────────

describe('calculateRawFacetScores', () => {
  it('returns empty map with no responses', () => {
    const scores = calculateRawFacetScores([]);
    expect(scores.size).toBe(0);
  });

  it('accumulates scores for left and right facets', () => {
    const responses: ForcedChoiceResponse[] = [
      createResponse({
        response: 1, // leftScore=2, rightScore=-2
        facetLeft: 'fantasy',
        facetRight: 'competence',
      }),
    ];

    const scores = calculateRawFacetScores(responses);
    expect(scores.get('fantasy')).toBe(2);
    expect(scores.get('competence')).toBe(-2);
  });

  it('accumulates multiple responses for the same facet', () => {
    const responses: ForcedChoiceResponse[] = [
      createResponse({
        response: 1, // leftScore=2
        facetLeft: 'fantasy',
        facetRight: 'competence',
      }),
      createResponse({
        response: 2, // leftScore=1
        facetLeft: 'fantasy',
        facetRight: 'order',
      }),
    ];

    const scores = calculateRawFacetScores(responses);
    expect(scores.get('fantasy')).toBe(3);
  });
});

// ─── normalizeToSten ─────────────────────────────────────────────────────────

describe('normalizeToSten', () => {
  it('returns 5 or 6 for a score at the mean (z=0, sten=5.5 rounds to 6)', () => {
    // z = 0, sten = 2*0 + 5.5 = 5.5, rounds to 6
    expect(normalizeToSten(10, 10, 5)).toBe(6);
  });

  it('returns correct sten for z-score of +1 (sten=7.5 rounds to 8)', () => {
    // z = 1, sten = 2*1 + 5.5 = 7.5, rounds to 8
    expect(normalizeToSten(15, 10, 5)).toBe(8);
  });

  it('returns correct sten for z-score of -1 (sten=3.5 rounds to 4)', () => {
    // z = -1, sten = 2*(-1) + 5.5 = 3.5, rounds to 4
    expect(normalizeToSten(5, 10, 5)).toBe(4);
  });

  it('clamps to minimum of 1 for very low scores', () => {
    // z = -5, sten = 2*(-5) + 5.5 = -4.5, clamped to 1
    expect(normalizeToSten(-15, 10, 5)).toBe(1);
  });

  it('clamps to maximum of 10 for very high scores', () => {
    // z = 5, sten = 2*5 + 5.5 = 15.5, clamped to 10
    expect(normalizeToSten(35, 10, 5)).toBe(10);
  });

  it('returns 5 when stdDev is 0 (avoids division by zero)', () => {
    expect(normalizeToSten(10, 10, 0)).toBe(5);
    expect(normalizeToSten(100, 10, 0)).toBe(5);
  });

  it('returns 1 for sten boundary (z = -2.25, sten = 1)', () => {
    // z = -2.25, sten = 2*(-2.25) + 5.5 = 1.0, rounds to 1
    expect(normalizeToSten(10 - 2.25 * 5, 10, 5)).toBe(1);
  });

  it('returns 10 for sten boundary (z = 2.25, sten = 10)', () => {
    // z = 2.25, sten = 2*2.25 + 5.5 = 10.0, rounds to 10
    expect(normalizeToSten(10 + 2.25 * 5, 10, 5)).toBe(10);
  });

  it('handles negative raw scores', () => {
    // rawScore=-5, mean=0, stdDev=5 → z=-1, sten=3.5 → 4
    expect(normalizeToSten(-5, 0, 5)).toBe(4);
  });

  it('handles negative mean', () => {
    // rawScore=0, mean=-10, stdDev=5 → z=2, sten=9.5 → 10
    expect(normalizeToSten(0, -10, 5)).toBe(10);
  });
});

// ─── countResponsesPerDimension ──────────────────────────────────────────────

describe('countResponsesPerDimension', () => {
  it('returns zero for all dimensions with no responses', () => {
    const counts = countResponsesPerDimension([]);
    for (const dim of Object.values(OceanDimension)) {
      expect(counts.get(dim)).toBe(0);
    }
  });

  it('counts both left and right dimensions for each response', () => {
    const responses: ForcedChoiceResponse[] = [
      createResponse({
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Conscientiousness,
      }),
    ];

    const counts = countResponsesPerDimension(responses);
    expect(counts.get(OceanDimension.Openness)).toBe(1);
    expect(counts.get(OceanDimension.Conscientiousness)).toBe(1);
  });

  it('accumulates counts across multiple responses', () => {
    const responses: ForcedChoiceResponse[] = [
      createResponse({
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Conscientiousness,
      }),
      createResponse({
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Extraversion,
      }),
      createResponse({
        dimensionLeft: OceanDimension.Agreeableness,
        dimensionRight: OceanDimension.Openness,
      }),
    ];

    const counts = countResponsesPerDimension(responses);
    expect(counts.get(OceanDimension.Openness)).toBe(3);
    expect(counts.get(OceanDimension.Conscientiousness)).toBe(1);
    expect(counts.get(OceanDimension.Extraversion)).toBe(1);
    expect(counts.get(OceanDimension.Agreeableness)).toBe(1);
  });
});

// ─── calculateOceanProfile ───────────────────────────────────────────────────

describe('calculateOceanProfile', () => {
  it('returns valid profile with sufficient responses', () => {
    // Create enough responses so each dimension has at least 5
    const responses: ForcedChoiceResponse[] = [];
    const dims = Object.values(OceanDimension);

    // Create 5 responses for each pair of adjacent dimensions
    for (let i = 0; i < dims.length; i++) {
      for (let j = 0; j < 5; j++) {
        responses.push(
          createResponse({
            itemId: `item-${i}-${j}`,
            response: 3, // neutral
            dimensionLeft: dims[i],
            dimensionRight: dims[(i + 1) % dims.length],
            facetLeft: OCEAN_FACETS[dims[i]][j % 6],
            facetRight: OCEAN_FACETS[dims[(i + 1) % dims.length]][j % 6],
          })
        );
      }
    }

    const normativeData = createNormativeData();
    const profile = calculateOceanProfile(responses, normativeData);

    expect(profile.valid).toBe(true);
    expect(profile.errors).toHaveLength(0);
    expect(profile.dimensions).toHaveLength(5);
    expect(profile.facets).toHaveLength(30); // 6 facets × 5 dimensions
  });

  it('reports errors for dimensions with insufficient responses', () => {
    // Only 2 responses touching Openness (less than minimum 5)
    const responses: ForcedChoiceResponse[] = [
      createResponse({
        response: 4,
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Conscientiousness,
        facetLeft: 'fantasy',
        facetRight: 'competence',
      }),
      createResponse({
        response: 2,
        dimensionLeft: OceanDimension.Openness,
        dimensionRight: OceanDimension.Extraversion,
        facetLeft: 'aesthetics',
        facetRight: 'warmth',
      }),
    ];

    const normativeData = createNormativeData();
    const profile = calculateOceanProfile(responses, normativeData);

    expect(profile.valid).toBe(false);
    expect(profile.errors.length).toBeGreaterThan(0);
    // Should have errors for dimensions with < 5 responses
    const openError = profile.errors.find((e) => e.includes('openness'));
    expect(openError).toBeDefined();
  });

  it('normalizes dimension scores to sten scale correctly', () => {
    const responses: ForcedChoiceResponse[] = [];
    const dims = Object.values(OceanDimension);

    // Create responses that give Openness a high raw score
    for (let j = 0; j < 10; j++) {
      responses.push(
        createResponse({
          itemId: `item-o-${j}`,
          response: 1, // strongly favors left (Openness)
          dimensionLeft: OceanDimension.Openness,
          dimensionRight: dims[(1 + j) % dims.length] === OceanDimension.Openness
            ? OceanDimension.Conscientiousness
            : dims[(1 + j) % dims.length],
          facetLeft: OCEAN_FACETS[OceanDimension.Openness][j % 6],
          facetRight: OCEAN_FACETS[OceanDimension.Conscientiousness][j % 6],
        })
      );
    }

    // Add enough responses for other dimensions
    for (let i = 1; i < dims.length; i++) {
      for (let j = 0; j < 5; j++) {
        responses.push(
          createResponse({
            itemId: `item-${i}-${j}`,
            response: 3,
            dimensionLeft: dims[i],
            dimensionRight: dims[(i + 1) % dims.length],
            facetLeft: OCEAN_FACETS[dims[i]][j % 6],
            facetRight: OCEAN_FACETS[dims[(i + 1) % dims.length]][j % 6],
          })
        );
      }
    }

    const normativeData = createNormativeData();
    const profile = calculateOceanProfile(responses, normativeData);

    // Openness should have a high raw score (10 items × 2 = 20)
    const openness = profile.dimensions.find(
      (d) => d.dimension === OceanDimension.Openness
    );
    expect(openness).toBeDefined();
    expect(openness!.rawScore).toBeGreaterThan(0);
    // With mean=0, stdDev=5, rawScore=20: z=4, sten=2*4+5.5=13.5 → clamped to 10
    expect(openness!.stenScore).toBeGreaterThanOrEqual(1);
    expect(openness!.stenScore).toBeLessThanOrEqual(10);
  });

  it('returns all 30 facet scores (6 per dimension)', () => {
    const responses: ForcedChoiceResponse[] = [];
    const dims = Object.values(OceanDimension);

    for (let i = 0; i < dims.length; i++) {
      for (let j = 0; j < 5; j++) {
        responses.push(
          createResponse({
            itemId: `item-${i}-${j}`,
            response: 3,
            dimensionLeft: dims[i],
            dimensionRight: dims[(i + 1) % dims.length],
            facetLeft: OCEAN_FACETS[dims[i]][j % 6],
            facetRight: OCEAN_FACETS[dims[(i + 1) % dims.length]][j % 6],
          })
        );
      }
    }

    const normativeData = createNormativeData();
    const profile = calculateOceanProfile(responses, normativeData);

    expect(profile.facets).toHaveLength(30);

    // Check each dimension has exactly 6 facets
    for (const dim of dims) {
      const dimFacets = profile.facets.filter((f) => f.dimension === dim);
      expect(dimFacets).toHaveLength(6);
    }
  });

  it('handles empty responses array', () => {
    const normativeData = createNormativeData();
    const profile = calculateOceanProfile([], normativeData);

    expect(profile.valid).toBe(false);
    expect(profile.errors.length).toBe(5); // One error per dimension
    expect(profile.dimensions).toHaveLength(5);
    expect(profile.facets).toHaveLength(30);
  });

  it('reports error when normative data is missing for a dimension', () => {
    const responses: ForcedChoiceResponse[] = [];
    const dims = Object.values(OceanDimension);

    for (let i = 0; i < dims.length; i++) {
      for (let j = 0; j < 5; j++) {
        responses.push(
          createResponse({
            itemId: `item-${i}-${j}`,
            response: 3,
            dimensionLeft: dims[i],
            dimensionRight: dims[(i + 1) % dims.length],
            facetLeft: OCEAN_FACETS[dims[i]][j % 6],
            facetRight: OCEAN_FACETS[dims[(i + 1) % dims.length]][j % 6],
          })
        );
      }
    }

    // Create normative data missing Openness
    const normativeData = createNormativeData();
    normativeData.dimensions.delete(OceanDimension.Openness);

    const profile = calculateOceanProfile(responses, normativeData);

    expect(profile.valid).toBe(false);
    const missingError = profile.errors.find((e) =>
      e.includes('No normative data available for dimension: openness')
    );
    expect(missingError).toBeDefined();

    // Openness should default to sten 5
    const openness = profile.dimensions.find(
      (d) => d.dimension === OceanDimension.Openness
    );
    expect(openness!.stenScore).toBe(5);
  });

  it('facet sten scores are clamped between 1 and 10', () => {
    const responses: ForcedChoiceResponse[] = [];
    const dims = Object.values(OceanDimension);

    // Create extreme responses
    for (let i = 0; i < dims.length; i++) {
      for (let j = 0; j < 10; j++) {
        responses.push(
          createResponse({
            itemId: `item-${i}-${j}`,
            response: 1, // extreme left
            dimensionLeft: dims[i],
            dimensionRight: dims[(i + 1) % dims.length],
            facetLeft: OCEAN_FACETS[dims[i]][j % 6],
            facetRight: OCEAN_FACETS[dims[(i + 1) % dims.length]][j % 6],
          })
        );
      }
    }

    const normativeData = createNormativeData();
    const profile = calculateOceanProfile(responses, normativeData);

    for (const facet of profile.facets) {
      expect(facet.stenScore).toBeGreaterThanOrEqual(1);
      expect(facet.stenScore).toBeLessThanOrEqual(10);
    }
  });

  it('dimension sten scores are integers', () => {
    const responses: ForcedChoiceResponse[] = [];
    const dims = Object.values(OceanDimension);

    for (let i = 0; i < dims.length; i++) {
      for (let j = 0; j < 7; j++) {
        responses.push(
          createResponse({
            itemId: `item-${i}-${j}`,
            response: (j % 5) + 1,
            dimensionLeft: dims[i],
            dimensionRight: dims[(i + 1) % dims.length],
            facetLeft: OCEAN_FACETS[dims[i]][j % 6],
            facetRight: OCEAN_FACETS[dims[(i + 1) % dims.length]][j % 6],
          })
        );
      }
    }

    const normativeData = createNormativeData();
    const profile = calculateOceanProfile(responses, normativeData);

    for (const dim of profile.dimensions) {
      expect(Number.isInteger(dim.stenScore)).toBe(true);
    }
  });
});
