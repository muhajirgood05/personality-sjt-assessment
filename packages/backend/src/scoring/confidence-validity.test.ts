import { describe, it, expect } from 'vitest';
import {
  determineConfidenceLevel,
  generateValidityWarning,
  assessValidity,
  generateImprovementRecommendations,
  ConfidenceInput,
  RecommendationInput,
} from './confidence-validity';

describe('determineConfidenceLevel', () => {
  describe('High Confidence', () => {
    it('returns High Confidence when 0% flagged AND 0 inconsistency flags', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 0,
        inconsistencyFlagCount: 0,
      };
      expect(determineConfidenceLevel(input)).toBe('High Confidence');
    });
  });

  describe('Moderate Confidence', () => {
    it('returns Moderate Confidence when 1% flagged and 0 inconsistency flags', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 1,
        inconsistencyFlagCount: 0,
      };
      expect(determineConfidenceLevel(input)).toBe('Moderate Confidence');
    });

    it('returns Moderate Confidence when 29% flagged and 0 inconsistency flags', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 29,
        inconsistencyFlagCount: 0,
      };
      expect(determineConfidenceLevel(input)).toBe('Moderate Confidence');
    });

    it('returns Moderate Confidence when 0% flagged and 1 inconsistency flag', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 0,
        inconsistencyFlagCount: 1,
      };
      expect(determineConfidenceLevel(input)).toBe('Moderate Confidence');
    });

    it('returns Moderate Confidence when 0% flagged and 2 inconsistency flags', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 0,
        inconsistencyFlagCount: 2,
      };
      expect(determineConfidenceLevel(input)).toBe('Moderate Confidence');
    });

    it('returns Moderate Confidence when 15% flagged and 1 inconsistency flag', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 15,
        inconsistencyFlagCount: 1,
      };
      expect(determineConfidenceLevel(input)).toBe('Moderate Confidence');
    });
  });

  describe('Low Confidence', () => {
    it('returns Low Confidence when 30% flagged and 0 inconsistency flags', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 30,
        inconsistencyFlagCount: 0,
      };
      expect(determineConfidenceLevel(input)).toBe('Low Confidence');
    });

    it('returns Low Confidence when 50% flagged', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 50,
        inconsistencyFlagCount: 0,
      };
      expect(determineConfidenceLevel(input)).toBe('Low Confidence');
    });

    it('returns Low Confidence when 0% flagged and 3 inconsistency flags', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 0,
        inconsistencyFlagCount: 3,
      };
      expect(determineConfidenceLevel(input)).toBe('Low Confidence');
    });

    it('returns Low Confidence when 0% flagged and 5 inconsistency flags', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 0,
        inconsistencyFlagCount: 5,
      };
      expect(determineConfidenceLevel(input)).toBe('Low Confidence');
    });

    it('returns Low Confidence when both thresholds exceeded', () => {
      const input: ConfidenceInput = {
        flaggedResponsePercentage: 40,
        inconsistencyFlagCount: 4,
      };
      expect(determineConfidenceLevel(input)).toBe('Low Confidence');
    });
  });
});

describe('generateValidityWarning', () => {
  it('returns no warning when below all thresholds', () => {
    const input: ConfidenceInput = {
      flaggedResponsePercentage: 0,
      inconsistencyFlagCount: 0,
    };
    const result = generateValidityWarning(input);
    expect(result.hasWarning).toBe(false);
    expect(result.message).toBeNull();
  });

  it('returns no warning when flagged is exactly 30% and inconsistency < 3', () => {
    const input: ConfidenceInput = {
      flaggedResponsePercentage: 30,
      inconsistencyFlagCount: 2,
    };
    const result = generateValidityWarning(input);
    expect(result.hasWarning).toBe(false);
    expect(result.message).toBeNull();
  });

  it('returns warning when inconsistency flags >= 3', () => {
    const input: ConfidenceInput = {
      flaggedResponsePercentage: 10,
      inconsistencyFlagCount: 3,
    };
    const result = generateValidityWarning(input);
    expect(result.hasWarning).toBe(true);
    expect(result.message).toContain('Re-assessment should be considered');
    expect(result.message).toContain('3 inconsistency flags detected');
  });

  it('returns warning when flagged > 30%', () => {
    const input: ConfidenceInput = {
      flaggedResponsePercentage: 31,
      inconsistencyFlagCount: 0,
    };
    const result = generateValidityWarning(input);
    expect(result.hasWarning).toBe(true);
    expect(result.message).toContain('Re-assessment should be considered');
    expect(result.message).toContain('31.0% responses flagged');
  });

  it('returns warning with both reasons when both thresholds exceeded', () => {
    const input: ConfidenceInput = {
      flaggedResponsePercentage: 35,
      inconsistencyFlagCount: 4,
    };
    const result = generateValidityWarning(input);
    expect(result.hasWarning).toBe(true);
    expect(result.message).toContain('4 inconsistency flags detected');
    expect(result.message).toContain('35.0% responses flagged');
  });

  it('returns no warning when flagged is 29% and inconsistency is 2', () => {
    const input: ConfidenceInput = {
      flaggedResponsePercentage: 29,
      inconsistencyFlagCount: 2,
    };
    const result = generateValidityWarning(input);
    expect(result.hasWarning).toBe(false);
    expect(result.message).toBeNull();
  });
});

