/**
 * Unit tests for SJT Service — validation logic and scenario formatting.
 *
 * Tests cover:
 * - Ranking validation (valid permutation, no ties, no gaps)
 * - Elaboration validation (50–500 characters)
 * - Scenario already-submitted check
 * - Scenario formatting (strips expertRank, randomizes options)
 *
 * Requirements: 3.3, 3.4, 3.7, 3.8
 */

import { describe, it, expect } from 'vitest';
import {
  validateRanking,
  validateElaboration,
  isScenarioAlreadySubmitted,
  formatScenarioForClient,
} from './sjt.service';

// ─── validateRanking ─────────────────────────────────────────────────────────

describe('validateRanking', () => {
  describe('valid rankings', () => {
    it('should accept [1,2,3,4] for 4 options', () => {
      expect(validateRanking([1, 2, 3, 4], 4)).toBeNull();
    });

    it('should accept [4,3,2,1] for 4 options (reverse order)', () => {
      expect(validateRanking([4, 3, 2, 1], 4)).toBeNull();
    });

    it('should accept [3,1,5,2,4] for 5 options', () => {
      expect(validateRanking([3, 1, 5, 2, 4], 5)).toBeNull();
    });

    it('should accept [2,4,1,3,5] for 5 options', () => {
      expect(validateRanking([2, 4, 1, 3, 5], 5)).toBeNull();
    });

    it('should accept [1] for a single option', () => {
      expect(validateRanking([1], 1)).toBeNull();
    });
  });

  describe('invalid rankings — duplicates (ties)', () => {
    it('should reject [1,2,2,4] (duplicate 2)', () => {
      const result = validateRanking([1, 2, 2, 4], 4);
      expect(result).not.toBeNull();
      expect(result).toContain('no ties or gaps');
    });

    it('should reject [1,1,1,1] (all same)', () => {
      const result = validateRanking([1, 1, 1, 1], 4);
      expect(result).not.toBeNull();
    });

    it('should reject [3,3,1,2] (duplicate 3)', () => {
      const result = validateRanking([3, 3, 1, 2], 4);
      expect(result).not.toBeNull();
    });
  });

  describe('invalid rankings — gaps', () => {
    it('should reject [1,2,4] for 3 options (gap: missing 3)', () => {
      const result = validateRanking([1, 2, 4], 3);
      expect(result).not.toBeNull();
    });

    it('should reject [1,3,4,5] for 4 options (gap: missing 2)', () => {
      const result = validateRanking([1, 3, 4, 5], 4);
      expect(result).not.toBeNull();
    });
  });

  describe('invalid rankings — starts at 0', () => {
    it('should reject [0,1,2,3] (zero-based)', () => {
      const result = validateRanking([0, 1, 2, 3], 4);
      expect(result).not.toBeNull();
    });
  });

  describe('invalid rankings — wrong length', () => {
    it('should reject ranking with fewer values than options', () => {
      const result = validateRanking([1, 2, 3], 4);
      expect(result).not.toBeNull();
      expect(result).toContain('exactly 4 values');
    });

    it('should reject ranking with more values than options', () => {
      const result = validateRanking([1, 2, 3, 4, 5], 4);
      expect(result).not.toBeNull();
      expect(result).toContain('exactly 4 values');
    });

    it('should reject empty ranking', () => {
      const result = validateRanking([], 4);
      expect(result).not.toBeNull();
    });
  });

  describe('invalid rankings — type errors', () => {
    it('should reject non-array input', () => {
      expect(validateRanking('1234', 4)).not.toBeNull();
      expect(validateRanking(1234, 4)).not.toBeNull();
      expect(validateRanking(null, 4)).not.toBeNull();
      expect(validateRanking(undefined, 4)).not.toBeNull();
    });

    it('should reject ranking with non-integer values (float)', () => {
      const result = validateRanking([1.5, 2, 3, 4], 4);
      expect(result).not.toBeNull();
      expect(result).toContain('integers');
    });

    it('should reject ranking with string values', () => {
      const result = validateRanking(['1', '2', '3', '4'], 4);
      expect(result).not.toBeNull();
    });

    it('should reject ranking with NaN', () => {
      const result = validateRanking([NaN, 2, 3, 4], 4);
      expect(result).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should reject negative values', () => {
      const result = validateRanking([-1, 0, 1, 2], 4);
      expect(result).not.toBeNull();
    });

    it('should reject ranking starting from 2', () => {
      const result = validateRanking([2, 3, 4, 5], 4);
      expect(result).not.toBeNull();
    });
  });
});

// ─── validateElaboration ─────────────────────────────────────────────────────

