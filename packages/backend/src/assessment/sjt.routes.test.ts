/**
 * Tests for SJT Route Validation Logic
 *
 * Validates:
 * - Ranking validation (valid permutation, no ties, no gaps)
 * - Elaboration validation (50-500 characters)
 * - Edge cases for both validators
 */

import { describe, it, expect } from 'vitest';
import { validateRanking, validateElaboration } from './sjt.routes';

describe('validateRanking', () => {
  describe('valid rankings', () => {
    it('should accept a valid permutation of [1..4]', () => {
      expect(validateRanking([1, 2, 3, 4], 4)).toBeNull();
    });

    it('should accept a valid permutation of [1..5]', () => {
      expect(validateRanking([3, 1, 5, 2, 4], 5)).toBeNull();
    });

    it('should accept [4, 3, 2, 1] as valid for 4 options', () => {
      expect(validateRanking([4, 3, 2, 1], 4)).toBeNull();
    });

    it('should accept [2, 4, 1, 3, 5] as valid for 5 options', () => {
      expect(validateRanking([2, 4, 1, 3, 5], 5)).toBeNull();
    });
  });

  describe('invalid rankings - wrong length', () => {
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

  describe('invalid rankings - ties (duplicates)', () => {
    it('should reject ranking with duplicate values', () => {
      const result = validateRanking([1, 1, 3, 4], 4);
      expect(result).not.toBeNull();
      expect(result).toContain('no ties or gaps');
    });

    it('should reject ranking with all same values', () => {
      const result = validateRanking([2, 2, 2, 2], 4);
      expect(result).not.toBeNull();
    });
  });

  describe('invalid rankings - gaps', () => {
    it('should reject ranking with gaps (e.g., [1, 2, 4, 5] for 4 options)', () => {
      const result = validateRanking([1, 2, 4, 5], 4);
      expect(result).not.toBeNull();
    });

    it('should reject ranking starting from 0', () => {
      const result = validateRanking([0, 1, 2, 3], 4);
      expect(result).not.toBeNull();
    });

    it('should reject ranking starting from 2', () => {
      const result = validateRanking([2, 3, 4, 5], 4);
      expect(result).not.toBeNull();
    });
  });

  describe('invalid rankings - type errors', () => {
    it('should reject non-array input', () => {
      expect(validateRanking('1234', 4)).not.toBeNull();
      expect(validateRanking(1234, 4)).not.toBeNull();
      expect(validateRanking(null, 4)).not.toBeNull();
      expect(validateRanking(undefined, 4)).not.toBeNull();
    });

    it('should reject ranking with non-integer values', () => {
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
    it('should accept [1] for a single option', () => {
      expect(validateRanking([1], 1)).toBeNull();
    });

    it('should reject negative values', () => {
      const result = validateRanking([-1, 0, 1, 2], 4);
      expect(result).not.toBeNull();
    });
  });
});

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

    it('should accept elaboration with 100 characters', () => {
      const text = 'Saya memilih opsi ini karena menunjukkan integritas dan profesionalisme dalam menangani situasi tersebut.';
      // This is > 50 chars
      expect(text.length).toBeGreaterThanOrEqual(50);
      expect(validateElaboration(text)).toBeNull();
    });

    it('should accept elaboration between 50 and 500 characters', () => {
      const text = 'a'.repeat(250);
      expect(validateElaboration(text)).toBeNull();
    });
  });

  describe('invalid elaborations - too short', () => {
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

    it('should reject string with only whitespace (trimmed length < 50)', () => {
      const text = '   ' + 'a'.repeat(30) + '   ';
      const result = validateElaboration(text);
      expect(result).not.toBeNull();
    });
  });

  describe('invalid elaborations - too long', () => {
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

  describe('invalid elaborations - type errors', () => {
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

    it('should reject array', () => {
      const result = validateElaboration(['some text']);
      expect(result).not.toBeNull();
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
