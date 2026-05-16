/**
 * Scoring-related types and interfaces.
 * Covers OCEAN scoring, Kemenkeu value alignment, SJT concordance,
 * composite suitability scoring, and anti-faking indicators.
 */

import { KemenkeuValue, OceanDimension } from './assessment';

// ─── Suitability & Confidence ────────────────────────────────────────────────

/** Suitability classification based on composite score */
export type SuitabilityCategory =
  | 'Highly Suitable'
  | 'Suitable'
  | 'Conditionally Suitable'
  | 'Not Suitable';

/** Confidence level based on anti-faking indicators */
export type ConfidenceLevel =
  | 'High Confidence'
  | 'Moderate Confidence'
  | 'Low Confidence';

/** Validity flag for assessment results */
export type ValidityFlag = 'Valid' | 'Cautionary' | 'Invalid';

// ─── OCEAN Scores ────────────────────────────────────────────────────────────

/** Score for a single OCEAN dimension */
export interface OCEANScore {
  dimension: OceanDimension;
  /** Raw score before normalization */
  rawScore: number;
  /** Sten score (1-10) normalized against normative sample */
  stenScore: number;
}

/** Score for a single personality facet */
export interface FacetScore {
  dimension: OceanDimension;
  facet: string;
  /** Raw score before normalization */
  rawScore: number;
  /** Sten score (1-10) normalized against normative sample */
  stenScore: number;
}

// ─── Kemenkeu Value Scores ───────────────────────────────────────────────────

/** Score for a single Kemenkeu value */
export interface KemenkeuValueScore {
  value: KemenkeuValue;
  /** Alignment score (sten 1-10 for personality-derived, 0-100 for SJT-derived) */
  score: number;
}

/** Elaboration quality score for a single SJT scenario */
export interface ElaborationScore {
  scenarioId: string;
  /** Coherence and alignment score (0-100) */
  score: number;
}

// ─── Anti-Faking Results ─────────────────────────────────────────────────────

/** Anti-faking analysis results */
export interface AntiFakingIndicators {
  /** Consistency index as percentage (0-100) */
  consistencyIndex: number;
  /** Number of inconsistent matched pairs */
  inconsistentPairCount: number;
  /** Total pairs evaluated (excluding those with unanswered items) */
  totalEvaluatedPairs: number;
  /** Social desirability score (0-10) */
  socialDesirabilityScore: number;
  /** Coefficient of variation for response times */
  responseTimeCv: number;
  /** Number of responses flagged for fast response time */
  flaggedResponseCount: number;
  /** Total number of responses */
  totalResponses: number;
  /** Whether response time concern threshold (>20%) is exceeded */
  responseTimeConcern: boolean;
  /** Number of focus loss events during assessment */
  focusLossCount: number;
  /** Overall validity flag */
  validityFlag: ValidityFlag;
}

// ─── Composite Scoring Result ────────────────────────────────────────────────

/** Complete scoring result for a candidate */
export interface ScoringResult {
  candidateId: string;
  personality: {
    /** OCEAN dimension scores (sten-normalized) */
    dimensions: OCEANScore[];
    /** Sub-facet scores per dimension */
    facets: FacetScore[];
    /** Raw OCEAN scores before social desirability adjustment */
    rawScores: OCEANScore[];
    /** Adjusted OCEAN scores after social desirability covariate */
    adjustedScores: OCEANScore[];
  };
  sjt: {
    /** Per-value concordance scores (0-100) */
    valueScores: KemenkeuValueScore[];
    /** Per-elaboration quality scores */
    elaborationScores: ElaborationScore[];
  };
  composite: {
    /** Composite suitability score (0-100) */
    suitabilityScore: number;
    /** Suitability classification */
    category: SuitabilityCategory;
    /** Confidence level based on anti-faking indicators */
    confidence: ConfidenceLevel;
  };
  antiFaking: AntiFakingIndicators;
}

// ─── Improvement Recommendations ─────────────────────────────────────────────

/** An improvement recommendation for a below-threshold value */
export interface ImprovementRecommendation {
  value: KemenkeuValue;
  currentScore: number;
  /** Development suggestion referencing observable behaviors */
  suggestion: string;
}

// ─── Normative Data ──────────────────────────────────────────────────────────

/** Normative sample statistics for a dimension or facet */
export interface NormativeStats {
  dimension: string;
  facet?: string;
  mean: number;
  stdDev: number;
  sampleSize: number;
  /** Percentile lookup table */
  percentileTable: Record<number, number>;
}