describe('validateElaboration', () => {
  describe('valid elaborations', () => {
    it('should accept elaboration with exactly 50 characters', () => {
      const text = 'a'.repeat(50);
      expect(validateElaboration(text)).toBeNull();
    });

    it('should accept elaboration with exactly 500 characters', () => {
      const text = 'a'.repeat(500);
      expect(validateElaboration(text)).toBeNull();
    });

    it('should accept elaboration with 250 characters (mid-range)', () => {
      const text = 'a'.repeat(250);
      expect(validateElaboration(text)).toBeNull();
    });
  });

  describe('invalid elaborations — too short', () => {
    it('should reject elaboration with 49 characters', () => {
      const text = 'a'.repeat(49);
      const result = validateElaboration(text);
      expect(result).not.toBeNull();
      expect(result).toContain('at least 50');
    });

    it('should reject empty string', () => {
      const result = validateElaboration('');
      expect(result).not.toBeNull();
      expect(result).toContain('at least 50');
    });
  });

  describe('invalid elaborations — too long', () => {
    it('should reject elaboration with 501 characters', () => {
      const text = 'a'.repeat(501);
      const result = validateElaboration(text);
      expect(result).not.toBeNull();
      expect(result).toContain('at most 500');
    });

    it('should reject elaboration with 1000 characters', () => {
      const text = 'a'.repeat(1000);
      const result = validateElaboration(text);
      expect(result).not.toBeNull();
    });
  });

  describe('invalid elaborations — type errors', () => {
    it('should reject null', () => {
      const result = validateElaboration(null);
      expect(result).not.toBeNull();
      expect(result).toContain('required');
    });

    it('should reject undefined', () => {
      const result = validateElaboration(undefined);
      expect(result).not.toBeNull();
      expect(result).toContain('required');
    });

    it('should reject number', () => {
      const result = validateElaboration(12345);
      expect(result).not.toBeNull();
      expect(result).toContain('string');
    });
  });

  describe('whitespace handling', () => {
    it('should trim whitespace before checking length', () => {
      // 50 chars of content with surrounding whitespace
      const text = '  ' + 'a'.repeat(50) + '  ';
      expect(validateElaboration(text)).toBeNull();
    });

    it('should reject if trimmed length is below 50', () => {
      const text = '  ' + 'a'.repeat(40) + '  ';
      expect(validateElaboration(text)).not.toBeNull();
    });
  });
});

// ─── isScenarioAlreadySubmitted ──────────────────────────────────────────────

describe('isScenarioAlreadySubmitted', () => {
  it('should return false for empty submitted list', () => {
    expect(isScenarioAlreadySubmitted([], 'scenario-1')).toBe(false);
  });

  it('should return false when scenario is not in the list', () => {
    expect(
      isScenarioAlreadySubmitted(['scenario-1', 'scenario-2'], 'scenario-3')
    ).toBe(false);
  });

  it('should return true when scenario is in the list', () => {
    expect(
      isScenarioAlreadySubmitted(['scenario-1', 'scenario-2'], 'scenario-1')
    ).toBe(true);
  });

  it('should return true for the last submitted scenario', () => {
    expect(
      isScenarioAlreadySubmitted(['s1', 's2', 's3'], 's3')
    ).toBe(true);
  });
});

// ─── formatScenarioForClient ─────────────────────────────────────────────────

describe('formatScenarioForClient', () => {
  const sampleScenario = {
    id: 'scenario-abc',
    scenarioText: 'Anda menemukan rekan kerja melakukan pelanggaran...',
    options: [
      { id: 'a', text: 'Melaporkan langsung ke atasan', expertRank: 1 },
      { id: 'b', text: 'Berbicara dengan rekan terlebih dahulu', expertRank: 2 },
      { id: 'c', text: 'Mengabaikan situasi tersebut', expertRank: 4 },
      { id: 'd', text: 'Mendiskusikan dengan tim', expertRank: 3 },
    ],
  };

  it('should return an SjtItemDto with type "sjt_scenario"', () => {
    const result = formatScenarioForClient(sampleScenario, 12345);
    expect(result.type).toBe('sjt_scenario');
  });

  it('should include the correct itemId', () => {
    const result = formatScenarioForClient(sampleScenario, 12345);
    expect(result.itemId).toBe('scenario-abc');
  });

  it('should include the scenario text', () => {
    const result = formatScenarioForClient(sampleScenario, 12345);
    expect(result.scenarioText).toBe(sampleScenario.scenarioText);
  });

  it('should NOT include expertRank in options', () => {
    const result = formatScenarioForClient(sampleScenario, 12345);
    for (const option of result.options) {
      expect(option).not.toHaveProperty('expertRank');
      expect(Object.keys(option)).toEqual(['id', 'text']);
    }
  });

  it('should include all options (same count)', () => {
    const result = formatScenarioForClient(sampleScenario, 12345);
    expect(result.options).toHaveLength(4);
  });

  it('should include a renderedAt timestamp', () => {
    const before = Date.now();
    const result = formatScenarioForClient(sampleScenario, 12345);
    const after = Date.now();
    expect(result.renderedAt).toBeGreaterThanOrEqual(before);
    expect(result.renderedAt).toBeLessThanOrEqual(after);
  });

  it('should produce deterministic option order for the same seed', () => {
    const result1 = formatScenarioForClient(sampleScenario, 42);
    const result2 = formatScenarioForClient(sampleScenario, 42);
    expect(result1.options.map((o) => o.id)).toEqual(
      result2.options.map((o) => o.id)
    );
  });

  it('should produce different option order for different seeds', () => {
    // With enough different seeds, at least one should produce a different order
    const orders = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const result = formatScenarioForClient(sampleScenario, seed);
      orders.add(result.options.map((o) => o.id).join(','));
    }
    // With 4 options and 20 seeds, we should get more than 1 unique order
    expect(orders.size).toBeGreaterThan(1);
  });

  it('should preserve all option ids and texts (just reordered)', () => {
    const result = formatScenarioForClient(sampleScenario, 99);
    const resultIds = result.options.map((o) => o.id).sort();
    const originalIds = sampleScenario.options.map((o) => o.id).sort();
    expect(resultIds).toEqual(originalIds);

    const resultTexts = result.options.map((o) => o.text).sort();
    const originalTexts = sampleScenario.options.map((o) => o.text).sort();
    expect(resultTexts).toEqual(originalTexts);
  });
});
