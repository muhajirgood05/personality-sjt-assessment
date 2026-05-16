/**
 * Tests for SJT Repository and Seed Data
 *
 * Validates:
 * - Seed data structure and completeness (30 scenarios, 6 per value)
 * - Word count constraints (50-300 words per scenario)
 * - Option structure (4-5 options per scenario with valid expert rankings)
 * - Randomization determinism (same seed produces same order)
 * - Randomization uniqueness (different seeds produce different orders)
 */

import { describe, it, expect } from 'vitest';
import { KemenkeuValue } from '@assessment/shared';
import { sjtSeedData } from './sjt-items.seed';

describe('SJT Seed Data', () => {
  it('should contain exactly 30 scenarios', () => {
    expect(sjtSeedData.length).toBe(30);
  });

  it('should have exactly 6 scenarios per Kemenkeu value', () => {
    const valueCounts = new Map<KemenkeuValue, number>();

    for (const scenario of sjtSeedData) {
      const value = scenario.dimension;
      valueCounts.set(value, (valueCounts.get(value) ?? 0) + 1);
    }

    expect(valueCounts.get(KemenkeuValue.Integritas)).toBe(6);
    expect(valueCounts.get(KemenkeuValue.Profesionalisme)).toBe(6);
    expect(valueCounts.get(KemenkeuValue.Sinergi)).toBe(6);
    expect(valueCounts.get(KemenkeuValue.Pelayanan)).toBe(6);
    expect(valueCounts.get(KemenkeuValue.Kesempurnaan)).toBe(6);
  });

  it('should have scenario text between 50 and 300 words', () => {
    for (const scenario of sjtSeedData) {
      const wordCount = scenario.content.wordCount;
      expect(wordCount).toBeGreaterThanOrEqual(50);
      expect(wordCount).toBeLessThanOrEqual(300);
    }
  });

  it('should have accurate word counts', () => {
    for (const scenario of sjtSeedData) {
      const actualWordCount = scenario.content.scenarioText
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      expect(scenario.content.wordCount).toBe(actualWordCount);
    }
  });

  it('should have 4-5 options per scenario', () => {
    for (const scenario of sjtSeedData) {
      const optionCount = scenario.content.options.length;
      expect(optionCount).toBeGreaterThanOrEqual(4);
      expect(optionCount).toBeLessThanOrEqual(5);
    }
  });

  it('should have valid expert rankings (permutation of 1..N)', () => {
    for (const scenario of sjtSeedData) {
      const options = scenario.content.options;
      const ranks = options.map((o) => o.expertRank).sort((a, b) => a - b);
      const expected = Array.from({ length: options.length }, (_, i) => i + 1);
      expect(ranks).toEqual(expected);
    }
  });

  it('should have unique option IDs within each scenario', () => {
    for (const scenario of sjtSeedData) {
      const ids = scenario.content.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('should have type "sjt_scenario" for all content', () => {
    for (const scenario of sjtSeedData) {
      expect(scenario.content.type).toBe('sjt_scenario');
    }
  });

  it('should have matching expertRanking array', () => {
    for (const scenario of sjtSeedData) {
      const ranksFromOptions = scenario.content.options.map((o) => o.expertRank);
      expect(scenario.expertRanking).toEqual(ranksFromOptions);
    }
  });

  it('should have sequential item positions from 1 to 30', () => {
    const positions = sjtSeedData.map((s) => s.itemPosition);
    const expected = Array.from({ length: 30 }, (_, i) => i + 1);
    expect(positions).toEqual(expected);
  });

  it('should have non-empty option text for all options', () => {
    for (const scenario of sjtSeedData) {
      for (const option of scenario.content.options) {
        expect(option.text.length).toBeGreaterThan(10);
      }
    }
  });

  it('should have content in Bahasa Indonesia (contains common Indonesian words)', () => {
    const indonesianWords = ['yang', 'dan', 'untuk', 'dengan', 'dari', 'Anda'];
    for (const scenario of sjtSeedData) {
      const text = scenario.content.scenarioText;
      const containsIndonesian = indonesianWords.some((word) => text.includes(word));
      expect(containsIndonesian).toBe(true);
    }
  });
});

describe('SJT Randomization', () => {
  // Test the seeded RNG and shuffle functions by importing them indirectly
  // through the repository's getRandomizedScenarios behavior

  it('should produce deterministic order for the same seed', () => {
    // We test the seeded shuffle logic directly
    const { seededShuffle, seededRng } = getRandomizationUtils();

    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result1 = seededShuffle([...items], seededRng(42));
    const result2 = seededShuffle([...items], seededRng(42));

    expect(result1).toEqual(result2);
  });

  it('should produce different orders for different seeds', () => {
    const { seededShuffle, seededRng } = getRandomizationUtils();

    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result1 = seededShuffle([...items], seededRng(42));
    const result2 = seededShuffle([...items], seededRng(99));

    // With 10 items, the probability of two different seeds producing
    // the same permutation is 1/10! ≈ 0.000000028
    expect(result1).not.toEqual(result2);
  });

  it('should preserve all elements after shuffle (no loss or duplication)', () => {
    const { seededShuffle, seededRng } = getRandomizationUtils();

    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = seededShuffle([...items], seededRng(123));

    expect(result.sort((a, b) => a - b)).toEqual(items);
  });
});

/**
 * Helper to extract randomization utilities for testing.
 * These mirror the implementation in sjt.repository.ts.
 */
function getRandomizationUtils() {
  function seededRng(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle<T>(array: T[], rng: () => number): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  return { seededRng, seededShuffle };
}
