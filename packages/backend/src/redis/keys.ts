/**
 * Redis key namespace definitions for the assessment platform.
 *
 * All keys follow the pattern: `{namespace}:{identifier}`
 * This provides clear separation of concerns and easy key management.
 */

/** Session keys — stores assessment session state, current item, and progress */
export const SessionKeys = {
  /** Full session state for a candidate: progress, current item index, section */
  state: (candidateId: string) => `session:${candidateId}:state` as const,
  /** Current item pointer for a candidate's active assessment */
  currentItem: (candidateId: string) => `session:${candidateId}:current_item` as const,
  /** Assessment progress (items completed / total) */
  progress: (candidateId: string) => `session:${candidateId}:progress` as const,
} as const;

/** Timer keys — stores server-side countdown state for assessment sections */
export const TimerKeys = {
  /** Remaining time in milliseconds for a section timer */
  remaining: (assessmentId: string, sectionType: string) =>
    `timer:${assessmentId}:${sectionType}:remaining` as const,
  /** Server timestamp when the timer was started or last synced */
  startTime: (assessmentId: string, sectionType: string) =>
    `timer:${assessmentId}:${sectionType}:start_time` as const,
} as const;

/** Heartbeat keys — tracks client connectivity for session interruption detection */
export const HeartbeatKeys = {
  /** Last seen timestamp for an active assessment (updated by client heartbeat) */
  lastSeen: (assessmentId: string) => `heartbeat:${assessmentId}:last_seen` as const,
} as const;

/** Login attempt keys — tracks failed login attempts for account lockout */
export const LoginAttemptKeys = {
  /** Failed attempt counter with TTL (auto-expires after lockout period) */
  counter: (employeeId: string) => `login_attempts:${employeeId}:count` as const,
  /** Lockout timestamp — when the account was locked */
  lockedUntil: (employeeId: string) => `login_attempts:${employeeId}:locked_until` as const,
} as const;

/** Token blacklist keys — stores invalidated JWT tokens */
export const TokenBlacklistKeys = {
  /** Blacklisted token entry (value: "1", TTL matches token expiry) */
  entry: (jti: string) => `token_blacklist:${jti}` as const,
} as const;

/** TTL constants in seconds */
export const RedisTTL = {
  /** Session state TTL: 30 minutes of inactivity */
  SESSION_INACTIVITY: 30 * 60,
  /** Session resumption window: 30 minutes */
  SESSION_RESUMPTION: 30 * 60,
  /** Account lockout duration: 15 minutes */
  ACCOUNT_LOCKOUT: 15 * 60,
  /** Heartbeat expiry: 90 seconds (60s detection + 30s buffer) */
  HEARTBEAT: 90,
  /** Token blacklist: matches JWT access token lifetime (1 hour default) */
  TOKEN_BLACKLIST: 60 * 60,
  /** Login attempt counter TTL: 15 minutes */
  LOGIN_ATTEMPT_WINDOW: 15 * 60,
} as const;
