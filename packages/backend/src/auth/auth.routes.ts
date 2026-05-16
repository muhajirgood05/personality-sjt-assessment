/**
 * Authentication route handlers for Fastify.
 * Implements POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/jwt';
import type Redis from 'ioredis';
import type { Database } from '../db/index.js';
import {
  checkLockout,
  incrementFailedAttempts,
  resetFailedAttempts,
  validatePassword,
  generateTokens,
  refreshAccessToken,
  logout,
  logoutRefreshToken,
  MAX_FAILED_ATTEMPTS,
  type TokenPayload,
  type JwtSigner,
} from './auth.service.js';
import { createAuthMiddleware } from './auth.middleware.js';

// ─── Request/Response types (inline to avoid shared package resolution issues) ─

interface LoginRequestBody {
  employeeId: string;
  password: string;
}

interface RefreshRequestBody {
  refreshToken: string;
}

interface LogoutRequestBody {
  refreshToken?: string;
}

// ─── Route Registration ──────────────────────────────────────────────────────

export interface AuthRouteDeps {
  db: Database;
  redis: Redis;
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  deps: AuthRouteDeps
): Promise<void> {
  const { db, redis } = deps;
  const authenticate = createAuthMiddleware({ redis });

  /**
   * POST /api/auth/login
   * Authenticates a user with employeeId and password.
   */
  app.post<{ Body: LoginRequestBody }>(
    '/api/auth/login',
    async (request: FastifyRequest<{ Body: LoginRequestBody }>, reply: FastifyReply) => {
      const { employeeId, password } = request.body;

      if (!employeeId || !password) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'employeeId and password are required',
          },
        });
      }

      // Check lockout status
      const lockoutStatus = await checkLockout(redis, employeeId);
      if (lockoutStatus.locked) {
        return reply.code(423).send({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Account is locked. Try again in ${lockoutStatus.remainingSeconds} seconds.`,
            details: {
              lockedUntil: String(lockoutStatus.lockedUntil),
              remainingSeconds: String(lockoutStatus.remainingSeconds),
            },
          },
        });
      }

      // Look up user in database
      const user = await findUserByEmployeeId(db, employeeId);
      if (!user) {
        const result = await incrementFailedAttempts(redis, employeeId);
        return handleFailedLogin(reply, result);
      }

      // Validate password
      const isValid = await validatePassword(password, user.passwordHash);
      if (!isValid) {
        const result = await incrementFailedAttempts(redis, employeeId);
        return handleFailedLogin(reply, result);
      }

      // Successful login — reset failed attempts
      await resetFailedAttempts(redis, employeeId);

      // Generate tokens
      const jwt = app.jwt as unknown as JwtSigner;
      const tokens = generateTokens(jwt, {
        id: user.id,
        employeeId: user.employeeId,
        role: user.role,
      });

      return reply.code(200).send({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          role: user.role,
          ...(user.role === 'candidate' ? { candidateId: user.id } : { adminId: user.id }),
        },
      });
    }
  );

  /**
   * POST /api/auth/refresh
   * Refreshes an access token using a valid refresh token.
   */
  app.post<{ Body: RefreshRequestBody }>(
    '/api/auth/refresh',
    async (request: FastifyRequest<{ Body: RefreshRequestBody }>, reply: FastifyReply) => {
      const { refreshToken } = request.body;

      if (!refreshToken) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'refreshToken is required',
          },
        });
      }

      const jwt = app.jwt as unknown as JwtSigner;
      const result = await refreshAccessToken(jwt, redis, refreshToken);

      if (!result) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token is invalid or expired',
          },
        });
      }

      return reply.code(200).send({
        success: true,
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
      });
    }
  );

  /**
   * POST /api/auth/logout
   * Invalidates the current access token and optionally the refresh token.
   */
  app.post<{ Body: LogoutRequestBody }>(
    '/api/auth/logout',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Body: LogoutRequestBody }>, reply: FastifyReply) => {
      // After authenticate middleware, user is available on request
      const user = (request as unknown as { user: TokenPayload }).user;

      if (user?.jti) {
        await logout(redis, user.jti);
      }

      const refreshToken = request.body?.refreshToken;
      if (refreshToken) {
        try {
          const jwt = app.jwt as unknown as JwtSigner;
          const refreshPayload = jwt.decode<TokenPayload>(refreshToken);
          if (refreshPayload?.jti) {
            await logoutRefreshToken(redis, refreshPayload.jti);
          }
        } catch {
          // Malformed refresh token, ignore
        }
      }

      return reply.code(200).send({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  employeeId: string;
  role: 'administrator' | 'candidate';
  passwordHash: string;
}

async function findUserByEmployeeId(db: Database, employeeId: string): Promise<UserRecord | null> {
  // Check candidates first
  const candidateResult = await db.query<{
    id: string;
    employee_id: string;
    password_hash: string;
  }>(
    'SELECT id, employee_id, password_hash FROM candidates WHERE employee_id = $1',
    [employeeId]
  );

  if (candidateResult.rows.length > 0) {
    const row = candidateResult.rows[0]!;
    return {
      id: row.id,
      employeeId: row.employee_id,
      role: 'candidate',
      passwordHash: row.password_hash,
    };
  }

  // Check administrators
  const adminResult = await db.query<{
    id: string;
    employee_id: string;
    password_hash: string;
  }>(
    'SELECT id, employee_id, password_hash FROM administrators WHERE employee_id = $1',
    [employeeId]
  );

  if (adminResult.rows.length > 0) {
    const row = adminResult.rows[0]!;
    return {
      id: row.id,
      employeeId: row.employee_id,
      role: 'administrator',
      passwordHash: row.password_hash,
    };
  }

  return null;
}

function handleFailedLogin(
  reply: FastifyReply,
  result: { locked: boolean; remainingSeconds: number; lockedUntil: number | null }
) {
  if (result.locked) {
    return reply.code(423).send({
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in ${result.remainingSeconds} seconds.`,
        details: {
          lockedUntil: String(result.lockedUntil ?? ''),
          remainingSeconds: String(result.remainingSeconds),
        },
      },
    });
  }

  return reply.code(401).send({
    success: false,
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid employee ID or password',
    },
  });
}
