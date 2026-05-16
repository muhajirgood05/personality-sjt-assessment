import { describe, it, expect } from 'vitest';
import { KemenkeuValue } from '@assessment/shared';
import {
  calculateScenarioConcordance,
  calculateValueScores,
  calculateSjtScores,
  ScoredScenario,
} from './sjt-concordance';

describe('calculateScenarioConcordance', () => {
  it('returns 100 when candidate ranking matches expert ranking exactly', () => {
    const candidateRanking = [1, 2, 3, 4];
    const expertRanking = [1, 2, 3, 4];

    const score = calculateScenarioConcordance(candidateRanking, expertRanking);

    expect(score).toBe(100);
  });

  it('returns 0 when candidate ranking is maximally different from expert', () => {
    // With 4 options, max distance per position is N-1 = 3
    // Candidate: [4, 3, 2, 1], Expert: [1, 2, 3, 4]
    // Position 0: |4-1|/3 = 1, score = 0, weight = 2 (expert rank 1)
    // Position 1: |3-2|/3 = 0.33, score = 0.67, weight = 1
    // Position 2: |2-3|/3 = 0.33, score = 0.67, weight = 1
    // Position 3: |1-4|/3 = 1, score = 0, weight = 2 (expert rank 4)
    // Weighted: (0*2 + 0.67*1 + 0.67*1 + 0*2) / (2+1+1+2) = 1.33/6 ≈ 22.22
    const candidateRanking = [4, 3, 2, 1];
    const expertRanking = [1, 2, 3, 4];

    const score = calculateScenarioConcordance(candidateRanking, expertRanking);

    expect(score).toBeCloseTo(22.22, 1);
  });

  it('applies 2× weight to most effective position (rank 1)', () => {
    // Expert: [1, 2, 3, 4] — position 0 is most effective (rank 1)
    // Candidate: [2, 2, 3, 4] — only position 0 differs by 1
    // Position 0: |2-1|/3 = 0.33, score = 0.67, weight = 2
    // Position 1: |2-2|/3 = 0, score = 1, weight = 1
    // Position 2: |3-3|/3 = 0, score = 1, weight = 1
    // Position 3: |4-4|/3 = 0, score = 1, weight = 2
    // Weighted: (0.67*2 + 1*1 + 1*1 + 1*2) / 6 = (1.33 + 1 + 1 + 2) / 6 = 5.33/6 ≈ 88.89
    const candidateRanking = [2, 2, 3, 4];
    const expertRanking = [1, 2, 3, 4];

    const score = calculateScenarioConcordance(candidateRanking, expertRanking);

    expect(score).toBeCloseTo(88.89, 1);
  });

  it('applies 2× weight to least effective position (rank N)', () => {
    // Expert: [1, 2, 3, 4] — position 3 is least effective (rank 4)
    // Candidate: [1, 2, 3, 3] — only position 3 differs by 1
    // Position 0: |1-1|/3 = 0, score = 1, weight = 2
    // Position 1: |2-2|/3 = 0, score = 1, weight = 1
    // Position 2: |3-3|/3 = 0, score = 1, weight = 1
    // Position 3: |3-4|/3 = 0.33, score = 0.67, weight = 2
    // Weighted: (1*2 + 1*1 + 1*1 + 0.67*2) / 6 = (2 + 1 + 1 + 1.33) / 6 = 5.33/6 ≈ 88.89
    const candidateRanking = [1, 2, 3, 3];
    const expertRanking = [1, 2, 3, 4];

    const score = calculateScenarioConcordance(candidateRanking, expertRanking);

    expect(score).toBeCloseTo(88.89, 1);
  });

  it('applies 1× weight to middle positions', () => {
    // Expert: [1, 2, 3, 4] — positions 1 and 2 are middle (ranks 2, 3)
    // Candidate: [1, 4, 1, 4] — middle positions differ maximally
    // Position 0: |1-1|/3 = 0, score = 1, weight = 2
    // Position 1: |4-2|/3 = 0.67, score = 0.33, weight = 1
    // Position 2: |1-3|/3 = 0.67, score = 0.33, weight = 1
    // Position 3: |4-4|/3 = 0, score = 1, weight = 2
    // Weighted: (1*2 + 0.33*1 + 0.33*1 + 1*2) / 6 = (2 + 0.33 + 0.33 + 2) / 6 = 4.67/6 ≈ 77.78
    const candidateRanking = [1, 4, 1, 4];
    const expertRanking = [1, 2, 3, 4];

    const score = calculateScenarioConcordance(candidateRanking, expertRanking);

    expect(score).toBeCloseTo(77.78, 1);
  });

  it('handles scenarios with 5 options', () => {
    // N=5, positions with expert rank 1 and 5 get 2× weight
    const candidateRanking = [1, 2, 3, 4, 5];
    const expertRanking = [1, 2, 3, 4, 5];

    const score = calculateScenarioConcordance(candidateRanking, expertRanking);

    expect(score).toBe(100);
  });

  it('handles scenarios with 6 options', () => {
    // N=6, expert: [1,2,3,4,5,6]
    // Candidate matches exactly
    const candidateRanking = [1, 2, 3, 4, 5, 6];
    const expertRanking = [1, 2, 3, 4, 5, 6];

    const score = calculateScenarioConcordance(candidateRanking, expertRanking);

    expect(score).toBe(100);
  });

  it('returns 0 for empty rankings', () => {
    const score = calculateScenarioConcordance([], []);

    expect(score).toBe(0);
  });

  it('returns 100 for single-item ranking that matches', () => {
    const score = calculateScenarioConcordance([1], [1]);

    expect(score).toBe(100);
  });

  it('returns 0 for single-item ranking that does not match', () => {
    const score = calculateScenarioConcordance([2], [1]);

    expect(score).toBe(0);
  });

  it('produces score in 0-100 range for any valid input', () => {
    // Various test cases to ensure score is always in range
    const testCases = [
      { candidate: [3, 1, 4, 2], expert: [1, 2, 3, 4] },
      { candidate: [2, 1, 4, 3], expert: [1, 3, 2, 4] },
      { candidate: [4, 3, 2, 1], expert: [4, 3, 2, 1] },
      { candidate: [1, 3, 2, 4, 5], expert: [2, 1, 3, 5, 4] },
    ];

    for (const { candidate, expert } of testCases) {
      const score = calculateScenarioConcordance(candidate, expert);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('calculateValueScores', () => {
  it('calculates average score per value from completed scenarios', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's2',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [4, 3, 2, 1],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
    ];

    const scores = calculateValueScores(scenarios);
    const integritasScore = scores.find(
      (s) => s.value === KemenkeuValue.Integritas
    );

    // First scenario: 100, Second scenario: ~22.22
    // Average: (100 + 22.22) / 2 ≈ 61.11
    expect(integritasScore).toBeDefined();
    expect(integritasScore!.score).toBeCloseTo(61.11, 1);
  });

  it('returns 0 for values with no completed scenarios', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: false, // not completed
      },
    ];

    const scores = calculateValueScores(scenarios);
    const integritasScore = scores.find(
      (s) => s.value === KemenkeuValue.Integritas
    );

    expect(integritasScore).toBeDefined();
    expect(integritasScore!.score).toBe(0);
  });

  it('only scores completed scenarios, ignoring incomplete ones', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Sinergi,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's2',
        kemenkeuValue: KemenkeuValue.Sinergi,
        candidateRanking: [4, 3, 2, 1],
        expertRanking: [1, 2, 3, 4],
        completed: false, // should be ignored
      },
    ];

    const scores = calculateValueScores(scenarios);
    const sinergiScore = scores.find(
      (s) => s.value === KemenkeuValue.Sinergi
    );

    // Only the first scenario (score=100) should be counted
    expect(sinergiScore).toBeDefined();
    expect(sinergiScore!.score).toBe(100);
  });

  it('returns scores for all five Kemenkeu values', () => {
    const scenarios: ScoredScenario[] = [];

    const scores = calculateValueScores(scenarios);

    expect(scores).toHaveLength(5);
    const values = scores.map((s) => s.value);
    expect(values).toContain(KemenkeuValue.Integritas);
    expect(values).toContain(KemenkeuValue.Profesionalisme);
    expect(values).toContain(KemenkeuValue.Sinergi);
    expect(values).toContain(KemenkeuValue.Pelayanan);
    expect(values).toContain(KemenkeuValue.Kesempurnaan);
  });

  it('handles multiple values with different scenario counts', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's2',
        kemenkeuValue: KemenkeuValue.Pelayanan,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's3',
        kemenkeuValue: KemenkeuValue.Pelayanan,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
    ];

    const scores = calculateValueScores(scenarios);
    const integritasScore = scores.find(
      (s) => s.value === KemenkeuValue.Integritas
    );
    const pelayananScore = scores.find(
      (s) => s.value === KemenkeuValue.Pelayanan
    );

    expect(integritasScore!.score).toBe(100);
    expect(pelayananScore!.score).toBe(100);
  });
});

