/**
 * Auth module exports.
 */

export {
  checkLockout,
  incrementFailedAttempts,
  resetFailedAttempts,
  validatePassword,
  generateTokens,
  refreshAccessToken,
  logout,
  logoutRefreshToken,
  isTokenBlacklisted,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_SECONDS,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
} from './auth.service.js';
export type { TokenPayload, LockoutResult, IncrementResult, JwtSigner } from './auth.service.js';

export { createAuthMiddleware } from './auth.middleware.js';
export type { AuthMiddlewareDeps } from './auth.middleware.js';

export { registerAuthRoutes } from './auth.routes.js';
export type { AuthRouteDeps } from './auth.routes.js';

export { requireRole, requireAdmin, requireCandidate, requireAny } from './rbac.middleware.js';
export type { JwtPayload } from './rbac.middleware.js';
