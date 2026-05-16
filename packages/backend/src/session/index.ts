/**
 * Session management module.
 * Handles assessment session state, heartbeat tracking, and session resumption.
 */

export { SessionService } from './session.service';
export type { SessionState, SessionStatus, HeartbeatResult, ResumeResult, TimerState } from './session.service';
export { sessionRoutes } from './session.routes';
export type { SessionRoutesOptions } from './session.routes';
