import { describe, it, expect } from 'vitest';
import {
  normalizePersonalitySubScore,
  normalizeSjtSubScore,
  classifySuitability,
  calculateCompositeScore,
  CompositeScoreInput,
} from './composite-score';

describe('normalizePersonalitySubScore', () => {
  it('returns 0 for empty scores array', () => {
    expect(normalizePersonalitySubScore([])).toBe(0);
  });

  it('normalizes sten 1 to 0', () => {
    const scores = [{ value: 'Integritas', score: 1 }];
    expect(normalizePersonalitySubScore(scores)).toBe(0);
  });

  it('normalizes sten 10 to 100', () => {
    const scores = [{ value: 'Integritas', score: 10 }];
    expect(normalizePersonalitySubScore(scores)).toBe(100);
  });

  it('normalizes sten 5.5 (midpoint) to 50', () => {
    const scores = [{ value: 'Integritas', score: 5.5 }];
    expect(normalizePersonalitySubScore(scores)).toBe(50);
  });

  it('averages multiple scores before normalizing', () => {
    const scores = [
      { value: 'Integritas', score: 10 },
      { value: 'Profesionalisme', score: 1 },
    ];
    // avg = 5.5, normalized = ((5.5 - 1) / 9) × 100 = 50
    expect(normalizePersonalitySubScore(scores)).toBe(50);
  });

  it('handles all five Kemenkeu values', () => {
    const scores = [
      { value: 'Integritas', score: 7 },
      { value: 'Profesionalisme', score: 8 },
      { value: 'Sinergi', score: 6 },
      { value: 'Pelayanan', score: 5 },
      { value: 'Kesempurnaan', score: 9 },
    ];
    // avg = (7+8+6+5+9)/5 = 7
    // normalized = ((7 - 1) / 9) × 100 = 66.67
    expect(normalizePersonalitySubScore(scores)).toBeCloseTo(66.67, 2);
  });

  it('normalizes uniform sten 1 scores to 0', () => {
    const scores = [
      { value: 'Integritas', score: 1 },
      { value: 'Profesionalisme', score: 1 },
      { value: 'Sinergi', score: 1 },
      { value: 'Pelayanan', score: 1 },
      { value: 'Kesempurnaan', score: 1 },
    ];
    expect(normalizePersonalitySubScore(scores)).toBe(0);
  });

  it('normalizes uniform sten 10 scores to 100', () => {
    const scores = [
      { value: 'Integritas', score: 10 },
      { value: 'Profesionalisme', score: 10 },
      { value: 'Sinergi', score: 10 },
      { value: 'Pelayanan', score: 10 },
      { value: 'Kesempurnaan', score: 10 },
    ];
    expect(normalizePersonalitySubScore(scores)).toBe(100);
  });
});

describe('normalizeSjtSubScore', () => {
  it('returns 0 for empty scores array', () => {
    expect(normalizeSjtSubScore([])).toBe(0);
  });

  it('returns the score directly for a single value', () => {
    const scores = [{ value: 'Integritas', score: 75 }];
    expect(normalizeSjtSubScore(scores)).toBe(75);
  });

  it('averages multiple SJT value scores', () => {
    const scores = [
      { value: 'Integritas', score: 80 },
      { value: 'Profesionalisme', score: 60 },
    ];
    // avg = (80 + 60) / 2 = 70
    expect(normalizeSjtSubScore(scores)).toBe(70);
  });

  it('handles all five Kemenkeu values', () => {
    const scores = [
      { value: 'Integritas', score: 90 },
      { value: 'Profesionalisme', score: 70 },
      { value: 'Sinergi', score: 80 },
      { value: 'Pelayanan', score: 60 },
      { value: 'Kesempurnaan', score: 50 },
    ];
    // avg = (90+70+80+60+50)/5 = 70
    expect(normalizeSjtSubScore(scores)).toBe(70);
  });

  it('returns 0 for all-zero scores', () => {
    const scores = [
      { value: 'Integritas', score: 0 },
      { value: 'Profesionalisme', score: 0 },
    ];
    expect(normalizeSjtSubScore(scores)).toBe(0);
  });

  it('returns 100 for all-100 scores', () => {
    const scores = [
      { value: 'Integritas', score: 100 },
      { value: 'Profesionalisme', score: 100 },
    ];
    expect(normalizeSjtSubScore(scores)).toBe(100);
  });
});

