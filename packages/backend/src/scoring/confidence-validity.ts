/**
 * Confidence Qualifier and Validity Warnings
 *
 * Determines confidence level based on flagged response percentage and
 * inconsistency flags. Generates validity warnings when thresholds are
 * exceeded, and produces improvement recommendations for below-50th-percentile
 * Kemenkeu values.
 *
 * Validates: Requirements 10.3, 10.4, 10.5
 */

export type ConfidenceLevel =
  | 'High Confidence'
  | 'Moderate Confidence'
  | 'Low Confidence';

export interface ConfidenceInput {
  flaggedResponsePercentage: number; // 0-100
  inconsistencyFlagCount: number; // 0+
}

export interface ValidityResult {
  confidenceLevel: ConfidenceLevel;
  hasValidityWarning: boolean;
  validityWarningMessage: string | null;
  flaggedPercentage: number;
  inconsistencyFlags: number;
}

export interface RecommendationInput {
  value: string;
  currentScore: number;
  percentile: number; // 0-100
  cohortMedian: number;
}

export interface ImprovementRecommendation {
  value: string;
  currentScore: number;
  suggestion: string;
}

/**
 * Kemenkeu value-specific improvement suggestions in Bahasa Indonesia.
 */
const VALUE_SUGGESTIONS: Record<string, string> = {
  Integritas:
    'Tingkatkan konsistensi dalam menerapkan prinsip etika dan kejujuran dalam setiap keputusan kerja.',
  Profesionalisme:
    'Fokus pada peningkatan kompetensi teknis dan komitmen untuk menyelesaikan tugas secara tuntas dan akurat.',
  Sinergi:
    'Kembangkan kemampuan kolaborasi dan komunikasi lintas unit untuk membangun kemitraan yang lebih produktif.',
  Pelayanan:
    'Tingkatkan orientasi pelayanan dengan lebih responsif terhadap kebutuhan pemangku kepentingan.',
  Kesempurnaan:
    'Biasakan melakukan evaluasi dan perbaikan berkelanjutan untuk mencapai standar kerja yang lebih tinggi.',
};

/**
 * Determines the confidence level based on flagged response percentage
 * and inconsistency flag count.
 *
 * - High Confidence: 0% flagged AND 0 inconsistency flags
 * - Moderate Confidence: 1–29% flagged OR 1–2 inconsistency flags
 * - Low Confidence: ≥30% flagged OR ≥3 inconsistency flags
 */
export function determineConfidenceLevel(
  input: ConfidenceInput
): ConfidenceLevel {
  const { flaggedResponsePercentage, inconsistencyFlagCount } = input;

  // Low Confidence: ≥30% flagged OR ≥3 inconsistency flags
  if (flaggedResponsePercentage >= 30 || inconsistencyFlagCount >= 3) {
    return 'Low Confidence';
  }

  // High Confidence: 0% flagged AND 0 inconsistency flags
  if (flaggedResponsePercentage === 0 && inconsistencyFlagCount === 0) {
    return 'High Confidence';
  }

  // Moderate Confidence: everything else (1–29% flagged OR 1–2 inconsistency flags)
  return 'Moderate Confidence';
}

/**
 * Generates a validity warning when thresholds are exceeded.
 *
 * A validity warning is appended when:
 * - ≥3 inconsistency flags OR
 * - >30% flagged responses
 */
export function generateValidityWarning(
  input: ConfidenceInput
): { hasWarning: boolean; message: string | null } {
  const { flaggedResponsePercentage, inconsistencyFlagCount } = input;

  if (inconsistencyFlagCount >= 3 || flaggedResponsePercentage > 30) {
    const reasons: string[] = [];

    if (inconsistencyFlagCount >= 3) {
      reasons.push(
        `${inconsistencyFlagCount} inconsistency flags detected`
      );
    }

    if (flaggedResponsePercentage > 30) {
      reasons.push(
        `${flaggedResponsePercentage.toFixed(1)}% responses flagged`
      );
    }

    const message =
      `Validity Warning: Re-assessment should be considered. ` +
      `Reason: ${reasons.join('; ')}.`;

    return { hasWarning: true, message };
  }

  return { hasWarning: false, message: null };
}

/**
 * Generates a complete validity result combining confidence level and
 * validity warning.
 */
export function assessValidity(input: ConfidenceInput): ValidityResult {
  const confidenceLevel = determineConfidenceLevel(input);
  const { hasWarning, message } = generateValidityWarning(input);

  return {
    confidenceLevel,
    hasValidityWarning: hasWarning,
    validityWarningMessage: message,
    flaggedPercentage: input.flaggedResponsePercentage,
    inconsistencyFlags: input.inconsistencyFlagCount,
  };
}

/**
 * Generates improvement recommendations for Kemenkeu values that fall
 * below the 50th percentile.
 *
 * Only values with percentile < 50 receive recommendations.
 * Each recommendation includes the value name, current score, and a
 * specific actionable suggestion in Bahasa Indonesia.
 */
export function generateImprovementRecommendations(
  inputs: RecommendationInput[]
): ImprovementRecommendation[] {
  return inputs
    .filter((input) => input.percentile < 50)
    .map((input) => ({
      value: input.value,
      currentScore: input.currentScore,
      suggestion:
        VALUE_SUGGESTIONS[input.value] ??
        'Tingkatkan kinerja pada dimensi ini melalui pengembangan diri yang berkelanjutan.',
    }));
}
