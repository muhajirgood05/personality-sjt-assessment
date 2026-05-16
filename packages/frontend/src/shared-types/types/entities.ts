/**
 * Database entity types matching the PostgreSQL schema.
 * These types represent the shape of data as stored in the database.
 */

import {
  AssessmentStatus,
  ItemContent,
  KemenkeuValue,
  OceanDimension,
  SectionType,
  SessionStatus,
  UserRole,
} from './assessment';
import {
  ConfidenceLevel,
  SuitabilityCategory,
  ValidityFlag,
} from './scoring';

// ─── Candidate Entity ────────────────────────────────────────────────────────

export interface CandidateEntity {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
}

// ─── Administrator Entity ────────────────────────────────────────────────────

export interface AdministratorEntity {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

// ─── Assessment Session Entity ───────────────────────────────────────────────

export interface AssessmentSessionEntity {
  id: string;
  adminId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  personalityTimerSeconds: number;
  sjtTimerSeconds: number;
  status: SessionStatus;
  createdAt: Date;
}

// ─── Assessment Entity ───────────────────────────────────────────────────────

export interface NavigationAttempt {
  timestamp: number;
  type: 'tab_switch' | 'navigation_away' | 'focus_loss';
  details?: string;
}

export interface AssessmentEntity {
  id: string;
  candidateId: string;
  sessionId: string;
  sectionType: SectionType;
  status: AssessmentStatus;
  /** Seed for deterministic item order randomization */
  itemOrderSeed: number;
  startedAt: Date | null;
  completedAt: Date | null;
  /** Remaining time in milliseconds (for session resumption) */
  remainingTimeMs: number | null;
  focusLossCount: number;
  navigationAttempts: NavigationAttempt[];
}

// ─── Item Entity ─────────────────────────────────────────────────────────────

export interface ItemEntity {
  id: string;
  sectionType: SectionType;
  dimension: OceanDimension | KemenkeuValue | null;
  facet: string | null;
  itemPosition: number;
  content: ItemContent;
  socialDesirabilityRating: number | null;
  isReverseScored: boolean;
  isConsistencyCheck: boolean;
  matchedPairId: string | null;
  isSocialDesirabilityItem: boolean;
  expertRanking: number[] | null;
}

// ─── Response Entity ─────────────────────────────────────────────────────────

export interface ResponseEntity {
  id: string;
  assessmentId: string;
  itemId: string;
  sequenceNumber: number;
  /** Scale value (number) or ranking array (number[]) stored as JSONB */
  responseValue: number | number[];
  elaboration: string | null;
  responseTimeMs: number;
  isFlaggedFast: boolean;
  submittedAt: Date;
}

// ─── Scoring Result Entity ───────────────────────────────────────────────────

export interface OceanScoreRecord {
  dimension: OceanDimension;
  rawScore: number;
  stenScore: number;
}

export interface FacetScoreRecord {
  dimension: OceanDimension;
  facet: string;
  rawScore: number;
  stenScore: number;
}

export interface KemenkeuValueScoreRecord {
  value: KemenkeuValue;
  score: number;
}

export interface ElaborationScoreRecord {
  scenarioId: string;
  score: number;
}

export interface RecommendationRecord {
  value: KemenkeuValue;
  currentScore: number;
  suggestion: string;
}

export interface ScoringResultEntity {
  id: string;
  assessmentId: string;
  oceanRawScores: OceanScoreRecord[];
  oceanAdjustedScores: OceanScoreRecord[];
  oceanStenScores: OceanScoreRecord[];
  facetScores: FacetScoreRecord[];
  kemenkeuValueScores: KemenkeuValueScoreRecord[];
  sjtConcordanceScores: KemenkeuValueScoreRecord[];
  elaborationScores: ElaborationScoreRecord[];
  suitabilityScore: number;
  suitabilityCategory: SuitabilityCategory;
  confidenceLevel: ConfidenceLevel;
  recommendations: RecommendationRecord[];
  calculatedAt: Date;
}

// ─── Anti-Faking Result Entity ───────────────────────────────────────────────

export interface AntiFakingResultEntity {
  id: string;
  assessmentId: string;
  consistencyIndex: number;
  inconsistentPairCount: number;
  totalEvaluatedPairs: number;
  socialDesirabilityScore: number;
  responseTimeCv: number;
  flaggedFastCount: number;
  totalResponses: number;
  responseTimeConcern: boolean;
  validityFlag: ValidityFlag;
  calculatedAt: Date;
}

// ─── Audit Log Entity ────────────────────────────────────────────────────────

export interface AuditLogEntity {
  id: string;
  userId: string;
  userRole: UserRole;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: Date;
}

// ─── Normative Sample Entity ─────────────────────────────────────────────────

export interface NormativeSampleEntity {
  id: string;
  dimension: string;
  facet: string | null;
  mean: number;
  stdDev: number;
  sampleSize: number;
  percentileTable: Record<number, number>;
  updatedAt: Date;
}
