/**
 * API request/response DTOs for all endpoints.
 * Covers authentication, assessment, scoring, reports, and admin endpoints.
 */

import {
  AssessmentStatus,
  KemenkeuValue,
  OceanDimension,
  ResponsePayload,
  SectionType,
  TimerSync,
} from './assessment';
import {
  ConfidenceLevel,
  ElaborationScore,
  FacetScore,
  ImprovementRecommendation,
  KemenkeuValueScore,
  OCEANScore,
  ScoringResult,
  SuitabilityCategory,
  ValidityFlag,
} from './scoring';

// ─── Common Response Wrapper ─────────────────────────────────────────────────

/** Standard API response envelope */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/** Standard API error structure */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

// ─── Authentication DTOs ─────────────────────────────────────────────────────

/** POST /api/auth/login - Request */
export interface LoginRequest {
  employeeId: string;
  password: string;
}

/** POST /api/auth/login - Response */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: string;
  candidateId?: string;
  adminId?: string;
}

/** POST /api/auth/refresh - Request */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** POST /api/auth/refresh - Response */
export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

/** Account lockout error detail */
export interface AccountLockedError {
  lockedUntil: number;
  remainingSeconds: number;
  message: string;
}

// ─── Assessment DTOs ─────────────────────────────────────────────────────────

/** POST /api/assessment/start - Request */
export interface StartAssessmentRequest {
  sessionId: string;
  sectionType: SectionType;
}

/** POST /api/assessment/start - Response */
export interface StartAssessmentResponse {
  assessmentId: string;
  sectionType: SectionType;
  totalItems: number;
  timerSync: TimerSync;
  firstItem: AssessmentItemDto;
}

/** GET /api/assessment/current-item - Response */
export interface CurrentItemResponse {
  item: AssessmentItemDto;
  currentIndex: number;
  totalItems: number;
  timerSync: TimerSync;
}

/** Personality test item DTO (forced-choice pair) */
export interface PersonalityItemDto {
  type: 'forced_choice';
  itemId: string;
  statementLeft: string;
  statementRight: string;
  /** Timestamp when item was rendered (for response time tracking) */
  renderedAt: number;
}

/** SJT scenario item DTO */
export interface SjtItemDto {
  type: 'sjt_scenario';
  itemId: string;
  scenarioText: string;
  options: SjtOptionDto[];
  /** Timestamp when item was rendered (for response time tracking) */
  renderedAt: number;
}

/** SJT option (without expert ranking - that's server-side only) */
export interface SjtOptionDto {
  id: string;
  text: string;
}

/** Union type for assessment items delivered to client */
export type AssessmentItemDto = PersonalityItemDto | SjtItemDto;

/** POST /api/assessment/respond - Request */
export interface SubmitResponseRequest extends ResponsePayload {}

/** POST /api/assessment/respond - Response */
export interface SubmitResponseResponse {
  saved: boolean;
  nextItem: AssessmentItemDto | null;
  timerSync: TimerSync;
  /** True if this was the last item in the section */
  sectionComplete: boolean;
}

/** POST /api/assessment/heartbeat - Request */
export interface HeartbeatRequest {
  assessmentId: string;
  clientTimestamp: number;
}

/** POST /api/assessment/heartbeat - Response */
export interface HeartbeatResponse {
  timerSync: TimerSync;
  sessionValid: boolean;
}

/** POST /api/assessment/auto-save - Request */
export interface AutoSaveRequest {
  assessmentId: string;
  responses: ResponsePayload[];
}

/** POST /api/assessment/auto-save - Response */
export interface AutoSaveResponse {
  savedCount: number;
  timerSync: TimerSync;
}

/** GET /api/assessment/status - Response */
export interface AssessmentStatusResponse {
  assessmentId: string;
  sectionType: SectionType;
  status: AssessmentStatus;
  currentItemIndex: number;
  totalItems: number;
  timerSync: TimerSync;
  completedSections: SectionType[];
}

/** POST /api/assessment/resume - Request */
export interface ResumeAssessmentRequest {
  assessmentId: string;
}

/** POST /api/assessment/resume - Response */
export interface ResumeAssessmentResponse {
  assessmentId: string;
  sectionType: SectionType;
  currentItem: AssessmentItemDto;
  currentIndex: number;
  totalItems: number;
  timerSync: TimerSync;
}

// ─── Scoring DTOs ────────────────────────────────────────────────────────────

/** POST /api/scoring/calculate - Request */
export interface CalculateScoringRequest {
  assessmentId: string;
  candidateId: string;
}

/** POST /api/scoring/calculate - Response */
export interface CalculateScoringResponse {
  scoringResult: ScoringResult;
  calculatedAt: number;
}

/** GET /api/scoring/results/:candidateId - Response */
export interface GetScoringResultsResponse {
  results: ScoringResult;
  calculatedAt: number;
}

