/**
 * Role-Based Access Control (RBAC) middleware for Fastify.
 * Provides route-level authorization based on user roles from JWT payload.
 *
 * Validates: Requirements 14.3, 14.4
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@assessment/shared';

/** JWT payload structure expected after authentication */
export interface JwtPayload {
  sub: string;
  role: UserRole;
  employeeId: string;
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Creates a Fastify preHandler hook that restricts access to users
 * whose role is included in the allowed roles list.
 *
 * Assumes the JWT has already been verified by the auth middleware
 * and the decoded payload is available on `request.user`.
 *
 * @param roles - One or more UserRole values that are permitted access
 * @returns A Fastify preHandler hook function
 */
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as JwtPayload | undefined;

    if (!user || !user.role) {
      reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: no role found in token',
        },
      });
      return;
    }

    if (!roles.includes(user.role)) {
      reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied: requires role ${roles.join(' or ')}`,
        },
      });
      return;
    }
  };
}

/**
 * Shorthand: restricts access to Administrator role only.
 * Use for admin-only routes such as result viewing, session management, etc.
 */
export function requireAdmin() {
  return requireRole(UserRole.Administrator);
}

/**
 * Shorthand: restricts access to Candidate role only.
 * Use for candidate-only routes such as assessment taking.
 */
export function requireCandidate() {
  return requireRole(UserRole.Candidate);
}

/**
 * Shorthand: allows access to both Administrator and Candidate roles.
 * Use for shared routes accessible to any authenticated user.
 */
export function requireAny() {
  return requireRole(UserRole.Administrator, UserRole.Candidate);
}