describe('classifySuitability', () => {
  it('classifies score 100 as Highly Suitable', () => {
    expect(classifySuitability(100)).toBe('Highly Suitable');
  });

  it('classifies score 80 as Highly Suitable', () => {
    expect(classifySuitability(80)).toBe('Highly Suitable');
  });

  it('classifies score 95 as Highly Suitable', () => {
    expect(classifySuitability(95)).toBe('Highly Suitable');
  });

  it('classifies score 79.99 as Suitable', () => {
    expect(classifySuitability(79.99)).toBe('Suitable');
  });

  it('classifies score 60 as Suitable', () => {
    expect(classifySuitability(60)).toBe('Suitable');
  });

  it('classifies score 70 as Suitable', () => {
    expect(classifySuitability(70)).toBe('Suitable');
  });

  it('classifies score 59.99 as Conditionally Suitable', () => {
    expect(classifySuitability(59.99)).toBe('Conditionally Suitable');
  });

  it('classifies score 40 as Conditionally Suitable', () => {
    expect(classifySuitability(40)).toBe('Conditionally Suitable');
  });

  it('classifies score 50 as Conditionally Suitable', () => {
    expect(classifySuitability(50)).toBe('Conditionally Suitable');
  });

  it('classifies score 39.99 as Not Suitable', () => {
    expect(classifySuitability(39.99)).toBe('Not Suitable');
  });

  it('classifies score 0 as Not Suitable', () => {
    expect(classifySuitability(0)).toBe('Not Suitable');
  });

  it('classifies score 20 as Not Suitable', () => {
    expect(classifySuitability(20)).toBe('Not Suitable');
  });
});

