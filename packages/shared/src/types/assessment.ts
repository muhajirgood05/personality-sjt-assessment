/**
 * Assessment-related types and interfaces.
 * Covers response payloads, timer synchronization, and assessment status enums.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** Status of an assessment session */
export enum AssessmentStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  Completed = 'completed',
  Interrupted = 'interrupted',
  Expired = 'expired',
}

/** Type of assessment section */
export enum SectionType {
  Personality = 'personality',
  SJT = 'sjt',
}

/** Status of an assessment session (admin-managed) */
export enum SessionStatus {
  Draft = 'draft',
  Active = 'active',
  Closed = 'closed',
  Archived = 'archived',
}

/** User roles for RBAC */
export enum UserRole {
  Administrator = 'administrator',
  Candidate = 'candidate',
}

// ─── Response Payload ────────────────────────────────────────────────────────

/** Payload submitted when a candidate responds to an item */
export interface ResponsePayload {
  assessmentId: string;
  itemId: string;
  /** Scale value (1-5) for personality items, or ranking array for SJT items */
  response: number | number[];
  /** Optional elaboration text for SJT items (50-500 characters) */
  elaboration?: string;
  /** Time in milliseconds from item render to response submission */
  responseTimeMs: number;
  /** Client-side timestamp when response was submitted */
  clientTimestamp: number;
}

// ─── Timer Sync ──────────────────────────────────────────────────────────────

/** Timer synchronization data returned from server */
export interface TimerSync {
  sectionId: string;
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Server timestamp for clock synchronization */
  serverTimestamp: number;
}

// ─── Offline Queue ───────────────────────────────────────────────────────────

/** Status of a queued response in the offline queue */
export enum QueuedResponseStatus {
  Pending = 'pending',
  Syncing = 'syncing',
  Failed = 'failed',
}

/** A response queued locally when offline */
export interface QueuedResponse {
  id: string;
  payload: ResponsePayload;
  timestamp: number;
  retryCount: number;
  status: QueuedResponseStatus;
}

// ─── Retry Configuration ─────────────────────────────────────────────────────

/** Configuration for client-side retry with exponential backoff */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// ─── Item Content Types ──────────────────────────────────────────────────────

/** OCEAN personality dimensions */
export enum OceanDimension {
  Openness = 'openness',
  Conscientiousness = 'conscientiousness',
  Extraversion = 'extraversion',
  Agreeableness = 'agreeableness',
  Neuroticism = 'neuroticism',
}

/** Kemenkeu core values */
export enum KemenkeuValue {
  Integritas = 'integritas',
  Profesionalisme = 'profesionalisme',
  Sinergi = 'sinergi',
  Pelayanan = 'pelayanan',
  Kesempurnaan = 'kesempurnaan',
}

/** Content structure for a forced-choice personality item */
export interface ForcedChoiceItemContent {
  type: 'forced_choice';
  statementLeft: string;
  statementRight: string;
  dimensionLeft: OceanDimension;
  dimensionRight: OceanDimension;
  facetLeft: string;
  facetRight: string;
  socialDesirabilityLeft: number;
  socialDesirabilityRight: number;
}

/** A single SJT response option */
export interface SjtOption {
  id: string;
  text: string;
  expertRank: number;
}

/** Content structure for an SJT scenario item */
export interface SjtScenarioContent {
  type: 'sjt_scenario';
  scenarioText: string;
  wordCount: number;
  kemenkeuValue: KemenkeuValue;
  options: SjtOption[];
}

/** Union type for all item content */
export type ItemContent = ForcedChoiceItemContent | SjtScenarioContent;
