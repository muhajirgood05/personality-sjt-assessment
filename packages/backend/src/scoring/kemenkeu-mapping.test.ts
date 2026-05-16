import { describe, it, expect } from 'vitest';
import { KemenkeuValue } from '@assessment/shared';
import {
  reverseNeuroticism,
  calculateValueAlignment,
  mapOceanToKemenkeuValues,
  OceanStenScores,
} from './kemenkeu-mapping';

describe('reverseNeuroticism', () => {
  it('reverses sten 1 to 10 (high N → low emotional stability)', () => {
    expect(reverseNeuroticism(1)).toBe(10);
  });

  it('reverses sten 10 to 1 (low N → high emotional stability)', () => {
    expect(reverseNeuroticism(10)).toBe(1);
  });

  it('reverses sten 5 to 6 (midpoint)', () => {
    expect(reverseNeuroticism(5)).toBe(6);
  });

  it('reverses sten 6 to 5', () => {
    expect(reverseNeuroticism(6)).toBe(5);
  });

  it('reverses sten 3 to 8 (low N = high stability)', () => {
    expect(reverseNeuroticism(3)).toBe(8);
  });
});

describe('calculateValueAlignment', () => {
  describe('Integritas = avg(reverse(Neuroticism))', () => {
    it('calculates Integritas from reversed Neuroticism', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 5,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 2, // reverse = 9
      };
      expect(calculateValueAlignment(KemenkeuValue.Integritas, scores)).toBe(9);
    });

    it('returns 10 when neuroticism is 1', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 5,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 1, // reverse = 10
      };
      expect(calculateValueAlignment(KemenkeuValue.Integritas, scores)).toBe(10);
    });

    it('returns 1 when neuroticism is 10', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 5,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 10, // reverse = 1
      };
      expect(calculateValueAlignment(KemenkeuValue.Integritas, scores)).toBe(1);
    });
  });

  describe('Profesionalisme = avg(Conscientiousness, reverse(Neuroticism))', () => {
    it('calculates average of C and reversed N', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 8,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 3, // reverse = 8
      };
      // avg(8, 8) = 8
      expect(calculateValueAlignment(KemenkeuValue.Profesionalisme, scores)).toBe(8);
    });

    it('handles unequal C and reversed N', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 6,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 1, // reverse = 10
      };
      // avg(6, 10) = 8
      expect(calculateValueAlignment(KemenkeuValue.Profesionalisme, scores)).toBe(8);
    });

    it('produces fractional result that stays in range', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 7,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 3, // reverse = 8
      };
      // avg(7, 8) = 7.5
      expect(calculateValueAlignment(KemenkeuValue.Profesionalisme, scores)).toBe(7.5);
    });
  });

  describe('Sinergi = avg(Agreeableness, Extraversion)', () => {
    it('calculates average of A and E', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 5,
        extraversion: 7,
        agreeableness: 9,
        neuroticism: 5,
      };
      // avg(9, 7) = 8
      expect(calculateValueAlignment(KemenkeuValue.Sinergi, scores)).toBe(8);
    });

    it('handles equal A and E', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 5,
        extraversion: 6,
        agreeableness: 6,
        neuroticism: 5,
      };
      // avg(6, 6) = 6
      expect(calculateValueAlignment(KemenkeuValue.Sinergi, scores)).toBe(6);
    });
  });

  describe('Pelayanan = avg(Agreeableness, Extraversion)', () => {
    it('calculates average of A and E (same formula as Sinergi)', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 5,
        extraversion: 4,
        agreeableness: 8,
        neuroticism: 5,
      };
      // avg(8, 4) = 6
      expect(calculateValueAlignment(KemenkeuValue.Pelayanan, scores)).toBe(6);
    });

    it('produces same result as Sinergi for same inputs', () => {
      const scores: OceanStenScores = {
        openness: 5,
        conscientiousness: 5,
        extraversion: 7,
        agreeableness: 3,
        neuroticism: 5,
      };
      const sinergi = calculateValueAlignment(KemenkeuValue.Sinergi, scores);
      const pelayanan = calculateValueAlignment(KemenkeuValue.Pelayanan, scores);
      expect(pelayanan).toBe(sinergi);
    });
  });

  describe('Kesempurnaan = avg(Conscientiousness, Openness)', () => {
    it('calculates average of C and O', () => {
      const scores: OceanStenScores = {
        openness: 9,
        conscientiousness: 7,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 5,
      };
      // avg(7, 9) = 8
      expect(calculateValueAlignment(KemenkeuValue.Kesempurnaan, scores)).toBe(8);
    });

    it('handles equal C and O', () => {
      const scores: OceanStenScores = {
        openness: 4,
        conscientiousness: 4,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 5,
      };
      // avg(4, 4) = 4
      expect(calculateValueAlignment(KemenkeuValue.Kesempurnaan, scores)).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('all scores at minimum (1) produces valid sten range', () => {
      const scores: OceanStenScores = {
        openness: 1,
        conscientiousness: 1,
        extraversion: 1,
        agreeableness: 1,
        neuroticism: 1, // reverse = 10
      };

      // Integritas = reverse(1) = 10
      expect(calculateValueAlignment(KemenkeuValue.Integritas, scores)).toBe(10);
      // Profesionalisme = avg(1, 10) = 5.5
      expect(calculateValueAlignment(KemenkeuValue.Profesionalisme, scores)).toBe(5.5);
      // Sinergi = avg(1, 1) = 1
      expect(calculateValueAlignment(KemenkeuValue.Sinergi, scores)).toBe(1);
      // Pelayanan = avg(1, 1) = 1
      expect(calculateValueAlignment(KemenkeuValue.Pelayanan, scores)).toBe(1);
      // Kesempurnaan = avg(1, 1) = 1
      expect(calculateValueAlignment(KemenkeuValue.Kesempurnaan, scores)).toBe(1);
    });

    it('all scores at maximum (10) produces valid sten range', () => {
      const scores: OceanStenScores = {
        openness: 10,
        conscientiousness: 10,
        extraversion: 10,
        agreeableness: 10,
        neuroticism: 10, // reverse = 1
      };

      // Integritas = reverse(10) = 1
      expect(calculateValueAlignment(KemenkeuValue.Integritas, scores)).toBe(1);
      // Profesionalisme = avg(10, 1) = 5.5
      expect(calculateValueAlignment(KemenkeuValue.Profesionalisme, scores)).toBe(5.5);
      // Sinergi = avg(10, 10) = 10
      expect(calculateValueAlignment(KemenkeuValue.Sinergi, scores)).toBe(10);
      // Pelayanan = avg(10, 10) = 10
      expect(calculateValueAlignment(KemenkeuValue.Pelayanan, scores)).toBe(10);
      // Kesempurnaan = avg(10, 10) = 10
      expect(calculateValueAlignment(KemenkeuValue.Kesempurnaan, scores)).toBe(10);
    });

    it('mixed scores produce results in sten range 1-10', () => {
      const scores: OceanStenScores = {
        openness: 3,
        conscientiousness: 8,
        extraversion: 2,
        agreeableness: 9,
        neuroticism: 7, // reverse = 4
      };

      const integritas = calculateValueAlignment(KemenkeuValue.Integritas, scores);
      const profesionalisme = calculateValueAlignment(KemenkeuValue.Profesionalisme, scores);
      const sinergi = calculateValueAlignment(KemenkeuValue.Sinergi, scores);
      const pelayanan = calculateValueAlignment(KemenkeuValue.Pelayanan, scores);
      const kesempurnaan = calculateValueAlignment(KemenkeuValue.Kesempurnaan, scores);

      // All results should be in sten range 1-10
      for (const score of [integritas, profesionalisme, sinergi, pelayanan, kesempurnaan]) {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(10);
      }

      // Verify specific values
      expect(integritas).toBe(4); // reverse(7) = 4
      expect(profesionalisme).toBe(6); // avg(8, 4) = 6
      expect(sinergi).toBe(5.5); // avg(9, 2) = 5.5
      expect(pelayanan).toBe(5.5); // avg(9, 2) = 5.5
      expect(kesempurnaan).toBe(5.5); // avg(8, 3) = 5.5
    });

    it('result is clamped to minimum 1', () => {
      // This shouldn't happen with valid sten inputs (1-10),
      // but the function should handle it gracefully
      const scores: OceanStenScores = {
        openness: 1,
        conscientiousness: 1,
        extraversion: 1,
        agreeableness: 1,
        neuroticism: 10, // reverse = 1
      };

      // All values should be >= 1
      expect(calculateValueAlignment(KemenkeuValue.Integritas, scores)).toBeGreaterThanOrEqual(1);
      expect(calculateValueAlignment(KemenkeuValue.Sinergi, scores)).toBeGreaterThanOrEqual(1);
    });

    it('result is clamped to maximum 10', () => {
      const scores: OceanStenScores = {
        openness: 10,
        conscientiousness: 10,
        extraversion: 10,
        agreeableness: 10,
        neuroticism: 1, // reverse = 10
      };

      // All values should be <= 10
      expect(calculateValueAlignment(KemenkeuValue.Integritas, scores)).toBeLessThanOrEqual(10);
      expect(calculateValueAlignment(KemenkeuValue.Kesempurnaan, scores)).toBeLessThanOrEqual(10);
    });
  });
});