describe('assessValidity', () => {
  it('returns complete validity result for high confidence', () => {
    const input: ConfidenceInput = {
      flaggedResponsePercentage: 0,
      inconsistencyFlagCount: 0,
    };
    const result = assessValidity(input);
    expect(result.confidenceLevel).toBe('High Confidence');
    expect(result.hasValidityWarning).toBe(false);
    expect(result.validityWarningMessage).toBeNull();
    expect(result.flaggedPercentage).toBe(0);
    expect(result.inconsistencyFlags).toBe(0);
  });

  it('returns complete validity result for low confidence with warning', () => {
    const input: ConfidenceInput = {
      flaggedResponsePercentage: 35,
      inconsistencyFlagCount: 4,
    };
    const result = assessValidity(input);
    expect(result.confidenceLevel).toBe('Low Confidence');
    expect(result.hasValidityWarning).toBe(true);
    expect(result.validityWarningMessage).not.toBeNull();
    expect(result.flaggedPercentage).toBe(35);
    expect(result.inconsistencyFlags).toBe(4);
  });
});

describe('generateImprovementRecommendations', () => {
  it('generates recommendations only for values below 50th percentile', () => {
    const inputs: RecommendationInput[] = [
      { value: 'Integritas', currentScore: 45, percentile: 30, cohortMedian: 60 },
      { value: 'Profesionalisme', currentScore: 70, percentile: 65, cohortMedian: 65 },
      { value: 'Sinergi', currentScore: 40, percentile: 25, cohortMedian: 55 },
      { value: 'Pelayanan', currentScore: 80, percentile: 80, cohortMedian: 70 },
      { value: 'Kesempurnaan', currentScore: 50, percentile: 45, cohortMedian: 55 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);

    expect(recommendations).toHaveLength(3);
    expect(recommendations.map((r) => r.value)).toEqual([
      'Integritas',
      'Sinergi',
      'Kesempurnaan',
    ]);
  });

  it('returns empty array when all values are at or above 50th percentile', () => {
    const inputs: RecommendationInput[] = [
      { value: 'Integritas', currentScore: 70, percentile: 50, cohortMedian: 65 },
      { value: 'Profesionalisme', currentScore: 80, percentile: 75, cohortMedian: 70 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);
    expect(recommendations).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    const recommendations = generateImprovementRecommendations([]);
    expect(recommendations).toHaveLength(0);
  });

  it('includes correct suggestion for Integritas', () => {
    const inputs: RecommendationInput[] = [
      { value: 'Integritas', currentScore: 40, percentile: 20, cohortMedian: 60 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);

    expect(recommendations[0].value).toBe('Integritas');
    expect(recommendations[0].currentScore).toBe(40);
    expect(recommendations[0].suggestion).toBe(
      'Tingkatkan konsistensi dalam menerapkan prinsip etika dan kejujuran dalam setiap keputusan kerja.'
    );
  });

  it('includes correct suggestion for Profesionalisme', () => {
    const inputs: RecommendationInput[] = [
      { value: 'Profesionalisme', currentScore: 35, percentile: 15, cohortMedian: 55 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);

    expect(recommendations[0].suggestion).toBe(
      'Fokus pada peningkatan kompetensi teknis dan komitmen untuk menyelesaikan tugas secara tuntas dan akurat.'
    );
  });

  it('includes correct suggestion for Sinergi', () => {
    const inputs: RecommendationInput[] = [
      { value: 'Sinergi', currentScore: 42, percentile: 30, cohortMedian: 58 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);

    expect(recommendations[0].suggestion).toBe(
      'Kembangkan kemampuan kolaborasi dan komunikasi lintas unit untuk membangun kemitraan yang lebih produktif.'
    );
  });

  it('includes correct suggestion for Pelayanan', () => {
    const inputs: RecommendationInput[] = [
      { value: 'Pelayanan', currentScore: 38, percentile: 10, cohortMedian: 62 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);

    expect(recommendations[0].suggestion).toBe(
      'Tingkatkan orientasi pelayanan dengan lebih responsif terhadap kebutuhan pemangku kepentingan.'
    );
  });

  it('includes correct suggestion for Kesempurnaan', () => {
    const inputs: RecommendationInput[] = [
      { value: 'Kesempurnaan', currentScore: 44, percentile: 40, cohortMedian: 56 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);

    expect(recommendations[0].suggestion).toBe(
      'Biasakan melakukan evaluasi dan perbaikan berkelanjutan untuk mencapai standar kerja yang lebih tinggi.'
    );
  });

  it('provides fallback suggestion for unknown values', () => {
    const inputs: RecommendationInput[] = [
      { value: 'UnknownValue', currentScore: 30, percentile: 10, cohortMedian: 50 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);

    expect(recommendations[0].value).toBe('UnknownValue');
    expect(recommendations[0].suggestion).toBe(
      'Tingkatkan kinerja pada dimensi ini melalui pengembangan diri yang berkelanjutan.'
    );
  });

  it('does not include values at exactly 50th percentile', () => {
    const inputs: RecommendationInput[] = [
      { value: 'Integritas', currentScore: 55, percentile: 50, cohortMedian: 55 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);
    expect(recommendations).toHaveLength(0);
  });

  it('includes values at 49th percentile', () => {
    const inputs: RecommendationInput[] = [
      { value: 'Integritas', currentScore: 54, percentile: 49, cohortMedian: 55 },
    ];

    const recommendations = generateImprovementRecommendations(inputs);
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].value).toBe('Integritas');
  });
});