// ─── Report DTOs ─────────────────────────────────────────────────────────────

/** GET /api/reports/:candidateId - Response */
export interface CandidateReportResponse {
  candidateId: string;
  candidateName: string;
  sessionName: string;
  completedAt: string;
  personality: PersonalityProfileDto;
  sjt: SjtResultsDto;
  composite: CompositeResultDto;
  validity: AssessmentValidityDto;
  recommendations: ImprovementRecommendation[];
}

/** Personality profile section of the report */
export interface PersonalityProfileDto {
  dimensions: OCEANScore[];
  facets: FacetScore[];
  /** Narrative interpretation per dimension (max 200 words each) */
  narratives: DimensionNarrativeDto[];
}

/** Narrative interpretation for a single OCEAN dimension */
export interface DimensionNarrativeDto {
  dimension: OceanDimension;
  narrative: string;
}

/** SJT results section of the report */
export interface SjtResultsDto {
  valueScores: KemenkeuValueScore[];
  /** Behavioral examples extracted from elaborations (1-3 per value) */
  behavioralExamples: ValueBehavioralExampleDto[];
  elaborationScores: ElaborationScore[];
}

/** Behavioral examples for a Kemenkeu value */
export interface ValueBehavioralExampleDto {
  value: KemenkeuValue;
  examples: string[];
}

/** Composite result section of the report */
export interface CompositeResultDto {
  suitabilityScore: number;
  category: SuitabilityCategory;
  confidence: ConfidenceLevel;
  personalitySubScore: number;
  sjtSubScore: number;
}

/** Assessment validity section of the report */
export interface AssessmentValidityDto {
  consistencyIndex: number;
  averageResponseTimeMs: number;
  personalityAvgResponseTimeMs: number;
  sjtAvgResponseTimeMs: number;
  socialDesirabilityScore: number;
  validityFlag: ValidityFlag;
  flaggedResponsePercentage: number;
  focusLossCount: number;
  /** Whether a validity warning should be displayed */
  hasValidityWarning: boolean;
  /** Specific warning message if applicable */
  validityWarningMessage?: string;
}

// ─── Admin DTOs ──────────────────────────────────────────────────────────────

/** POST /api/admin/sessions - Request */
export interface CreateSessionRequest {
  name: string;
  startDate: string;
  endDate: string;
  candidateIds: string[];
  /** Timer duration in seconds (60-7200) */
  personalityTimerSeconds: number;
  /** Timer duration in seconds (60-7200) */
  sjtTimerSeconds: number;
}

/** POST /api/admin/sessions - Response */
export interface CreateSessionResponse {
  sessionId: string;
  name: string;
  startDate: string;
  endDate: string;
  candidateCount: number;
}

/** GET /api/admin/sessions - Response */
export interface ListSessionsResponse {
  sessions: SessionSummaryDto[];
}

/** Summary of an assessment session */
export interface SessionSummaryDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  totalCandidates: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
}

/** GET /api/admin/sessions/:id/candidates - Response */
export interface SessionCandidatesResponse {
  sessionId: string;
  candidates: CandidateProgressDto[];
}

/** Progress information for a single candidate */
export interface CandidateProgressDto {
  candidateId: string;
  candidateName: string;
  employeeId: string;
  personalityStatus: AssessmentStatus;
  sjtStatus: AssessmentStatus;
  overallStatus: AssessmentStatus;
  startedAt: string | null;
  completedAt: string | null;
}

/** GET /api/admin/sessions/:id/analytics - Response */
export interface SessionAnalyticsResponse {
  sessionId: string;
  totalCandidates: number;
  completionPercentage: number;
  averageSuitabilityScore: number | null;
  suitabilityDistribution: DistributionBucket[];
  oceanDistribution: DimensionDistributionDto[];
  valueDistribution: ValueDistributionDto[];
}

/** A bucket in a score distribution */
export interface DistributionBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

/** Distribution data for an OCEAN dimension */
export interface DimensionDistributionDto {
  dimension: OceanDimension;
  buckets: DistributionBucket[];
  mean: number;
  stdDev: number;
}

/** Distribution data for a Kemenkeu value */
export interface ValueDistributionDto {
  value: KemenkeuValue;
  buckets: DistributionBucket[];
  mean: number;
  stdDev: number;
}

/** GET /api/admin/audit-log - Response */
export interface AuditLogResponse {
  entries: AuditLogEntryDto[];
  total: number;
  page: number;
  pageSize: number;
}

/** A single audit log entry */
export interface AuditLogEntryDto {
  id: string;
  userId: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
}

/** GET /api/reports/session/:sessionId/export - Query params */
export interface ExportSessionResultsQuery {
  format: 'csv' | 'excel';
}