describe('mapOceanToKemenkeuValues', () => {
  it('returns all 5 Kemenkeu values', () => {
    const scores: OceanStenScores = {
      openness: 5,
      conscientiousness: 5,
      extraversion: 5,
      agreeableness: 5,
      neuroticism: 5,
    };

    const result = mapOceanToKemenkeuValues(scores);

    expect(result).toHaveLength(5);
    expect(result.map((r) => r.value)).toEqual([
      KemenkeuValue.Integritas,
      KemenkeuValue.Profesionalisme,
      KemenkeuValue.Sinergi,
      KemenkeuValue.Pelayanan,
      KemenkeuValue.Kesempurnaan,
    ]);
  });

  it('calculates correct scores for balanced input (all 5s)', () => {
    const scores: OceanStenScores = {
      openness: 5,
      conscientiousness: 5,
      extraversion: 5,
      agreeableness: 5,
      neuroticism: 5, // reverse = 6
    };

    const result = mapOceanToKemenkeuValues(scores);

    expect(result[0].score).toBe(6); // Integritas: reverse(5) = 6
    expect(result[1].score).toBe(5.5); // Profesionalisme: avg(5, 6) = 5.5
    expect(result[2].score).toBe(5); // Sinergi: avg(5, 5) = 5
    expect(result[3].score).toBe(5); // Pelayanan: avg(5, 5) = 5
    expect(result[4].score).toBe(5); // Kesempurnaan: avg(5, 5) = 5
  });

  it('includes contributing dimensions for each value', () => {
    const scores: OceanStenScores = {
      openness: 5,
      conscientiousness: 5,
      extraversion: 5,
      agreeableness: 5,
      neuroticism: 5,
    };

    const result = mapOceanToKemenkeuValues(scores);

    expect(result[0].contributingDimensions).toEqual(['neuroticism (reversed)']);
    expect(result[1].contributingDimensions).toEqual(['conscientiousness', 'neuroticism (reversed)']);
    expect(result[2].contributingDimensions).toEqual(['agreeableness', 'extraversion']);
    expect(result[3].contributingDimensions).toEqual(['agreeableness', 'extraversion']);
    expect(result[4].contributingDimensions).toEqual(['conscientiousness', 'openness']);
  });

  it('all scores remain in sten range 1-10 for extreme inputs', () => {
    const extremeCases: OceanStenScores[] = [
      { openness: 1, conscientiousness: 1, extraversion: 1, agreeableness: 1, neuroticism: 1 },
      { openness: 10, conscientiousness: 10, extraversion: 10, agreeableness: 10, neuroticism: 10 },
      { openness: 1, conscientiousness: 10, extraversion: 1, agreeableness: 10, neuroticism: 1 },
      { openness: 10, conscientiousness: 1, extraversion: 10, agreeableness: 1, neuroticism: 10 },
    ];

    for (const scores of extremeCases) {
      const result = mapOceanToKemenkeuValues(scores);
      for (const alignment of result) {
        expect(alignment.score).toBeGreaterThanOrEqual(1);
        expect(alignment.score).toBeLessThanOrEqual(10);
      }
    }
  });

  it('Sinergi and Pelayanan always produce the same score', () => {
    const testCases: OceanStenScores[] = [
      { openness: 3, conscientiousness: 7, extraversion: 2, agreeableness: 9, neuroticism: 4 },
      { openness: 8, conscientiousness: 2, extraversion: 6, agreeableness: 4, neuroticism: 7 },
      { openness: 1, conscientiousness: 10, extraversion: 5, agreeableness: 5, neuroticism: 1 },
    ];

    for (const scores of testCases) {
      const result = mapOceanToKemenkeuValues(scores);
      const sinergi = result.find((r) => r.value === KemenkeuValue.Sinergi)!;
      const pelayanan = result.find((r) => r.value === KemenkeuValue.Pelayanan)!;
      expect(sinergi.score).toBe(pelayanan.score);
    }
  });
});