describe('calculateCompositeScore', () => {
  it('calculates composite with equal high scores', () => {
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 10 },
        { value: 'Profesionalisme', score: 10 },
        { value: 'Sinergi', score: 10 },
        { value: 'Pelayanan', score: 10 },
        { value: 'Kesempurnaan', score: 10 },
      ],
      sjtValueScores: [
        { value: 'Integritas', score: 100 },
        { value: 'Profesionalisme', score: 100 },
        { value: 'Sinergi', score: 100 },
        { value: 'Pelayanan', score: 100 },
        { value: 'Kesempurnaan', score: 100 },
      ],
    };

    const result = calculateCompositeScore(input);

    // personality = 100, sjt = 100
    // composite = 0.4 × 100 + 0.6 × 100 = 100
    expect(result.personalitySubScore).toBe(100);
    expect(result.sjtSubScore).toBe(100);
    expect(result.suitabilityScore).toBe(100);
    expect(result.category).toBe('Highly Suitable');
  });

  it('calculates composite with minimum scores', () => {
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 1 },
        { value: 'Profesionalisme', score: 1 },
        { value: 'Sinergi', score: 1 },
        { value: 'Pelayanan', score: 1 },
        { value: 'Kesempurnaan', score: 1 },
      ],
      sjtValueScores: [
        { value: 'Integritas', score: 0 },
        { value: 'Profesionalisme', score: 0 },
        { value: 'Sinergi', score: 0 },
        { value: 'Pelayanan', score: 0 },
        { value: 'Kesempurnaan', score: 0 },
      ],
    };

    const result = calculateCompositeScore(input);

    // personality = 0, sjt = 0
    // composite = 0.4 × 0 + 0.6 × 0 = 0
    expect(result.personalitySubScore).toBe(0);
    expect(result.sjtSubScore).toBe(0);
    expect(result.suitabilityScore).toBe(0);
    expect(result.category).toBe('Not Suitable');
  });

  it('applies correct weights (0.4 personality, 0.6 SJT)', () => {
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 10 }, // normalized to 100
      ],
      sjtValueScores: [
        { value: 'Integritas', score: 0 }, // 0
      ],
    };

    const result = calculateCompositeScore(input);

    // personality = 100, sjt = 0
    // composite = 0.4 × 100 + 0.6 × 0 = 40
    expect(result.personalitySubScore).toBe(100);
    expect(result.sjtSubScore).toBe(0);
    expect(result.suitabilityScore).toBe(40);
    expect(result.category).toBe('Conditionally Suitable');
  });

  it('applies correct weights with SJT dominant', () => {
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 1 }, // normalized to 0
      ],
      sjtValueScores: [
        { value: 'Integritas', score: 100 }, // 100
      ],
    };

    const result = calculateCompositeScore(input);

    // personality = 0, sjt = 100
    // composite = 0.4 × 0 + 0.6 × 100 = 60
    expect(result.personalitySubScore).toBe(0);
    expect(result.sjtSubScore).toBe(100);
    expect(result.suitabilityScore).toBe(60);
    expect(result.category).toBe('Suitable');
  });

  it('handles mixed realistic scores', () => {
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 7 },
        { value: 'Profesionalisme', score: 8 },
        { value: 'Sinergi', score: 6 },
        { value: 'Pelayanan', score: 6 },
        { value: 'Kesempurnaan', score: 8 },
      ],
      sjtValueScores: [
        { value: 'Integritas', score: 75 },
        { value: 'Profesionalisme', score: 80 },
        { value: 'Sinergi', score: 65 },
        { value: 'Pelayanan', score: 70 },
        { value: 'Kesempurnaan', score: 85 },
      ],
    };

    const result = calculateCompositeScore(input);

    // personality avg sten = (7+8+6+6+8)/5 = 7
    // personality normalized = ((7-1)/9) × 100 = 66.67
    // sjt avg = (75+80+65+70+85)/5 = 75
    // composite = 0.4 × 66.67 + 0.6 × 75 = 26.668 + 45 = 71.668 ≈ 71.67
    expect(result.personalitySubScore).toBeCloseTo(66.67, 1);
    expect(result.sjtSubScore).toBe(75);
    expect(result.suitabilityScore).toBeCloseTo(71.67, 1);
    expect(result.category).toBe('Suitable');
  });

  it('handles empty personality scores', () => {
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [],
      sjtValueScores: [
        { value: 'Integritas', score: 80 },
      ],
    };

    const result = calculateCompositeScore(input);

    // personality = 0, sjt = 80
    // composite = 0.4 × 0 + 0.6 × 80 = 48
    expect(result.personalitySubScore).toBe(0);
    expect(result.sjtSubScore).toBe(80);
    expect(result.suitabilityScore).toBe(48);
    expect(result.category).toBe('Conditionally Suitable');
  });

  it('handles empty SJT scores', () => {
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 8 },
      ],
      sjtValueScores: [],
    };

    const result = calculateCompositeScore(input);

    // personality normalized = ((8-1)/9) × 100 = 77.78
    // sjt = 0
    // composite = 0.4 × 77.78 + 0.6 × 0 = 31.11
    expect(result.personalitySubScore).toBeCloseTo(77.78, 1);
    expect(result.sjtSubScore).toBe(0);
    expect(result.suitabilityScore).toBeCloseTo(31.11, 1);
    expect(result.category).toBe('Not Suitable');
  });

  it('result suitabilityScore is always between 0 and 100', () => {
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 5.5 },
      ],
      sjtValueScores: [
        { value: 'Integritas', score: 50 },
      ],
    };

    const result = calculateCompositeScore(input);

    expect(result.suitabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.suitabilityScore).toBeLessThanOrEqual(100);
  });

  it('boundary: composite exactly 80 is Highly Suitable', () => {
    // We need personality and SJT such that 0.4*p + 0.6*s = 80
    // Let personality = 100, sjt = 66.67 → 0.4*100 + 0.6*66.67 = 40 + 40 = 80
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 10 }, // normalized to 100
      ],
      sjtValueScores: [
        { value: 'Integritas', score: 66.67 },
      ],
    };

    const result = calculateCompositeScore(input);

    // composite = 0.4 × 100 + 0.6 × 66.67 = 40 + 40.002 = 80.002 ≈ 80
    expect(result.category).toBe('Highly Suitable');
  });

  it('boundary: composite exactly 60 is Suitable', () => {
    // 0.4*p + 0.6*s = 60
    // Let personality = 0, sjt = 100 → 0.4*0 + 0.6*100 = 60
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 1 }, // normalized to 0
      ],
      sjtValueScores: [
        { value: 'Integritas', score: 100 },
      ],
    };

    const result = calculateCompositeScore(input);

    expect(result.suitabilityScore).toBe(60);
    expect(result.category).toBe('Suitable');
  });

  it('boundary: composite exactly 40 is Conditionally Suitable', () => {
    // 0.4*p + 0.6*s = 40
    // Let personality = 100, sjt = 0 → 0.4*100 + 0.6*0 = 40
    const input: CompositeScoreInput = {
      personalityValueAlignmentScores: [
        { value: 'Integritas', score: 10 }, // normalized to 100
      ],
      sjtValueScores: [
        { value: 'Integritas', score: 0 },
      ],
    };

    const result = calculateCompositeScore(input);

    expect(result.suitabilityScore).toBe(40);
    expect(result.category).toBe('Conditionally Suitable');
  });
});