describe('calculateSjtScores', () => {
  it('returns complete scoring result for all completed scenarios', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's2',
        kemenkeuValue: KemenkeuValue.Profesionalisme,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's3',
        kemenkeuValue: KemenkeuValue.Sinergi,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's4',
        kemenkeuValue: KemenkeuValue.Pelayanan,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's5',
        kemenkeuValue: KemenkeuValue.Kesempurnaan,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
    ];

    const result = calculateSjtScores(scenarios);

    expect(result.overallScore).toBe(100);
    expect(result.completedScenarios).toBe(5);
    expect(result.totalScenarios).toBe(5);
    expect(result.partialValues).toHaveLength(0);
    expect(result.valueScores).toHaveLength(5);
  });

  it('handles partial completion — only scores completed scenarios', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's2',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [4, 3, 2, 1],
        expertRanking: [1, 2, 3, 4],
        completed: false,
      },
    ];

    const result = calculateSjtScores(scenarios);

    expect(result.completedScenarios).toBe(1);
    expect(result.totalScenarios).toBe(2);
    expect(result.partialValues).toContain(KemenkeuValue.Integritas);
  });

  it('marks values with no scenarios as partial', () => {
    // Only provide scenarios for one value
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
    ];

    const result = calculateSjtScores(scenarios);

    // All values except Integritas should be partial (no scenarios mapped)
    expect(result.partialValues).toContain(KemenkeuValue.Profesionalisme);
    expect(result.partialValues).toContain(KemenkeuValue.Sinergi);
    expect(result.partialValues).toContain(KemenkeuValue.Pelayanan);
    expect(result.partialValues).toContain(KemenkeuValue.Kesempurnaan);
    expect(result.partialValues).not.toContain(KemenkeuValue.Integritas);
  });

  it('calculates overall score as average of values with completed scenarios', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's2',
        kemenkeuValue: KemenkeuValue.Profesionalisme,
        candidateRanking: [4, 3, 2, 1],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
    ];

    const result = calculateSjtScores(scenarios);

    // Integritas: 100, Profesionalisme: ~22.22
    // Overall: (100 + 22.22) / 2 ≈ 61.11
    expect(result.overallScore).toBeCloseTo(61.11, 1);
  });

  it('returns 0 overall score when no scenarios are completed', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: false,
      },
    ];

    const result = calculateSjtScores(scenarios);

    expect(result.overallScore).toBe(0);
    expect(result.completedScenarios).toBe(0);
  });

  it('handles empty scenarios array', () => {
    const result = calculateSjtScores([]);

    expect(result.overallScore).toBe(0);
    expect(result.completedScenarios).toBe(0);
    expect(result.totalScenarios).toBe(0);
    expect(result.valueScores).toHaveLength(5);
    // All values are partial since none have scenarios
    expect(result.partialValues).toHaveLength(5);
  });

  it('correctly identifies partial values when some scenarios are incomplete', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's2',
        kemenkeuValue: KemenkeuValue.Integritas,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's3',
        kemenkeuValue: KemenkeuValue.Sinergi,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: true,
      },
      {
        scenarioId: 's4',
        kemenkeuValue: KemenkeuValue.Sinergi,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: false, // incomplete
      },
    ];

    const result = calculateSjtScores(scenarios);

    // Sinergi has 2 scenarios but only 1 completed — partial
    expect(result.partialValues).toContain(KemenkeuValue.Sinergi);
    // Integritas has 2 scenarios, both completed — not partial
    expect(result.partialValues).not.toContain(KemenkeuValue.Integritas);
  });

  it('value score is 0 when value has scenarios but none completed', () => {
    const scenarios: ScoredScenario[] = [
      {
        scenarioId: 's1',
        kemenkeuValue: KemenkeuValue.Pelayanan,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: false,
      },
      {
        scenarioId: 's2',
        kemenkeuValue: KemenkeuValue.Pelayanan,
        candidateRanking: [1, 2, 3, 4],
        expertRanking: [1, 2, 3, 4],
        completed: false,
      },
    ];

    const result = calculateSjtScores(scenarios);
    const pelayananScore = result.valueScores.find(
      (s) => s.value === KemenkeuValue.Pelayanan
    );

    expect(pelayananScore!.score).toBe(0);
    expect(result.partialValues).toContain(KemenkeuValue.Pelayanan);
  });
});
